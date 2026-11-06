/**
 * 小型算式求值器（不使用 eval）：支援 + − × ÷ ^ ( ) √ log ln。
 * 給計算機面板使用。
 */
type Tok = { t: 'num'; v: number } | { t: 'op'; v: string } | { t: 'fn'; v: string } | { t: 'lp' } | { t: 'rp' };

const PREC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3, neg: 4 };
const RIGHT = new Set(['^', 'neg']);

function tokenize(src: string): Tok[] {
  const s = src.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, '');
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const n = Number(s.slice(i, j));
      if (!Number.isFinite(n)) throw new Error('數字格式錯誤');
      out.push({ t: 'num', v: n });
      i = j;
      continue;
    }
    if (s.startsWith('log', i)) {
      out.push({ t: 'fn', v: 'log' });
      i += 3;
    } else if (s.startsWith('ln', i)) {
      out.push({ t: 'fn', v: 'ln' });
      i += 2;
    } else if (c === '√') {
      out.push({ t: 'fn', v: 'sqrt' });
      i++;
    } else if (c === '(') {
      out.push({ t: 'lp' });
      i++;
    } else if (c === ')') {
      out.push({ t: 'rp' });
      i++;
    } else if ('+-*/^'.includes(c)) {
      out.push({ t: 'op', v: c });
      i++;
    } else throw new Error('無法辨識的符號');
  }
  return out;
}

export function evaluate(src: string): number {
  const toks = tokenize(src);
  const output: Tok[] = [];
  const stack: Tok[] = [];
  let prev: Tok | null = null;
  for (const tk of toks) {
    if (tk.t === 'num') output.push(tk);
    else if (tk.t === 'fn' || tk.t === 'lp') stack.push(tk);
    else if (tk.t === 'op') {
      let op = tk.v;
      if (op === '-' && (!prev || prev.t === 'op' || prev.t === 'lp' || prev.t === 'fn')) op = 'neg';
      else if (op === '+' && (!prev || prev.t === 'op' || prev.t === 'lp')) {
        prev = tk;
        continue;
      }
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.t === 'fn') {
          output.push(stack.pop()!);
          continue;
        }
        if (top.t !== 'op') break;
        const p1 = PREC[op];
        const p2 = PREC[top.v];
        if (p2 > p1 || (p2 === p1 && !RIGHT.has(op))) output.push(stack.pop()!);
        else break;
      }
      stack.push({ t: 'op', v: op });
    } else if (tk.t === 'rp') {
      while (stack.length && stack[stack.length - 1].t !== 'lp') output.push(stack.pop()!);
      if (!stack.length) throw new Error('括號不成對');
      stack.pop();
      if (stack.length && stack[stack.length - 1].t === 'fn') output.push(stack.pop()!);
    }
    prev = tk;
  }
  while (stack.length) {
    const t = stack.pop()!;
    if (t.t === 'lp') throw new Error('括號不成對');
    output.push(t);
  }
  const st: number[] = [];
  for (const tk of output) {
    if (tk.t === 'num') st.push(tk.v);
    else if (tk.t === 'fn') {
      const a = st.pop();
      if (a == null) throw new Error('算式不完整');
      st.push(tk.v === 'log' ? Math.log10(a) : tk.v === 'ln' ? Math.log(a) : Math.sqrt(a));
    } else if (tk.t === 'op') {
      if (tk.v === 'neg') {
        const a = st.pop();
        if (a == null) throw new Error('算式不完整');
        st.push(-a);
        continue;
      }
      const b = st.pop();
      const a = st.pop();
      if (a == null || b == null) throw new Error('算式不完整');
      st.push(tk.v === '+' ? a + b : tk.v === '-' ? a - b : tk.v === '*' ? a * b : tk.v === '/' ? a / b : Math.pow(a, b));
    }
  }
  if (st.length !== 1 || !Number.isFinite(st[0])) throw new Error('算式不完整');
  return st[0];
}

export function formatNumber(n: number) {
  if (!Number.isFinite(n)) return '錯誤';
  const r = Math.round(n * 1e10) / 1e10;
  return String(r);
}
