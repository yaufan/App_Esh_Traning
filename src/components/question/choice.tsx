import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, useHaptic } from '@/components/ui/primitives';
import type { MultiItem, SingleItem, TrueFalseItem } from '@/lib/types';
import { radius, space, useTheme } from '@/theme';
import { Hint, OptionCard, type MarkState, type QProps } from './shared';

export function TrueFalseQ({ item, answer, onChange, review }: QProps<TrueFalseItem>) {
  const { colors } = useTheme();
  const haptic = useHaptic();
  const v = answer?.type === 'truefalse' ? answer.value : null;
  const tiles: { val: boolean; icon: 'ellipse-outline' | 'close'; label: string }[] = [
    { val: true, icon: 'ellipse-outline', label: '正確' },
    { val: false, icon: 'close', label: '錯誤' },
  ];
  return (
    <View style={styles.tfRow}>
      {tiles.map((t) => {
        const picked = v === t.val;
        let state: MarkState = picked ? 'selected' : 'idle';
        if (review) state = item.answer === t.val ? (picked ? 'correct' : 'missed') : picked ? 'wrong' : 'idle';
        const border =
          state === 'correct' || state === 'missed' ? colors.success : state === 'wrong' ? colors.danger : picked ? colors.ink : colors.line;
        const bg = state === 'correct' ? colors.successSoft : state === 'wrong' ? colors.dangerSoft : picked ? colors.accentSoft : colors.surface;
        return (
          <Pressable
            key={String(t.val)}
            disabled={review}
            accessibilityRole="radio"
            accessibilityState={{ checked: picked }}
            onPress={() => {
              haptic('light');
              onChange({ type: 'truefalse', value: t.val });
            }}
            style={({ pressed }) => [styles.tf, { borderColor: border, backgroundColor: bg, opacity: pressed ? 0.85 : 1 }]}>
            <Ionicons name={t.icon} size={40} color={t.val ? colors.info : colors.danger} />
            <AppText variant="bodyStrong">{t.label}</AppText>
            {state === 'missed' && (
              <AppText variant="caption" color={colors.success}>
                正解
              </AppText>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export function SingleQ({ item, answer, onChange, review }: QProps<SingleItem>) {
  const haptic = useHaptic();
  const v = answer?.type === 'single' ? answer.value : null;
  return (
    <View style={{ gap: space.sm }}>
      {item.options.map((o) => {
        const picked = v === o.id;
        let state: MarkState = picked ? 'selected' : 'idle';
        if (review) state = o.id === item.answer ? (picked ? 'correct' : 'missed') : picked ? 'wrong' : 'idle';
        return (
          <OptionCard
            key={o.id}
            badge={o.id}
            text={o.text}
            state={state}
            disabled={review}
            onPress={() => {
              haptic('light');
              onChange({ type: 'single', value: o.id });
            }}
          />
        );
      })}
    </View>
  );
}

export function MultiQ({ item, answer, onChange, review }: QProps<MultiItem>) {
  const haptic = useHaptic();
  const v = answer?.type === 'multi' ? answer.value : [];
  const toggle = (id: string) => {
    haptic('light');
    const next = v.includes(id) ? v.filter((x) => x !== id) : [...v, id].sort();
    onChange({ type: 'multi', value: next });
  };
  return (
    <View style={{ gap: space.sm }}>
      <Hint icon="checkbox-outline">複選題：至少 2 個答案，全對才給分</Hint>
      {item.options.map((o) => {
        const picked = v.includes(o.id);
        const isAns = item.answer.includes(o.id);
        let state: MarkState = picked ? 'selected' : 'idle';
        if (review) state = isAns ? (picked ? 'correct' : 'missed') : picked ? 'wrong' : 'idle';
        return <OptionCard key={o.id} multi badge={o.id} text={o.text} state={state} disabled={review} onPress={() => toggle(o.id)} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tfRow: { flexDirection: 'row', gap: space.md },
  tf: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingVertical: space.xl,
    alignItems: 'center',
    gap: space.xs,
  },
});
