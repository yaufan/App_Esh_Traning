import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { askReminderPermission, DEFAULT_REMINDER_TIME, fmtTime, parseTime, reminderSupported } from '@/lib/reminder';
import { useAppStore } from '@/lib/store';
import { radius, space, useTheme } from '@/theme';
import { AppText } from './primitives';

/** 設定頁：每日複習提醒開關與時間 */
export function ReminderSetting() {
  const { colors } = useTheme();
  const on = useAppStore((s) => !!s.settings.reminderOn);
  const time = useAppStore((s) => s.settings.reminderTime) ?? DEFAULT_REMINDER_TIME;
  const setSetting = useAppStore((s) => s.setSetting);
  const [msg, setMsg] = useState<string | null>(null);
  const { h, m } = parseTime(time);

  if (!reminderSupported) {
    return (
      <View style={{ gap: 4 }}>
        <AppText variant="body">每日複習提醒</AppText>
        <AppText variant="caption" color={colors.inkSoft}>
          手機版 APP 才有通知提醒。
        </AppText>
      </View>
    );
  }

  const toggle = async () => {
    if (on) {
      setSetting('reminderOn', false);
      setMsg(null);
      return;
    }
    const ok = await askReminderPermission();
    if (ok) {
      setSetting('reminderOn', true);
      if (!useAppStore.getState().settings.reminderTime) setSetting('reminderTime', DEFAULT_REMINDER_TIME);
      setMsg(null);
    } else {
      setMsg('手機沒有允許這個 APP 發通知。請到手機的「設定 → 應用程式 → 通知」打開後再試一次。');
    }
  };
  const shift = (dh: number, dm: number) => {
    let total = (h * 60 + m + dh * 60 + dm + 1440) % 1440;
    total = Math.round(total / 15) * 15;
    setSetting('reminderTime', fmtTime(Math.floor(total / 60) % 24, total % 60));
  };
  const btn = (label: string, icon: 'remove' | 'add', onPress: () => void) => (
    <Pressable accessibilityLabel={label} hitSlop={6} onPress={onPress} style={({ pressed }) => [styles.step, { backgroundColor: pressed ? colors.accentSoft : colors.surfaceAlt }]}>
      <Ionicons name={icon} size={18} color={colors.ink} />
    </Pressable>
  );

  return (
    <View style={{ gap: space.sm }}>
      <Pressable onPress={toggle} style={{ flexDirection: 'row', alignItems: 'center' }} accessibilityRole="switch" accessibilityState={{ checked: on }}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="body">每日複習提醒</AppText>
          <AppText variant="caption" color={colors.inkSoft}>
            每天在設定的時間通知當天到期的錯題數。只用手機本機通知，不連網。
          </AppText>
        </View>
        <Ionicons name={on ? 'toggle' : 'toggle-outline'} size={36} color={on ? colors.success : colors.inkMute} />
      </Pressable>
      {on && (
        <View style={[styles.timeRow, { backgroundColor: colors.surfaceAlt }]}>
          <AppText variant="smallStrong" style={{ flex: 1 }}>
            提醒時間
          </AppText>
          {btn('提早一小時', 'remove', () => shift(-1, 0))}
          <AppText variant="title" mono style={{ minWidth: 92, textAlign: 'center' }}>
            {fmtTime(h, m)}
          </AppText>
          {btn('延後一小時', 'add', () => shift(1, 0))}
          <Pressable onPress={() => shift(0, 15)} accessibilityLabel="延後十五分鐘" hitSlop={6} style={({ pressed }) => [styles.min, { backgroundColor: pressed ? colors.accentSoft : colors.surface, borderColor: colors.line }]}>
            <AppText variant="caption">+15 分</AppText>
          </Pressable>
        </View>
      )}
      {msg && (
        <AppText variant="small" color={colors.danger}>
          {msg}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  step: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radius.md, padding: space.sm, paddingLeft: space.md },
  min: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 6 },
});
