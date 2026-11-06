import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getGroup } from './bank';
import { gradeItem, isAnswered } from './grading';
import type { AnswerValue, Item } from './types';

export type SessionMode = 'mock' | 'practice' | 'official' | 'review';

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

type Settings = { theme: 'system' | 'light' | 'dark'; haptics: boolean };

type State = {
  sessions: Record<string, Session>;
  history: string[];
  itemStats: Record<string, ItemStat>;
  wrong: Record<string, number>;
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
          const { stat, ok } = recordResult(st, item, s.answers[item.id]);
          const wrong = { ...st.wrong };
          if (ok === true) delete wrong[item.id];
          else if (ok === false) wrong[item.id] = Date.now();
          return {
            sessions: { ...st.sessions, [sid]: { ...s, revealed: { ...s.revealed, [item.id]: true } } },
            itemStats: stat ? { ...st.itemStats, [item.id]: stat } : st.itemStats,
            wrong,
          };
        }),

      submit: (sid) => {
        const st = get();
        const s = st.sessions[sid];
        if (!s || s.submittedAt) return;
        const itemStats = { ...st.itemStats };
        const wrong = { ...st.wrong };
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
          const { stat, ok } = recordResult({ ...st, itemStats }, item, a);
          if (stat) itemStats[item.id] = stat;
          if (ok === true) delete wrong[item.id];
          else if (ok === false) wrong[item.id] = Date.now();
        }
        set({
          sessions: {
            ...st.sessions,
            [sid]: { ...s, submittedAt: Date.now(), score: Math.round(score * 100) / 100, maxScore },
          },
          itemStats,
          wrong,
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
          delete w[itemId];
          return { wrong: w };
        }),

      setSetting: (k, v) => set((st) => ({ settings: { ...st.settings, [k]: v } })),

      resetProgress: () => set({ sessions: {}, history: [], itemStats: {}, wrong: {}, bookmarks: {} }),
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
