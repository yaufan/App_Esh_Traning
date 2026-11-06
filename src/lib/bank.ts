import bankData from '@/data/bank.json';
import lawsData from '@/data/laws.json';
import metaData from '@/data/meta.json';

import type { Group, Item, Law, LawArticle } from './types';

export const groups = bankData as unknown as Group[];
export const laws = (lawsData as unknown as { laws: Law[] }).laws;
export const meta = metaData as {
  bankVersion: string;
  lawsRetrievedAt: string;
  lawSource: string;
  verifiedAt: string;
  counts: { groups: number; items: number; self: number; official: number };
};

const groupById = new Map<string, Group>();
const itemById = new Map<string, { item: Item; group: Group }>();
for (const g of groups) {
  groupById.set(g.id, g);
  for (const it of g.items) itemById.set(it.id, { item: it, group: g });
}
const lawByCode = new Map<string, Law>();
for (const l of laws) lawByCode.set(l.pcode, l);

export const getGroup = (id: string) => groupById.get(id);
export const getItem = (id: string) => itemById.get(id);
export const getLaw = (pcode: string) => lawByCode.get(pcode);
export function getArticle(pcode: string, no: string): { law: Law; article: LawArticle } | undefined {
  const law = lawByCode.get(pcode);
  const article = law?.articles.find((a) => a.no === no);
  return law && article ? { law, article } : undefined;
}

export const selfGroups = groups.filter((g) => g.source === 'self');
export const officialGroups = groups.filter((g) => g.source === 'official-old');

/** 主題清單：「法規名｜章節」的前半段當分類 */
export function topicsOf(category: 1 | 2 | 3) {
  const map = new Map<string, Group[]>();
  for (const g of selfGroups) {
    if (g.category !== category) continue;
    const key = g.topic.split('｜')[0].trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(g);
  }
  return [...map.entries()]
    .map(([topic, gs]) => ({ topic, groups: gs, items: gs.reduce((n, g) => n + g.items.length, 0) }))
    .sort((a, b) => b.groups.length - a.groups.length);
}

export function officialSessions() {
  const map = new Map<string, Group[]>();
  for (const g of officialGroups) {
    const k = g.session ?? '?';
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(g);
  }
  return [...map.entries()]
    .map(([session, gs]) => ({ session, groups: gs.sort((a, b) => (a.no ?? 0) - (b.no ?? 0)) }))
    .sort((a, b) => (a.session < b.session ? 1 : -1));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 全真模擬：10 個題組，依三大類題組數比例分配，優先抽還沒做過的題組。
 */
export function composeMockExam(seenItemIds: Set<string>, size = 10): string[] {
  const byCat: Record<1 | 2 | 3, Group[]> = { 1: [], 2: [], 3: [] };
  for (const g of selfGroups) byCat[g.category].push(g);
  const total = selfGroups.length || 1;
  const quota: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
  let assigned = 0;
  for (const c of [1, 2, 3] as const) {
    quota[c] = Math.min(byCat[c].length, Math.max(byCat[c].length ? 1 : 0, Math.round((byCat[c].length / total) * size)));
    assigned += quota[c];
  }
  // 補足或扣除到剛好 size
  const order = ([3, 2, 1] as const).slice();
  while (assigned < size && order.some((c) => quota[c] < byCat[c].length)) {
    for (const c of order) {
      if (assigned < size && quota[c] < byCat[c].length) {
        quota[c]++;
        assigned++;
      }
    }
  }
  while (assigned > size) {
    for (const c of order) {
      if (assigned > size && quota[c] > 1) {
        quota[c]--;
        assigned--;
      }
    }
  }
  const picked: Group[] = [];
  for (const c of [1, 2, 3] as const) {
    const fresh = shuffle(byCat[c].filter((g) => !g.items.some((it) => seenItemIds.has(it.id))));
    const seen = shuffle(byCat[c].filter((g) => g.items.some((it) => seenItemIds.has(it.id))));
    picked.push(...[...fresh, ...seen].slice(0, quota[c]));
  }
  return picked.map((g) => g.id);
}

export function shuffled<T>(arr: T[]) {
  return shuffle(arr);
}
