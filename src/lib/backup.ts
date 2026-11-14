import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { getGroup, getItem, meta } from './bank';
import { dayKey, SRS_INTERVALS, useAppStore, type BackupData, type Session } from './store';
import type { AnswerValue, Item } from './types';

/**
 * 備份與還原：作答紀錄只存在手機裡，換手機或重灌前可以匯出成一個 JSON 檔，之後再匯入。
 * 全程不連網——匯出是交給手機的「分享」功能，由使用者自己決定檔案放哪裡。
 */

const KIND = 'esh-training-backup';
const FORMAT = 1;

type BackupFile = { kind: string; format: number; exportedAt: string; appVersion: string; bankVersion: string; data: unknown };

export function buildBackup(): string {
  const st = useAppStore.getState();
  // 只帶已交卷的紀錄；進行中的測驗不備份
  const history = st.history.filter((id) => st.sessions[id]?.submittedAt).slice(0, 100);
  const sessions: Record<string, Session> = {};
  for (const id of history) sessions[id] = st.sessions[id];
  const data: BackupData = {
    sessions,
    history,
    itemStats: st.itemStats,
    wrong: st.wrong,
    srs: st.srs,
    daily: st.daily,
    notes: st.notes,
    cardsKnown: st.cardsKnown,
    bookmarks: st.bookmarks,
    settings: st.settings,
  };
  const file: BackupFile = {
    kind: KIND,
    format: FORMAT,
    exportedAt: new Date().toISOString(),
    appVersion: Constants.expoConfig?.version ?? '',
    bankVersion: meta.bankVersion,
    data,
  };
  return JSON.stringify(file);
}

export const backupFileName = () => `esh-training-backup-${dayKey().replace(/-/g, '')}.json`;

/** 匯出備份檔。回傳給使用者看的結果說明。 */
export async function exportBackup(): Promise<string> {
  const text = buildBackup();
  const name = backupFileName();
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return `已下載 ${name}`;
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(text);
  if (!(await Sharing.isAvailableAsync())) throw new Error('這支手機不支援分享檔案');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: '儲存備份檔', UTI: 'public.json' });
  return `備份檔 ${name} 已交給你選的 APP，請確認它有存好。`;
}

/** 讓使用者挑一個備份檔，回傳內容文字；取消時回傳 null。 */
export async function pickBackupText(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = () => {
        const f = input.files?.[0];
        if (!f) return resolve(null);
        f.text().then(resolve, () => resolve(null));
      };
      input.oncancel = () => resolve(null);
      input.click();
    });
  }
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', 'application/octet-stream'] });
  if (picked.canceled || !picked.result) return null;
  return picked.result.text();
}

/* ───────── 檢查備份檔內容：只收格式正確、題庫裡還有的資料 ───────── */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

function validAnswer(item: Item, a: unknown): a is AnswerValue {
  if (!isObj(a) || a.type !== item.type) return false;
  const v = a.value;
  switch (item.type) {
    case 'truefalse':
      return v === null || typeof v === 'boolean';
    case 'single':
      return v === null || typeof v === 'string';
    case 'multi':
    case 'ordering':
      return isStrArr(v);
    case 'matching':
    case 'fill':
      return isObj(v) && Object.values(v).every((x) => typeof x === 'string');
    case 'linking':
      return isObj(v) && Object.values(v).every((row) => Array.isArray(row) && row.every((x) => x === null || typeof x === 'string'));
    case 'calc':
      return typeof v === 'string';
    case 'essay':
      return v === null || v === 'know' || v === 'unsure';
  }
}

function numMap(src: unknown, keep: (id: string) => boolean): Record<string, number> {
  const out: Record<string, number> = {};
  if (isObj(src)) for (const [k, v] of Object.entries(src)) if (keep(k) && isNum(v)) out[k] = v;
  return out;
}

export type ParsedBackup = {
  data: BackupData;
  exportedAt: string;
  summary: { stats: number; wrong: number; notes: number; bookmarks: number; sessions: number };
};

