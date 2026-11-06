import type { AnswerValue, Item } from './types';

export type ItemResult = {
  earned: number;
  max: number;
  correct: boolean;
  answered: boolean;
  /** 部分給分題型（配合、填空、連連看）各格是否正確 */
  parts?: Record<string, boolean>;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function parseNumber(s: string | undefined | null): number | null {
  if (s == null) return null;
  const t = String(s).trim().replace(/,/g, '');
  if (t === '' || t === '-' || t === '.') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** 數值比對：題目沒給容許誤差時，依答案的小數位數取半個單位 */
export function numberMatches(input: number, answer: number, tolerance?: number) {
  let tol = tolerance;
  if (tol == null) {
    const s = String(answer);
    const dec = s.includes('.') ? s.split('.')[1].length : 0;
    tol = 0.5 * Math.pow(10, -dec);
  }
  return Math.abs(input - answer) <= tol + 1e-9;
}

export function emptyAnswer(item: Item): AnswerValue {
  switch (item.type) {
    case 'truefalse':
      return { type: 'truefalse', value: null };
    case 'single':
      return { type: 'single', value: null };
    case 'multi':
      return { type: 'multi', value: [] };
    case 'matching':
      return { type: 'matching', value: {} };
    case 'fill':
      return { type: 'fill', value: {} };
    case 'ordering':
      return { type: 'ordering', value: [] };
    case 'linking':
      return { type: 'linking', value: {} };
    case 'calc':
      return { type: 'calc', value: '' };
    case 'essay':
      return { type: 'essay', value: null };
  }
}

export function isAnswered(item: Item, a: AnswerValue | undefined): boolean {
  if (!a) return false;
  switch (a.type) {
    case 'truefalse':
    case 'single':
    case 'essay':
      return a.value != null;
    case 'multi':
    case 'ordering':
      return a.value.length > 0;
    case 'matching':
    case 'fill':
      return Object.values(a.value).some((v) => v != null && v !== '');
    case 'linking':
      return Object.values(a.value).some((row) => row.some((v) => v != null));
    case 'calc':
      return a.value.trim() !== '';
  }
}

export function gradeItem(item: Item, a: AnswerValue | undefined): ItemResult {
  const max = item.points;
  const answered = isAnswered(item, a);
  const res = (ok: boolean, parts?: Record<string, boolean>): ItemResult => ({
    earned: ok ? max : 0,
    max,
    correct: ok,
    answered,
    parts,
  });
  if (!a || a.type !== item.type) return res(false);

  switch (item.type) {
    case 'truefalse':
      return res((a as { value: boolean | null }).value === item.answer);
    case 'single':
      return res((a as { value: string | null }).value === item.answer);
    case 'multi': {
      const v = new Set((a as { value: string[] }).value);
      const ok = v.size === item.answer.length && item.answer.every((x) => v.has(x));
      return res(ok);
    }
    case 'ordering': {
      const v = (a as { value: string[] }).value;
      const ok = v.length === item.answer.length && v.every((x, i) => x === item.answer[i]);
      return res(ok);
    }
    case 'matching': {
      const v = (a as { value: Record<string, string> }).value;
      const parts: Record<string, boolean> = {};
      for (const b of item.blanks) parts[b.id] = v[b.id] === item.answer[b.id];
      const n = item.blanks.length;
      const good = Object.values(parts).filter(Boolean).length;
      return { earned: round2((max * good) / n), max, correct: good === n, answered, parts };
    }
    case 'fill': {
      const v = (a as { value: Record<string, string> }).value;
      const parts: Record<string, boolean> = {};
      for (const b of item.blanks) {
        const n = parseNumber(v[b.id]);
        parts[b.id] = n != null && numberMatches(n, item.answer[b.id], item.tolerance);
      }
      const n = item.blanks.length;
      const good = Object.values(parts).filter(Boolean).length;
      return { earned: round2((max * good) / n), max, correct: good === n, answered, parts };
    }
    case 'linking': {
      const v = (a as { value: Record<string, (string | null)[]> }).value;
      const parts: Record<string, boolean> = {};
      for (const l of item.left) {
        const row = v[l.id] ?? [];
        parts[l.id] = item.answer[l.id].every((x, i) => row[i] === x);
      }
      const n = item.left.length;
      const good = Object.values(parts).filter(Boolean).length;
      return { earned: round2((max * good) / n), max, correct: good === n, answered, parts };
    }
    case 'calc': {
      const n = parseNumber((a as { value: string }).value);
      return res(n != null && numberMatches(n, item.answer, item.tolerance));
    }
    case 'essay':
      // 問答題由使用者自評，不列入電腦計分
      return { earned: 0, max: 0, correct: (a as { value: string | null }).value === 'know', answered };
  }
}

/** 正確答案的文字說明，給解析區使用 */
export function describeAnswer(item: Item): string {
  switch (item.type) {
    case 'truefalse':
      return item.answer ? '○（正確）' : '✕（錯誤）';
    case 'single':
      return item.answer;
    case 'multi':
      return item.answer.join('、');
    case 'ordering':
      return item.answer.join(' → ');
    case 'matching':
      return item.blanks.map((b, i) => `(${i + 1}) ${item.answer[b.id]}`).join('　');
    case 'fill':
      return item.blanks
        .map((b, i) => `(${i + 1}) ${item.answer[b.id]}${b.unit ? ' ' + b.unit : ''}`)
        .join('　');
    case 'linking':
      return item.left
        .map((l) => {
          const picks = item.answer[l.id].map((oid, ci) => item.columns[ci].options.find((o) => o.id === oid)?.text ?? oid);
          return `${l.text} → ${picks.join(' → ')}`;
        })
        .join('\n');
    case 'calc':
      return `${item.answer}${displayUnit(item.unit) ? ' ' + displayUnit(item.unit) : ''}`;
    case 'essay':
      return item.modelAnswer.join('\n');
  }
}

/** 「（無單位）」之類的占位字不顯示 */
export function displayUnit(u?: string) {
  if (!u || /無單位/.test(u)) return '';
  return u;
}
