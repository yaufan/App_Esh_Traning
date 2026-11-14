import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getGroup } from './bank';
import { gradeItem, isAnswered } from './grading';
import type { AnswerValue, Item } from './types';

/** study：直接看答案與解析，不作答、不計分、不列入紀錄 */
export type SessionMode = 'mock' | 'practice' | 'official' | 'review' | 'study';

export type Session = {
  id: string;
  mode: SessionMode;
  title: string;
  groupIds: string[];
  /** 只出這些子題（錯題複習用），未指定則整個題組 */
  itemIds?: string[];
  answers: Record<string, AnswerValue>;
  /** 練習模式：已按「看解析」的子題 */
  revealed: Record<string, boolean>;
  flagged: Record<string, boolean>;
  index: number;
  startedAt: number;
  durationSec?: number;
  submittedAt?: number;
  score?: number;
  maxScore?: number;
};

type ItemStat = { seen: number; correct: number; last: boolean; at: number };

type Settings = {
  theme: 'system' | 'light' | 'dark';
  haptics: boolean;
  /** 題庫頁：點題組時直接看答案 */
  studyMode?: boolean;
  /** 字體大小倍率：1 標準、1.12 大、1.25 特大 */
  fontScale?: number;
  /** 考試日期 YYYY-MM-DD */
  examDate?: string;
  /** 每日目標（子題數） */
  dailyGoal?: number;
};

/** 間隔複習：答錯後依序隔 1、3、7、14 天複習，每次到期答對就進下一階，全部答對才移出錯題本 */
export const SRS_INTERVALS = [1, 3, 7, 14];
export type SrsEntry = { stage: number; due: number };
export type DayLog = { n: number; ok: number };

