import { useEffect, useState } from 'react';

import { groups, selfGroups, topicsOf } from './bank';
import { dayKey, isDue, startOfDay, useAppStore, type Session } from './store';
import type { ItemType } from './types';

/** 目前時間，每分鐘更新一次（跨日後到期的錯題、今日進度會跟著更新） */
export function useNow(everyMs = 60000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

export function useOverview() {
  const itemStats = useAppStore((s) => s.itemStats);
  const wrong = useAppStore((s) => s.wrong);
  let seen = 0;
  let correctLast = 0;
  for (const st of Object.values(itemStats)) {
    seen++;
    if (st.last) correctLast++;
  }
  const byCat = ([1, 2, 3] as const).map((c) => {
    const gs = selfGroups.filter((g) => g.category === c);
    const ids = gs.flatMap((g) => g.items.map((i) => i.id));
    const done = ids.filter((id) => itemStats[id]);
    const ok = done.filter((id) => itemStats[id].last);
    return { category: c, total: ids.length, done: done.length, correct: ok.length };
  });
  const totalItems = groups.reduce((n, g) => n + g.items.length, 0);
  return {
    seen,
    totalItems,
    accuracy: seen ? correctLast / seen : 0,
    wrongCount: Object.keys(wrong).length,
    byCat,
  };
}

export function remainingSec(s: Session, now = Date.now()) {
  if (!s.durationSec) return null;
  return Math.max(0, Math.round(s.durationSec - (now - s.startedAt) / 1000));
}

export function fmtClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function fmtDate(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* ───────── 學習分析 ───────── */


export type TopicStat = {
  category: 1 | 2 | 3;
  topic: string;
  groupIds: string[];
  total: number;
  seen: number;
  correct: number;
  /** 最近一次作答的答對率；還沒練過是 null */
  accuracy: number | null;
};

export function useAnalysis() {
  const itemStats = useAppStore((s) => s.itemStats);
  const sessions = useAppStore((s) => s.sessions);
  const daily = useAppStore((s) => s.daily);

  const topics: TopicStat[] = ([1, 2, 3] as const).flatMap((c) =>
    topicsOf(c).map((t) => {
      const ids = t.groups.flatMap((g) => g.items.map((i) => i.id));
      const seen = ids.filter((id) => itemStats[id]);
      const correct = seen.filter((id) => itemStats[id].last).length;
      return {
        category: c,
        topic: t.topic,
        groupIds: t.groups.map((g) => g.id),
        total: ids.length,
        seen: seen.length,
        correct,
        accuracy: seen.length ? correct / seen.length : null,
      };
    }),
  );

  const byType: Partial<Record<ItemType, { n: number; ok: number }>> = {};
  for (const g of groups)
    for (const it of g.items) {
      const st = itemStats[it.id];
      if (!st || it.type === 'essay') continue;
      const t = (byType[it.type] ??= { n: 0, ok: 0 });
      t.n++;
      if (st.last) t.ok++;
    }

  const mocks = Object.values(sessions)
    .filter((s) => s.mode === 'mock' && s.submittedAt)
    .sort((a, b) => a.submittedAt! - b.submittedAt!)
    .slice(-12)
    .map((s) => ({ id: s.id, at: s.submittedAt!, score: s.score ?? 0 }));

  const today = startOfDay(useNow());
  const days = Array.from({ length: 14 }, (_, i) => {
    const ts = today - (13 - i) * 86400000;
    const k = dayKey(ts);
    return { key: k, ts, n: daily[k]?.n ?? 0, ok: daily[k]?.ok ?? 0 };
  });

  return { topics, byType, mocks, days };
}

/** 今天的進度：作答數、到期的錯題、連續天數、距離考試天數 */
export function useToday() {
  const daily = useAppStore((s) => s.daily);
  const wrong = useAppStore((s) => s.wrong);
  const srs = useAppStore((s) => s.srs);
  const examDate = useAppStore((s) => s.settings.examDate);
  const goal = useAppStore((s) => s.settings.dailyGoal) ?? 20;
  const itemStats = useAppStore((s) => s.itemStats);

  const now = useNow();
  const today = startOfDay(now);
  const done = daily[dayKey(now)]?.n ?? 0;
  const dueIds = Object.keys(wrong).filter((id) => isDue(srs, id, now));

  let streak = 0;
  for (let i = done > 0 ? 0 : 1; i < 400; i++) {
    if ((daily[dayKey(today - i * 86400000)]?.n ?? 0) > 0) streak++;
    else break;
  }

  let daysLeft: number | null = null;
  if (examDate) {
    const [y, m, d] = examDate.split('-').map(Number);
    const t = new Date(y, m - 1, d).getTime();
    if (Number.isFinite(t)) daysLeft = Math.round((t - today) / 86400000);
  }
  const unseen = selfGroups.reduce((n, g) => n + g.items.filter((i) => !itemStats[i.id]).length, 0);
  // 考試前把還沒練過的自編題至少做完一輪，每天要做幾題
  const suggested = daysLeft != null && daysLeft > 0 && unseen > 0 ? Math.ceil(unseen / daysLeft) : null;

  return { done, goal, dueIds, streak, daysLeft, examDate, unseen, suggested };
}
