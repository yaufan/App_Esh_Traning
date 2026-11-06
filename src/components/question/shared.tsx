import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/primitives';
import type { ItemResult } from '@/lib/grading';
import type { AnswerValue, Item } from '@/lib/types';
import { radius, space, useTheme } from '@/theme';

export type QProps<T extends Item = Item> = {
  item: T;
  answer: AnswerValue | undefined;
  onChange: (a: AnswerValue) => void;
  /** review：已交卷或已看解析，鎖定作答並標示對錯 */
  review: boolean;
  result?: ItemResult;
};

export type MarkState = 'idle' | 'selected' | 'correct' | 'wrong' | 'missed';

/** 選項卡片：A/B/C 字母章＋文字 */
export function OptionCard({
  badge,
  text,
  state,
  onPress,
  multi,
  disabled,
  style,
}: {
  badge: string;
  text: string;
  state: MarkState;
  onPress?: () => void;
  multi?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const tone = {
    idle: { border: colors.line, bg: colors.surface, badgeBg: colors.surfaceAlt, badgeFg: colors.ink },
    selected: { border: colors.ink, bg: colors.accentSoft, badgeBg: colors.hero, badgeFg: colors.heroInk },
    correct: { border: colors.success, bg: colors.successSoft, badgeBg: colors.success, badgeFg: '#fff' },
    wrong: { border: colors.danger, bg: colors.dangerSoft, badgeBg: colors.danger, badgeFg: '#fff' },
    missed: { border: colors.success, bg: colors.surface, badgeBg: colors.successSoft, badgeFg: colors.success },
  }[state];
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: state === 'selected' || state === 'correct' }}
      style={({ pressed }) => [
        styles.option,
        { borderColor: tone.border, backgroundColor: tone.bg, opacity: pressed ? 0.85 : 1 },
        style,
      ]}>
      <View style={[multi ? styles.badgeSquare : styles.badge, { backgroundColor: tone.badgeBg }]}>
        <AppText variant="smallStrong" mono color={tone.badgeFg}>
          {badge}
        </AppText>
      </View>
      <AppText variant="body" style={{ flex: 1 }}>
        {text}
      </AppText>
      {state === 'correct' && <Ionicons name="checkmark-circle" size={22} color={colors.success} />}
      {state === 'wrong' && <Ionicons name="close-circle" size={22} color={colors.danger} />}
      {state === 'missed' && (
        <AppText variant="caption" color={colors.success}>
          正解
        </AppText>
      )}
    </Pressable>
  );
}

/** 可點的作答格：填空、配合題的空格 */
export function Slot({
  label,
  value,
  placeholder = '點此作答',
  onPress,
  state = 'idle',
  minWidth = 96,
  mono,
}: {
  label?: string;
  value?: string;
  placeholder?: string;
  onPress?: () => void;
  state?: MarkState;
  minWidth?: number;
  mono?: boolean;
}) {
  const { colors } = useTheme();
  const border =
    state === 'correct' ? colors.success : state === 'wrong' ? colors.danger : value ? colors.ink : colors.inkMute;
  const bg = state === 'correct' ? colors.successSoft : state === 'wrong' ? colors.dangerSoft : value ? colors.accentSoft : colors.surface;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.slot,
        { minWidth, borderColor: border, backgroundColor: bg, borderStyle: value ? 'solid' : 'dashed', opacity: pressed ? 0.8 : 1 },
      ]}>
      {label && (
        <AppText variant="caption" color={colors.inkSoft}>
          {label}
        </AppText>
      )}
      <AppText variant={value ? 'bodyStrong' : 'small'} mono={mono && !!value} color={value ? colors.ink : colors.inkMute} numberOfLines={2}>
        {value || placeholder}
      </AppText>
    </Pressable>
  );
}

export function Hint({ children, icon = 'information-circle-outline' }: { children: ReactNode; icon?: keyof typeof Ionicons.glyphMap }) {
  const { colors } = useTheme();
  return (
    <View style={styles.hint}>
      <Ionicons name={icon} size={15} color={colors.inkMute} />
      <AppText variant="small" color={colors.inkMute} style={{ flex: 1 }}>
        {children}
      </AppText>
    </View>
  );
}

export const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    minHeight: 56,
  },
  badge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  badgeSquare: { width: 30, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  slot: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: 8,
    justifyContent: 'center',
    minHeight: 44,
  },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