const DAY = 86400000;
export function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function startOfDay(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
/** 錯題是否已到複習日（舊版留下、沒有排程的錯題視為已到期） */
export function isDue(srs: Record<string, SrsEntry>, itemId: string, now = Date.now()) {
  const e = srs[itemId];
  return !e || e.due <= now;
}

type State = {
  sessions: Record<string, Session>;
  history: string[];
  itemStats: Record<string, ItemStat>;
  wrong: Record<string, number>;
  srs: Record<string, SrsEntry>;
  /** 每天作答的子題數與答對數，key 是 YYYY-MM-DD */
  daily: Record<string, DayLog>;
  /** 每個子題的筆記 */
  notes: Record<string, string>;
  /** 速記卡：標成「記得了」的卡片 */
  cardsKnown: Record<string, number>;
  bookmarks: Record<string, number>;
  settings: Settings;
  hydrated: boolean;

  startSession: (s: Omit<Session, 'id' | 'answers' | 'revealed' | 'flagged' | 'index' | 'startedAt'>) => string;
  setAnswer: (sid: string, itemId: string, a: AnswerValue) => void;
  setIndex: (sid: string, i: number) => void;
  toggleFlag: (sid: string, itemId: string) => void;
  reveal: (sid: string, item: Item) => void;
  submit: (sid: string) => void;
  discard: (sid: string) => void;
  toggleBookmark: (groupId: string) => void;
  removeWrong: (itemId: string) => void;
  setNote: (itemId: string, text: string) => void;
  setCardKnown: (itemId: string, known: boolean) => void;
  resetCards: () => void;
  importBackup: (data: BackupData) => void;
  setSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  resetProgress: () => void;
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function recordResult(state: State, item: Item, a: AnswerValue | undefined) {
  if (item.type === 'essay') {
    const v = a && a.type === 'essay' ? a.value : null;
    if (v == null) return {};
    const prev = state.itemStats[item.id] ?? { seen: 0, correct: 0, last: false, at: 0 };
    const ok = v === 'know';
    return {
      stat: { seen: prev.seen + 1, correct: prev.correct + (ok ? 1 : 0), last: ok, at: Date.now() },
      ok,
    };
  }
  const r = gradeItem(item, a);
  const prev = state.itemStats[item.id] ?? { seen: 0, correct: 0, last: false, at: 0 };
  return {
    stat: { seen: prev.seen + 1, correct: prev.correct + (r.correct ? 1 : 0), last: r.correct, at: Date.now() },
    ok: r.correct,
  };
}

export type BackupData = Pick<State, 'sessions' | 'history' | 'itemStats' | 'wrong' | 'srs' | 'daily' | 'notes' | 'cardsKnown' | 'bookmarks' | 'settings'>;

type Progress = Pick<State, 'itemStats' | 'wrong' | 'srs' | 'daily'>;

/** 把一題的作答結果記進：答對率、錯題本、間隔複習排程、每日紀錄。沒有可記錄的結果時原樣回傳。 */
function applyResult(p: Progress, item: Item, a: AnswerValue | undefined, now = Date.now()): Progress {
  const { stat, ok } = recordResult(p as State, item, a);
  if (!stat || ok == null) return p;
  const itemStats = { ...p.itemStats, [item.id]: stat };
  const wrong = { ...p.wrong };
  const srs = { ...p.srs };
  const today = startOfDay(now);
  if (!ok) {
    wrong[item.id] = now;
    srs[item.id] = { stage: 0, due: today + SRS_INTERVALS[0] * DAY };
  } else if (wrong[item.id]) {
    const cur = srs[item.id] ?? { stage: 0, due: 0 };
    if (cur.due <= now) {
      const stage = cur.stage + 1;
      if (stage >= SRS_INTERVALS.length) {
        delete wrong[item.id];
        delete srs[item.id];
      } else {
        srs[item.id] = { stage, due: today + SRS_INTERVALS[stage] * DAY };
      }
    }
    // 還沒到期就先答對：排程不變，到期日再考一次
  }
  const k = dayKey(now);
  const d = p.daily[k] ?? { n: 0, ok: 0 };
  const daily = { ...p.daily, [k]: { n: d.n + 1, ok: d.ok + (ok ? 1 : 0) } };
  const keys = Object.keys(daily);
  if (keys.length > 200) for (const old of keys.sort().slice(0, keys.length - 200)) delete daily[old];
  return { itemStats, wrong, srs, daily };
}

export function sessionItems(s: Session): { groupId: string; item: Item }[] {
  const out: { groupId: string; item: Item }[] = [];
  for (const gid of s.groupIds) {
    const g = getGroup(gid);
    if (!g) continue;
    for (const it of g.items) {
      if (!s.itemIds || s.itemIds.includes(it.id)) out.push({ groupId: gid, item: it });
    }
  }
  return out;
}

export const useAppStore = create<State>()(
  persist(
    (set, get) => ({
      sessions: {},
      history: [],
      itemStats: {},
      wrong: {},
      srs: {},
      daily: {},
      notes: {},
      cardsKnown: {},
      bookmarks: {},
      settings: { theme: 'system', haptics: true },
      hydrated: false,

      startSession: (s) => {
        const id = uid();
        const session: Session = { ...s, id, answers: {}, revealed: {}, flagged: {}, index: 0, startedAt: Date.now() };
        set((st) => ({ sessions: { ...st.sessions, [id]: session }, history: [id, ...st.history].slice(0, 200) }));
        return id;
      },

      setAnswer: (sid, itemId, a) =>
        set((st) => {
          const s = st.sessions[sid];
          if (!s || s.submittedAt) return {};
          return { sessions: { ...st.sessions, [sid]: { ...s, answers: { ...s.answers, [itemId]: a } } } };
        }),

      setIndex: (sid, i) =>
        set((st) => {
          const s = st.sessions[sid];
          if (!s) return {};
          return { sessions: { ...st.sessions, [sid]: { ...s, index: i } } };
        }),

      toggleFlag: (sid, itemId) =>
        set((st) => {
          const s = st.sessions[sid];
          if (!s) return {};
          return {
            sessions: { ...st.sessions, [sid]: { ...s, flagged: { ...s.flagged, [itemId]: !s.flagged[itemId] } } },
          };
        }),

      reveal: (sid, item) =>
        set((st) => {
          const s = st.sessions[sid];
          if (!s || s.revealed[item.id]) return {};
          return {
            sessions: { ...st.sessions, [sid]: { ...s, revealed: { ...s.revealed, [item.id]: true } } },
            ...applyResult(st, item, s.answers[item.id]),
          };
        }),

      submit: (sid) => {
        const st = get();
        const s = st.sessions[sid];
        if (!s || s.submittedAt) return;
        let prog: Progress = { itemStats: st.itemStats, wrong: st.wrong, srs: st.srs, daily: st.daily };
        let score = 0;
        let maxScore = 0;
        for (const { item } of sessionItems(s)) {
          const a = s.answers[item.id];
          if (item.type !== 'essay') {
            const r = gradeItem(item, a);
            score += r.earned;
            maxScore += r.max;
          }
          if (s.revealed[item.id]) continue; // 練習時已記錄過
          if (!isAnswered(item, a)) continue; // 沒作答的不列入紀錄與錯題本
          prog = applyResult(prog, item, a);
        }
        set({
          sessions: {
            ...st.sessions,
            [sid]: { ...s, submittedAt: Date.now(), score: Math.round(score * 100) / 100, maxScore },
          },
          ...prog,
        });
      },

      discard: (sid) =>
        set((st) => {
          const sessions = { ...st.sessions };
          delete sessions[sid];
          return { sessions, history: st.history.filter((x) => x !== sid) };
        }),

      toggleBookmark: (gid) =>
        set((st) => {
          const b = { ...st.bookmarks };
          if (b[gid]) delete b[gid];
          else b[gid] = Date.now();
          return { bookmarks: b };
        }),

      removeWrong: (itemId) =>
        set((st) => {
          const w = { ...st.wrong };
          const srs = { ...st.srs };
          delete w[itemId];
          delete srs[itemId];
          return { wrong: w, srs };
        }),

      setNote: (itemId, text) =>
        set((st) => {
          const notes = { ...st.notes };
          if (text.trim()) notes[itemId] = text.trim();
          else delete notes[itemId];
          return { notes };
        }),

      setCardKnown: (itemId, known) =>
        set((st) => {
          const c = { ...st.cardsKnown };
          if (known) c[itemId] = Date.now();
          else delete c[itemId];
          return { cardsKnown: c };
        }),

      resetCards: () => set({ cardsKnown: {} }),

      importBackup: (data) => set({ ...data }),

      setSetting: (k, v) => set((st) => ({ settings: { ...st.settings, [k]: v } })),

      // 筆記與設定保留
      resetProgress: () => set({ sessions: {}, history: [], itemStats: {}, wrong: {}, srs: {}, daily: {}, cardsKnown: {}, bookmarks: {} }),
    }),
    {
      name: 'esh-train-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hydrated: _h, ...rest }) => rest as unknown as State,
      onRehydrateStorage: () => () => {
        useAppStore.setState({ hydrated: true });
      },
    },
  ),
);
