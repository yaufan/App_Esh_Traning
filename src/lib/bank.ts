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

/* ───────── 法條反查：哪一條被哪些子題引用 ───────── */

export type ItemRef = { item: Item; group: Group };
const citedIndex = new Map<string, ItemRef[]>();
for (const g of groups)
  for (const it of g.items) {
    const seen = new Set<string>();
    for (const c of it.citations) {
      const k = `${c.pcode}#${c.article}`;
      if (seen.has(k)) continue;
      seen.add(k);
      if (!citedIndex.has(k)) citedIndex.set(k, []);
      citedIndex.get(k)!.push({ item: it, group: g });
    }
  }
export const citedBy = (pcode: string, article: string): ItemRef[] => citedIndex.get(`${pcode}#${article}`) ?? [];

/* ───────── 題目搜尋 ───────── */

/** 題幹裡的填空記號換成底線，給列表與搜尋結果顯示 */
export const plainStem = (stem: string) => stem.replace(/\{\{[^}]+\}\}/g, '＿＿');

function itemText(it: Item): string {
  const parts = [plainStem(it.stem), it.explanation];
  if ('options' in it) parts.push(...it.options.map((o) => o.text));
  if (it.type === 'matching') parts.push(...it.blanks.map((b) => b.label));
  if (it.type === 'linking') parts.push(...it.left.map((l) => l.text), ...it.columns.flatMap((c) => c.options.map((o) => o.text)));
  if (it.type === 'essay') parts.push(...it.modelAnswer);
  return parts.join('\n');
}

let searchIndex: { group: Group; head: string; items: { item: Item; text: string }[] }[] | null = null;

export type SearchHit = { group: Group; snippet: string; where: string };

/** 關鍵字搜尋題組：比對標題、主題、情境、題幹、選項、解析。多個關鍵字以空白分隔，全部都要出現。 */
export function searchGroups(query: string, limit = 40): SearchHit[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  searchIndex ??= groups.map((g) => ({
    group: g,
    head: [g.title, g.topic, g.context ?? '', g.session ?? ''].join('\n').toLowerCase(),
    items: g.items.map((it) => ({ item: it, text: itemText(it).toLowerCase() })),
  }));
  const hits: (SearchHit & { rank: number })[] = [];
  for (const e of searchIndex) {
    const all = e.head + '\n' + e.items.map((i) => i.text).join('\n');
    if (!words.every((w) => all.includes(w))) continue;
    const inHead = words.every((w) => e.head.includes(w));
    const first = words[0];
    let snippet = '';
    let where = '標題或主題';
    if (!inHead || !e.group.title.toLowerCase().includes(first)) {
      const hit = e.items.find((i) => i.text.includes(first));
      if (hit) {
        const raw = itemText(hit.item);
        const at = raw.toLowerCase().indexOf(first);
        const from = Math.max(0, at - 18);
        snippet = (from > 0 ? '…' : '') + raw.slice(from, at + first.length + 40).replace(/\n/g, ' ') + '…';
        where = '題目內容';
      }
    }
    hits.push({ group: e.group, snippet, where, rank: inHead ? 0 : 1 });
  }
  return hits.sort((a, b) => a.rank - b.rank).slice(0, limit);
}

/* ───────── 數字速記卡：由審過的填空題直接產生，不另外編內容 ───────── */

export type FillCard = { item: Extract<Item, { type: 'fill' }>; group: Group };
export const fillCards: FillCard[] = selfGroups.flatMap((g) =>
  g.items.filter((it): it is Extract<Item, { type: 'fill' }> => it.type === 'fill').map((item) => ({ item, group: g })),
);
