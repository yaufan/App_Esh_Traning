import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { NumericKeypadSheet } from '@/components/ui/keypad';
import { AppText, useHaptic } from '@/components/ui/primitives';
import { Sheet } from '@/components/ui/sheet';
import { displayUnit } from '@/lib/grading';
import type { CalcItem, FillItem, MatchingItem } from '@/lib/types';
import { fonts, radius, space, type, useTheme } from '@/theme';
import { Hint, OptionCard, Slot, type MarkState, type QProps } from './shared';

/* ───────── 配合題 ───────── */

export function MatchingQ({ item, answer, onChange, review, result }: QProps<MatchingItem>) {
  const { colors } = useTheme();
  const haptic = useHaptic();
  const v = answer?.type === 'matching' ? answer.value : {};
  const [open, setOpen] = useState<string | null>(null);
  const optText = (id?: string) => item.options.find((o) => o.id === id)?.text;

  return (
    <View style={{ gap: space.md }}>
      <View style={[styles.pool, { backgroundColor: colors.surfaceAlt }]}>
        <AppText variant="caption" color={colors.inkSoft}>
          選項（可重複使用）
        </AppText>
        <View style={styles.poolRow}>
          {item.options.map((o) => (
            <View key={o.id} style={[styles.poolChip, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <AppText variant="smallStrong" mono color={colors.inkSoft}>
                {o.id}
              </AppText>
              <AppText variant="small">{o.text}</AppText>
            </View>
          ))}
        </View>
      </View>
      {item.blanks.map((b, i) => {
        const picked = v[b.id];
        let state: MarkState = 'idle';
        if (review) state = result?.parts?.[b.id] ? 'correct' : 'wrong';
        return (
          <View key={b.id} style={[styles.matchRow, { borderColor: colors.line }]}>
            <AppText variant="smallStrong" mono color={colors.inkSoft} style={{ width: 30, marginTop: 3 }}>
              ({i + 1})
            </AppText>
            <AppText variant="body" style={{ flex: 1 }}>
              {b.label}
            </AppText>
            <View style={{ width: 128, gap: 4 }}>
              <Slot
                value={picked ? `${picked}　${optText(picked) ?? ''}` : undefined}
                placeholder="選擇"
                state={state}
                minWidth={120}
                onPress={review ? undefined : () => setOpen(b.id)}
              />
              {review && state === 'wrong' && (
                <AppText variant="caption" color={colors.success}>
                  正解 {item.answer[b.id]}　{optText(item.answer[b.id])}
                </AppText>
              )}
            </View>
          </View>
        );
      })}
      <Sheet visible={open != null} onClose={() => setOpen(null)} title="選擇對應的選項">
        <View style={{ gap: space.sm }}>
          {item.options.map((o) => (
            <OptionCard
              key={o.id}
              badge={o.id}
              text={o.text}
              state={open && v[open] === o.id ? 'selected' : 'idle'}
              onPress={() => {
                haptic('light');
                if (open) onChange({ type: 'matching', value: { ...v, [open]: o.id } });
                setOpen(null);
              }}
            />
          ))}
        </View>
      </Sheet>
    </View>
  );
}

/* ───────── 填空題 ───────── */

export function FillQ({ item, answer, onChange, review, result }: QProps<FillItem>) {
  const { colors } = useTheme();
  const v = answer?.type === 'fill' ? answer.value : {};
  const [open, setOpen] = useState<string | null>(null);
  const blank = item.blanks.find((b) => b.id === open);
  const idx = (id: string) => item.blanks.findIndex((b) => b.id === id) + 1;

  // 題幹中的 {{id}} 換成可點的空格
  const parts = item.stem.split(/(\{\{[^}]+\}\})/g);
  return (
    <View style={{ gap: space.md }}>
      <Text style={[type.body, { color: colors.ink, lineHeight: 34, fontWeight: '600' }]}>
        {parts.map((p, i) => {
          const m = p.match(/^\{\{(.+)\}\}$/);
          if (!m) return <Text key={i}>{p}</Text>;
          const id = m[1];
          const val = v[id];
          const ok = result?.parts?.[id];
          const bg = review ? (ok ? colors.successSoft : colors.dangerSoft) : val ? colors.accentSoft : colors.surfaceAlt;
          const fg = review ? (ok ? colors.success : colors.danger) : colors.ink;
          return (
            <Text
              key={i}
              onPress={review ? undefined : () => setOpen(id)}
              style={[styles.inlineBlank, { backgroundColor: bg, color: fg, fontFamily: fonts.mono }]}>
              {` (${idx(id)}) ${val || '＿＿'} `}
            </Text>
          );
        })}
      </Text>
      <View style={styles.fillGrid}>
        {item.blanks.map((b) => {
          const st: MarkState = review ? (result?.parts?.[b.id] ? 'correct' : 'wrong') : 'idle';
          return (
            <View key={b.id} style={{ gap: 2 }}>
              <Slot
                label={`空格 (${idx(b.id)})${b.unit ? '・' + b.unit : ''}`}
                value={v[b.id]}
                placeholder="輸入數值"
                mono
                state={st}
                onPress={review ? undefined : () => setOpen(b.id)}
              />
              {review && st === 'wrong' && (
                <AppText variant="caption" color={colors.success}>
                  正解 {item.answer[b.id]}
                  {b.unit ? ' ' + b.unit : ''}
                </AppText>
              )}
            </View>
          );
        })}
      </View>
      <Hint icon="keypad-outline">點空格用數字鍵盤輸入，與正式考試相同</Hint>
      <NumericKeypadSheet
        visible={open != null}
        initial={open ? v[open] ?? '' : ''}
        label={open ? `空格 (${idx(open)})` : ''}
        unit={blank?.unit}
        onClose={() => setOpen(null)}
        onDone={(val) => {
          if (open) onChange({ type: 'fill', value: { ...v, [open]: val } });
          setOpen(null);
        }}
      />
    </View>
  );
}

/* ───────── 計算題 ───────── */

export function CalcQ({ item, answer, onChange, review, result }: QProps<CalcItem>) {
  const { colors } = useTheme();
  const v = answer?.type === 'calc' ? answer.value : '';
  const [open, setOpen] = useState(false);
  const state: MarkState = review ? (result?.correct ? 'correct' : 'wrong') : 'idle';
  return (
    <View style={{ gap: space.sm }}>
      <Pressable
        disabled={review}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.calcBox,
          {
            borderColor: state === 'correct' ? colors.success : state === 'wrong' ? colors.danger : v ? colors.ink : colors.inkMute,
            backgroundColor: state === 'correct' ? colors.successSoft : state === 'wrong' ? colors.dangerSoft : colors.surface,
            borderStyle: v ? 'solid' : 'dashed',
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <AppText variant="caption" color={colors.inkSoft}>
          答案
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
          <AppText variant="display" mono color={v ? colors.ink : colors.inkMute} style={{ flex: 1 }}>
            {v || '點此輸入'}
          </AppText>
          <AppText variant="bodyStrong" color={colors.inkSoft}>
            {displayUnit(item.unit)}
          </AppText>
        </View>
      </Pressable>
      {item.decimals != null && <Hint icon="calculator-outline">{`四捨五入至小數點後第 ${item.decimals} 位`}</Hint>}
      {review && !result?.correct && (
        <AppText variant="smallStrong" color={colors.success}>
          正解 {item.answer} {displayUnit(item.unit)}
        </AppText>
      )}
      <NumericKeypadSheet
        visible={open}
        initial={v}
        label="輸入計算結果"
        unit={displayUnit(item.unit)}
        onClose={() => setOpen(false)}
        onDone={(val) => {
          onChange({ type: 'calc', value: val });
          setOpen(false);
        }}
      />
    </View>
  );
}

export function StepsBlock({ steps }: { steps: string[] }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.steps, { backgroundColor: colors.surfaceAlt }]}>
      {steps.map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: space.sm }}>
          <Ionicons name="arrow-forward" size={14} color={colors.inkMute} style={{ marginTop: 5 }} />
          <AppText variant="small" style={{ flex: 1 }}>
            {s}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pool: { borderRadius: radius.md, padding: space.md, gap: space.sm },
  poolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  poolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inlineBlank: { borderRadius: 6, fontWeight: '700', overflow: 'hidden' },
  fillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  calcBox: { borderWidth: 1.5, borderRadius: radius.md, padding: space.lg, gap: 2 },
  steps: { borderRadius: radius.md, padding: space.md, gap: 6 },
});
