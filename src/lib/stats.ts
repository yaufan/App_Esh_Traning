import { groups, selfGroups } from './bank';
import { useAppStore, type Session } from './store';

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
