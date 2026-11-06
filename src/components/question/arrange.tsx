import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { AppText, useHaptic } from '@/components/ui/primitives';
import type { LinkingItem, OrderingItem } from '@/lib/types';
import { radius, space, useTheme } from '@/theme';
import { Hint, type QProps } from './shared';

/* ───────── 排序題 ───────── */

export function OrderingQ({ item, answer, onChange, review, result }: QProps<OrderingItem>) {
  const { colors } = useTheme();
  const haptic = useHaptic();
  const seq = answer?.type === 'ordering' ? answer.value : [];
  const pool = item.options.filter((o) => !seq.includes(o.id));
  const text = (id: string) => item.options.find((o) => o.id === id)?.text ?? id;

  const add = (id: string) => {
    haptic('light');
    onChange({ type: 'ordering', value: [...seq, id] });
  };
  const remove = (id: string) => {
    haptic('light');
    onChange({ type: 'ordering', value: seq.filter((x) => x !== id) });
  };
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= seq.length) return;
    const next = [...seq];
    [next[i], next[j]] = [next[j], next[i]];
    haptic('light');
    onChange({ type: 'ordering', value: next });
  };

  return (
    <View style={{ gap: space.md }}>
      {item.orderHint && <Hint icon="swap-vertical">{`排序依據：${item.orderHint}（全對才給分）`}</Hint>}
      <View style={{ gap: space.sm }}>
        {item.options.map((_, i) => {
          const id = seq[i];
          const ok = review ? id === item.answer[i] : undefined;
          return (
            <View
              key={i}
              style={[
                styles.seqRow,
                {
                  borderColor: review ? (ok ? colors.success : colors.danger) : id ? colors.ink : colors.line,
                  backgroundColor: review ? (ok ? colors.successSoft : colors.dangerSoft) : id ? colors.accentSoft : colors.surface,
                  borderStyle: id ? 'solid' : 'dashed',
                },
              ]}>
              <View style={[styles.seqNo, { backgroundColor: id ? colors.hero : colors.surfaceAlt }]}>
                <AppText variant="smallStrong" mono color={id ? colors.heroInk : colors.inkMute}>
                  {i + 1}
                </AppText>
              </View>
              <AppText variant="body" color={id ? colors.ink : colors.inkMute} style={{ flex: 1 }}>
                {id ? text(id) : '點下方選項放到這裡'}
              </AppText>
              {id && !review && (
                <View style={{ flexDirection: 'row' }}>
                  <Pressable hitSlop={6} onPress={() => move(i, -1)} style={styles.mini}>
                    <Ionicons name="chevron-up" size={18} color={colors.inkSoft} />
                  </Pressable>
                  <Pressable hitSlop={6} onPress={() => move(i, 1)} style={styles.mini}>
                    <Ionicons name="chevron-down" size={18} color={colors.inkSoft} />
                  </Pressable>
                  <Pressable hitSlop={6} onPress={() => remove(id)} style={styles.mini}>
                    <Ionicons name="close" size={18} color={colors.inkSoft} />
                  </Pressable>
                </View>
              )}
              {review && !ok && (
                <AppText variant="caption" color={colors.success} style={{ maxWidth: 120 }}>
                  應為 {text(item.answer[i])}
                </AppText>
              )}
            </View>
          );
        })}
      </View>
      {!review && pool.length > 0 && (
        <View style={[styles.pool, { backgroundColor: colors.surfaceAlt }]}>
          <AppText variant="caption" color={colors.inkSoft}>
            待排序選項
          </AppText>
          {pool.map((o) => (
            <Pressable
              key={o.id}
              onPress={() => add(o.id)}
              style={({ pressed }) => [styles.poolItem, { backgroundColor: colors.surface, borderColor: colors.line, opacity: pressed ? 0.8 : 1 }]}>
              <Ionicons name="add-circle-outline" size={20} color={colors.info} />
              <AppText variant="body" style={{ flex: 1 }}>
                {o.text}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}
      {review && result && !result.correct && (
        <AppText variant="small" color={colors.inkSoft}>
          正確順序：{item.answer.map((id) => text(id)).join(' → ')}
        </AppText>
      )}
    </View>
  );
}

/* ───────── 連連看 ───────── */

const LINE_COLORS = ['#2F6FED', '#E07A1F', '#0E8C8C', '#C2410C', '#7C3AED', '#15803D', '#BE185D', '#475569'];

type Rect = { x: number; y: number; w: number; h: number };


/** 多欄連連看在手機上改為逐列選擇：每個題目下方列出各欄選項 */
function LinkingMatrix({ item, answer, onChange, review, result }: QProps<LinkingItem>) {
  const { colors } = useTheme();
  const haptic = useHaptic();
  const v = answer?.type === 'linking' ? answer.value : {};
  const colorOf = (leftId: string) => LINE_COLORS[item.left.findIndex((l) => l.id === leftId) % LINE_COLORS.length];
  const pick = (leftId: string, ci: number, oid: string) => {
    if (review) return;
    haptic('light');
    const row = [...(v[leftId] ?? item.columns.map(() => null))];
    while (row.length < item.columns.length) row.push(null);
    row[ci] = row[ci] === oid ? null : oid;
    onChange({ type: 'linking', value: { ...v, [leftId]: row } });
  };
  return (
    <View style={{ gap: space.md }}>
      <Hint icon="git-network-outline">每一列依序連到各欄的答案，整列全部正確才給分</Hint>
      {item.left.map((l) => {
        const row = v[l.id] ?? [];
        const okRow = review ? result?.parts?.[l.id] : undefined;
        const tint = colorOf(l.id);
        return (
          <View
            key={l.id}
            style={[
              styles.matrixRow,
              { borderColor: review ? (okRow ? colors.success : colors.danger) : colors.line, backgroundColor: colors.surface },
            ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <View style={[styles.dot, { backgroundColor: tint, width: 10, height: 10, borderRadius: 5 }]} />
              <AppText variant="bodyStrong" style={{ flex: 1 }}>
                {l.text}
              </AppText>
              {review && <Ionicons name={okRow ? 'checkmark-circle' : 'close-circle'} size={20} color={okRow ? colors.success : colors.danger} />}
            </View>
            {item.columns.map((c, ci) => (
              <View key={ci} style={{ gap: 6 }}>
                <AppText variant="caption" color={colors.inkSoft}>
                  {ci + 1}. {c.title}
                </AppText>
                <View style={styles.chipRow}>
                  {c.options.map((o) => {
                    const picked = row[ci] === o.id;
                    const isAns = item.answer[l.id][ci] === o.id;
                    let border = picked ? tint : colors.line;
                    let bg = picked ? tint + '22' : colors.surface;
                    if (review && isAns) {
                      border = colors.success;
                      bg = picked ? colors.successSoft : colors.surface;
                    } else if (review && picked) {
                      border = colors.danger;
                      bg = colors.dangerSoft;
                    }
                    return (
                      <Pressable
                        key={o.id}
                        disabled={review}
                        onPress={() => pick(l.id, ci, o.id)}
                        style={({ pressed }) => [styles.chip, { borderColor: border, backgroundColor: bg, opacity: pressed ? 0.8 : 1 }]}>
                        {picked && !review && <Ionicons name="link" size={14} color={tint} />}
                        <AppText variant="small" style={{ fontWeight: picked || (review && isAns) ? '700' : '400' }}>
                          {o.text}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

export function LinkingQ(props: QProps<LinkingItem>) {
  if (props.item.columns.length > 1) return <LinkingMatrix {...props} />;
  return <LinkingLines {...props} />;
}

function LinkingLines({ item, answer, onChange, review, result }: QProps<LinkingItem>) {
  const { colors } = useTheme();
  const haptic = useHaptic();
  const v = useMemo(() => (answer?.type === 'linking' ? answer.value : {}), [answer]);
  const [active, setActive] = useState<{ left: string; col: number } | null>(null);
  const [colX, setColX] = useState<Record<number, { x: number; w: number }>>({});
  const [nodeY, setNodeY] = useState<Record<string, { y: number; h: number }>>({});

  const nCols = item.columns.length + 1;
  const colorOf = (leftId: string) => LINE_COLORS[item.left.findIndex((l) => l.id === leftId) % LINE_COLORS.length];

  const rectOf = (col: number, id: string): Rect | null => {
    const c = colX[col];
    const n = nodeY[`${col}:${id}`];
    if (!c || !n) return null;
    return { x: c.x, y: n.y, w: c.w, h: n.h };
  };

  const pickLeft = (id: string) => {
    if (review) return;
    haptic('light');
    const row = v[id] ?? [];
    const firstEmpty = item.columns.findIndex((_, ci) => !row[ci]);
    setActive({ left: id, col: firstEmpty === -1 ? 0 : firstEmpty });
  };

  const pickRight = (col: number, optId: string) => {
    if (review) return;
    if (!active) {
      // 若沒選左邊，找到連到此選項的列並解除
      return;
    }
    if (active.col !== col) return;
    haptic('light');
    const row = [...(v[active.left] ?? item.columns.map(() => null))];
    while (row.length < item.columns.length) row.push(null);
    row[col] = optId;
    onChange({ type: 'linking', value: { ...v, [active.left]: row } });
    if (col + 1 < item.columns.length) setActive({ left: active.left, col: col + 1 });
    else setActive(null);
  };

  const clearRow = (id: string) => {
    haptic('light');
    const next = { ...v };
    delete next[id];
    onChange({ type: 'linking', value: next });
    setActive(null);
  };

  // 線段：左 → 欄1 → 欄2…
  const lines: { x1: number; y1: number; x2: number; y2: number; color: string; dashed?: boolean }[] = [];
  const pushLine = (a: Rect | null, b: Rect | null, color: string, dashed?: boolean) => {
    if (!a || !b) return;
    lines.push({ x1: a.x + a.w, y1: a.y + a.h / 2, x2: b.x, y2: b.y + b.h / 2, color, dashed });
  };
  for (const l of item.left) {
    const row = v[l.id] ?? [];
    const color = colorOf(l.id);
    let prev = rectOf(0, l.id);
    row.forEach((oid, ci) => {
      if (!oid) return;
      const r = rectOf(ci + 1, oid);
      const ok = review ? item.answer[l.id][ci] === oid : true;
      pushLine(prev, r, review ? (ok ? colors.success : colors.danger) : color);
      prev = r;
    });
  }

  const onColLayout = (ci: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setColX((s) => (s[ci]?.x === x && s[ci]?.w === width ? s : { ...s, [ci]: { x, w: width } }));
  };
  const onNodeLayout = (key: string) => (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    setNodeY((s) => (s[key]?.y === y && s[key]?.h === height ? s : { ...s, [key]: { y, h: height } }));
  };

  const usedBy = (ci: number, oid: string) => item.left.filter((l) => (v[l.id] ?? [])[ci] === oid).map((l) => l.id);

  return (
    <View style={{ gap: space.md }}>
      <Hint icon="git-network-outline">
        {item.columns.length > 1
          ? '先點左邊題目，再依序點每一欄的答案；每列全部連對才給分'
          : '先點左邊題目，再點右邊對應的答案'}
      </Hint>
      <View style={{ flexDirection: 'row', gap: space.xl }}>
        {/* 標題列 */}
        <View style={{ flex: 1 }} />
        {item.columns.map((c, ci) => (
          <View key={ci} style={{ flex: 1 }}>
            <AppText variant="caption" color={colors.inkSoft}>
              {c.title}
            </AppText>
          </View>
        ))}
      </View>
      <View style={{ position: 'relative' }}>
        <View style={{ flexDirection: 'row', gap: space.xl }}>
          <View style={{ flex: 1, gap: space.sm }} onLayout={onColLayout(0)}>
            {item.left.map((l) => {
              const isActive = active?.left === l.id;
              const row = v[l.id] ?? [];
              const done = item.columns.every((_, ci) => row[ci]);
              const okRow = review ? result?.parts?.[l.id] : undefined;
              return (
                <Pressable
                  key={l.id}
                  onLayout={onNodeLayout(`0:${l.id}`)}
                  onPress={() => pickLeft(l.id)}
                  onLongPress={() => !review && clearRow(l.id)}
                  style={[
                    styles.node,
                    {
                      borderColor: review ? (okRow ? colors.success : colors.danger) : isActive ? colors.ink : done ? colorOf(l.id) : colors.line,
                      backgroundColor: isActive ? colors.accentSoft : colors.surface,
                      borderWidth: isActive ? 2 : 1.5,
                    },
                  ]}>
                  <View style={[styles.dot, { backgroundColor: colorOf(l.id) }]} />
                  <AppText variant="small" style={{ flex: 1 }}>
                    {l.text}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          {item.columns.map((c, ci) => (
            <View key={ci} style={{ flex: 1, gap: space.sm }} onLayout={onColLayout(ci + 1)}>
              {c.options.map((o) => {
                const users = usedBy(ci, o.id);
                const target = active && active.col === ci;
                return (
                  <Pressable
                    key={o.id}
                    onLayout={onNodeLayout(`${ci + 1}:${o.id}`)}
                    onPress={() => pickRight(ci, o.id)}
                    style={[
                      styles.node,
                      {
                        borderColor: target ? colors.info : users.length ? colorOf(users[0]) : colors.line,
                        backgroundColor: target ? colors.surface : users.length ? colors.surface : colors.surface,
                        borderStyle: target ? 'dashed' : 'solid',
                      },
                    ]}>
                    <AppText variant="small" style={{ flex: 1 }}>
                      {o.text}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
          {lines.map((ln, i) => (
            <Line key={i} x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2} stroke={ln.color} strokeWidth={2.5} strokeLinecap="round" />
          ))}
          {lines.map((ln, i) => (
            <Circle key={`c${i}`} cx={ln.x2} cy={ln.y2} r={4} fill={ln.color} />
          ))}
        </Svg>
      </View>
      {!review && (
        <AppText variant="caption" color={colors.inkMute}>
          長按左邊題目可清除該列連線
        </AppText>
      )}
      {review && result && !result.correct && (
        <View style={{ gap: 4 }}>
          <AppText variant="caption" color={colors.inkSoft}>
            正確連線
          </AppText>
          {item.left.map((l) => (
            <AppText key={l.id} variant="small" color={result.parts?.[l.id] ? colors.inkSoft : colors.success}>
              {l.text} → {item.answer[l.id].map((oid, ci) => item.columns[ci].options.find((o) => o.id === oid)?.text).join(' → ')}
            </AppText>
          ))}
        </View>
      )}
      {nCols > 3 && <Hint>欄位較多時可將手機橫放</Hint>}
    </View>
  );
}

const styles = StyleSheet.create({
  seqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: space.sm,
    minHeight: 52,
  },
  seqNo: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  mini: { padding: 4 },
  pool: { borderRadius: radius.md, padding: space.md, gap: space.sm },
  poolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
  node: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 48,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  matrixRow: { borderWidth: 1.5, borderRadius: radius.md, padding: space.md, gap: space.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
});
