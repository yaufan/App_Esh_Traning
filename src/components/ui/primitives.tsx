import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useId, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { useAppStore } from '@/lib/store';
import { fonts, MAX_WIDTH, radius, space, type, useTheme } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Variant = keyof typeof type;

export function AppText({
  variant = 'body',
  color,
  mono,
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: string; mono?: boolean }) {
  const { colors } = useTheme();
  const base = type[variant];
  return (
    <Text
      {...rest}
      style={[
        base,
        { color: color ?? colors.ink },
        mono && { fontFamily: base.fontWeight === '800' ? fonts.monoBold : fonts.mono, fontWeight: undefined },
        style,
      ]}
    />
  );
}

export function useHaptic() {
  const on = useAppStore((s) => s.settings.haptics);
  return (kind: 'light' | 'success' | 'warning' = 'light') => {
    if (!on || Platform.OS === 'web') return;
    if (kind === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    else
      Haptics.notificationAsync(
        kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
      ).catch(() => {});
  };
}

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  contentStyle,
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
}) {
  const { colors } = useTheme();
  const inner = (
    <View style={[styles.inner, contentStyle]}>{children}</View>
  );
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.bg }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: space.xxxl + 40, alignItems: 'center' }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {inner}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, alignItems: 'center' }}>{inner}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
  onPress,
  tone = 'surface',
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: 'surface' | 'alt' | 'hero' | 'accent';
  padded?: boolean;
}) {
  const { colors, dark } = useTheme();
  const bg =
    tone === 'hero' ? colors.hero : tone === 'alt' ? colors.surfaceAlt : tone === 'accent' ? colors.accentSoft : colors.surface;
  const body = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: bg,
          borderColor: tone === 'surface' ? colors.line : 'transparent',
          shadowOpacity: tone === 'surface' && !dark ? 0.06 : 0,
        },
        padded && { padding: space.lg },
        style,
      ]}>
      {children}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>
      {body}
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
  compact,
  iconRight,
}: {
  iconRight?: boolean;
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'accent' | 'ghost' | 'outline' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const haptic = useHaptic();
  const map = {
    primary: { bg: colors.hero, fg: colors.heroInk, border: colors.hero },
    accent: { bg: colors.accent, fg: colors.accentInk, border: colors.accent },
    ghost: { bg: 'transparent', fg: colors.ink, border: 'transparent' },
    outline: { bg: colors.surface, fg: colors.ink, border: colors.line },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => {
        haptic('light');
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: map.bg, borderColor: map.border, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={map.fg} />
      ) : (
        <>
          {icon && !iconRight && <Ionicons name={icon} size={compact ? 16 : 19} color={map.fg} />}
          <AppText variant={compact ? 'smallStrong' : 'bodyStrong'} color={map.fg}>
            {title}
          </AppText>
          {icon && iconRight && <Ionicons name={icon} size={compact ? 16 : 19} color={map.fg} />}
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  color,
  size = 22,
  style,
}: {
  icon: IconName;
  onPress?: () => void;
  label: string;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [styles.iconBtn, { backgroundColor: pressed ? colors.surfaceAlt : 'transparent' }, style]}>
      <Ionicons name={icon} size={size} color={color ?? colors.ink} />
    </Pressable>
  );
}

export function Tag({
  label,
  color,
  bg,
  icon,
  style,
}: {
  label: string;
  color?: string;
  bg?: string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: bg ?? colors.surfaceAlt }, style]}>
      {icon && <Ionicons name={icon} size={12} color={color ?? colors.inkSoft} />}
      <AppText variant="caption" color={color ?? colors.inkSoft}>
        {label}
      </AppText>
    </View>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionTitle}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: colors.accent }} />
        <AppText variant="heading">{title}</AppText>
      </View>
      {action && (
        <Pressable onPress={onAction} hitSlop={8}>
          <AppText variant="smallStrong" color={colors.info}>
            {action}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

/** 工安黃黑斜紋，用在重點區塊的邊條 */
export function HazardStripe({ height = 8, style, opacity = 1 }: { height?: number; style?: StyleProp<ViewStyle>; opacity?: number }) {
  const { colors } = useTheme();
  const pid = 'hz' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View style={[{ height, width: '100%', overflow: 'hidden', opacity }, style]}>
      <Svg width="100%" height={height}>
        <Defs>
          <Pattern id={pid} patternUnits="userSpaceOnUse" width={16} height={16} patternTransform="rotate(45)">
            <Rect x={0} y={0} width={8} height={16} fill={colors.accent} />
            <Rect x={8} y={0} width={8} height={16} fill="#14213D" />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height={height} fill={`url(#${pid})`} />
      </Svg>
    </View>
  );
}

export function ProgressBar({ value, color, track, height = 8 }: { value: number; color?: string; track?: string; height?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track ?? colors.surfaceAlt, overflow: 'hidden' }}>
      <View
        style={{
          width: `${Math.max(0, Math.min(1, value)) * 100}%`,
          height: '100%',
          borderRadius: height,
          backgroundColor: color ?? colors.accent,
        }}
      />
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.line }, style]} />;
}

export function EmptyState({ icon, title, body }: { icon: IconName; title: string; body?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: space.xxxl, gap: space.sm }}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}>
        <Ionicons name={icon} size={30} color={colors.ink} />
      </View>
      <AppText variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      {body && (
        <AppText variant="small" color={colors.inkSoft} style={{ textAlign: 'center', maxWidth: 300 }}>
          {body}
        </AppText>
      )}
    </View>
  );
}

export const textStyles = StyleSheet.create({
  center: { textAlign: 'center' } as TextStyle,
});

const styles = StyleSheet.create({
  inner: { width: '100%', maxWidth: MAX_WIDTH, paddingHorizontal: space.lg, gap: space.lg },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#14213D',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 0,
  },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonCompact: { minHeight: 40, paddingHorizontal: space.md, borderRadius: radius.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.sm },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});

export type { PressableProps };