/** 解析備份檔；格式不對時丟出給使用者看的錯誤訊息。 */
export function parseBackup(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('這不是備份檔（內容無法讀取）。');
  }
  if (!isObj(raw) || raw.kind !== KIND || !isObj(raw.data)) throw new Error('這不是本 APP 的備份檔。');
  if (!isNum(raw.format) || raw.format > FORMAT) throw new Error('這個備份檔是較新版本的 APP 匯出的，請先更新 APP。');
  const d = raw.data;
  const hasItem = (id: string) => !!getItem(id);
  const hasGroup = (id: string) => !!getGroup(id);

  const itemStats: BackupData['itemStats'] = {};
  if (isObj(d.itemStats))
    for (const [id, v] of Object.entries(d.itemStats))
      if (hasItem(id) && isObj(v) && isNum(v.seen) && isNum(v.correct) && isNum(v.at))
        itemStats[id] = { seen: v.seen, correct: v.correct, last: v.last === true, at: v.at };

  const wrong = numMap(d.wrong, hasItem);
  const srs: BackupData['srs'] = {};
  if (isObj(d.srs))
    for (const [id, v] of Object.entries(d.srs))
      if (wrong[id] && isObj(v) && isNum(v.stage) && isNum(v.due))
        srs[id] = { stage: Math.max(0, Math.min(SRS_INTERVALS.length - 1, Math.floor(v.stage))), due: v.due };

  const daily: BackupData['daily'] = {};
  if (isObj(d.daily))
    for (const [k, v] of Object.entries(d.daily))
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && isObj(v) && isNum(v.n) && isNum(v.ok)) daily[k] = { n: v.n, ok: v.ok };

  const notes: BackupData['notes'] = {};
  if (isObj(d.notes))
    for (const [id, v] of Object.entries(d.notes)) if (hasItem(id) && typeof v === 'string' && v.trim()) notes[id] = v.slice(0, 2000);

  const cur = useAppStore.getState().settings;
  const settings: BackupData['settings'] = { ...cur };
  if (isObj(d.settings)) {
    const s = d.settings;
    if (s.theme === 'system' || s.theme === 'light' || s.theme === 'dark') settings.theme = s.theme;
    if (typeof s.haptics === 'boolean') settings.haptics = s.haptics;
    if (typeof s.studyMode === 'boolean') settings.studyMode = s.studyMode;
    if (isNum(s.fontScale) && s.fontScale >= 1 && s.fontScale <= 1.5) settings.fontScale = s.fontScale;
    if (typeof s.examDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.examDate)) settings.examDate = s.examDate;
    if (isNum(s.dailyGoal) && s.dailyGoal >= 1 && s.dailyGoal <= 500) settings.dailyGoal = Math.round(s.dailyGoal);
  }

  const sessions: BackupData['sessions'] = {};
  const history: string[] = [];
  if (isObj(d.sessions) && isStrArr(d.history))
    for (const id of d.history) {
      const s = d.sessions[id];
      if (!isObj(s) || s.id !== id || typeof s.title !== 'string' || !isStrArr(s.groupIds)) continue;
      if (s.mode !== 'mock' && s.mode !== 'practice' && s.mode !== 'official' && s.mode !== 'review') continue;
      if (!isNum(s.startedAt) || !isNum(s.submittedAt)) continue;
      const groupIds = s.groupIds.filter(hasGroup);
      if (!groupIds.length) continue;
      const answers: Session['answers'] = {};
      if (isObj(s.answers))
        for (const [iid, a] of Object.entries(s.answers)) {
          const f = getItem(iid);
          if (f && validAnswer(f.item, a)) answers[iid] = a;
        }
      const flags = (src: unknown) => {
        const out: Record<string, boolean> = {};
        if (isObj(src)) for (const [k, v] of Object.entries(src)) if (hasItem(k) && v === true) out[k] = true;
        return out;
      };
      sessions[id] = {
        id,
        mode: s.mode,
        title: s.title.slice(0, 80),
        groupIds,
        itemIds: isStrArr(s.itemIds) ? s.itemIds.filter(hasItem) : undefined,
        answers,
        revealed: flags(s.revealed),
        flagged: flags(s.flagged),
        index: 0,
        startedAt: s.startedAt,
        submittedAt: s.submittedAt,
        durationSec: isNum(s.durationSec) ? s.durationSec : undefined,
        score: isNum(s.score) ? s.score : undefined,
        maxScore: isNum(s.maxScore) ? s.maxScore : undefined,
      };
      history.push(id);
    }

  const data: BackupData = {
    sessions,
    history,
    itemStats,
    wrong,
    srs,
    daily,
    notes,
    cardsKnown: numMap(d.cardsKnown, hasItem),
    bookmarks: numMap(d.bookmarks, hasGroup),
    settings,
  };
  return {
    data,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    summary: {
      stats: Object.keys(itemStats).length,
      wrong: Object.keys(wrong).length,
      notes: Object.keys(notes).length,
      bookmarks: Object.keys(data.bookmarks).length,
      sessions: history.length,
    },
  };
}
