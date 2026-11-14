import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { dayKey, useAppStore } from '@/lib/store';
import { radius, space, useTheme } from '@/theme';
import { AppText, Button, useHaptic } from './primitives';
import { Sheet } from './sheet';

const GOALS = [10, 20, 30, 50];
const daysIn = (y: number, m: number) => new Date(y, m, 0).getDate();

function Stepper({ label, value, onStep }: { label: string; value: string; onStep: (d: 1 | -1) => void }) {
  const { colors } = useTheme();
  const haptic = useHaptic();
  const btn = (d: 1 | -1) => (
    <Pressable
      accessibilityLabel={`${label}${d > 0 ? '加一' : '減一'}`}
      hitSlop={6}
      onPress={() => {
        haptic('light');
        onStep(d);
      }}
      style={({ pressed }) => [styles.stepBtn, { backgroundColor: pressed ? colors.accentSoft : colors.surfaceAlt }]}>
      <Ionicons name={d > 0 ? 'chevron-up' : 'chevron-down'} size={20} color={colors.ink} />
    </Pressable>
  );
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <AppText variant="caption" color={colors.inkSoft}>
        {label}
      </AppText>
      {btn(1)}
      <AppText variant="title" mono>
        {value}
      </AppText>
      {btn(-1)}
    </View>
  );
}

function Body({ onClose, suggested }: { onClose: () => void; suggested: number | null }) {
  const { colors } = useTheme();
  const settings = useAppStore((s) => s.settings);
  const setSetting = useAppStore((s) => s.setSetting);
  const init = () => {
    if (settings.examDate) {
      const [y, m, d] = settings.examDate.split('-').map(Number);
      if (y && m && d) return { y, m, d };
    }
    const t = new Date(Date.now() + 60 * 86400000);
    return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() };
  };
  const [date, setDate] = useState(init);
  const [goal, setGoal] = useState(settings.dailyGoal ?? 20);
  const thisYear = new Date().getFullYear();

  const step = (k: 'y' | 'm' | 'd', dlt: 1 | -1) =>
    setDate((cur) => {
      let { y, m, d } = cur;
      if (k === 'y') y = Math.max(thisYear, Math.min(thisYear + 3, y + dlt));
      if (k === 'm') m = ((m - 1 + dlt + 12) % 12) + 1;
      const max = daysIn(y, m);
      if (k === 'd') d = ((d - 1 + dlt + max) % max) + 1;
      return { y, m, d: Math.min(d, max) };
    });

  const key = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  const past = key < dayKey();

  return (
    <View style={{ gap: space.lg }}>
      <View style={{ gap: space.sm }}>
        <AppText variant="smallStrong">考試日期</AppText>
        <View style={[styles.dateBox, { borderColor: colors.line }]}>
          <Stepper label="年" value={String(date.y)} onStep={(d) => step('y', d)} />
          <Stepper label="月" value={String(date.m).padStart(2, '0')} onStep={(d) => step('m', d)} />
          <Stepper label="日" value={String(date.d).padStart(2, '0')} onStep={(d) => step('d', d)} />
        </View>
        {past && (
          <AppText variant="caption" color={colors.danger}>
            這個日期已經過了。
          </AppText>
        )}
        <AppText variant="caption" color={colors.inkMute}>
          考試日期請以技能檢定中心公告和你的准考證為準，這裡只用來倒數。
        </AppText>
      </View>

      <View style={{ gap: space.sm }}>
        <AppText variant="smallStrong">每天目標（作答的子題數）</AppText>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {GOALS.map((g) => (
            <Pressable
              key={g}
              onPress={() => setGoal(g)}
              accessibilityRole="radio"
              accessibilityState={{ checked: goal === g }}
              style={[styles.goal, { borderColor: goal === g ? colors.ink : colors.line, backgroundColor: goal === g ? colors.accentSoft : colors.surface }]}>
              <AppText variant="bodyStrong" mono>
                {g}
              </AppText>
              <AppText variant="caption" color={colors.inkSoft}>
                題
              </AppText>
            </Pressable>
          ))}
        </View>
        {suggested != null && (
          <AppText variant="caption" color={colors.inkSoft}>
            依目前設定的考試日期，要在考前把還沒練過的題目做完一輪，每天至少要 {suggested} 題。
          </AppText>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {settings.examDate ? (
          <Button
            title="清除日期"
            variant="ghost"
            onPress={() => {
              setSetting('examDate', undefined);
              setSetting('dailyGoal', goal);
              onClose();
            }}
          />
        ) : null}
        <Button
          title="儲存"
          variant="accent"
          style={{ flex: 1 }}
          disabled={past}
          onPress={() => {
            setSetting('examDate', key);
            setSetting('dailyGoal', goal);
            onClose();
          }}
        />
      </View>
    </View>
  );
}

/** 讀書計畫：考試日期與每天目標 */
export function PlanSheet({ visible, onClose, suggested }: { visible: boolean; onClose: () => void; suggested: number | null }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="讀書計畫">
      {visible && <Body onClose={onClose} suggested={suggested} />}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  dateBox: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, paddingVertical: space.md },
  stepBtn: { width: 56, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  goal: { flex: 1, borderWidth: 1.5, borderRadius: radius.md, paddingVertical: space.sm, alignItems: 'center' },
});
