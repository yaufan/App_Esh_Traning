import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radius, space, useTheme } from '@/theme';
import { AppText, Button, useHaptic } from './primitives';
import { Sheet } from './sheet';

/**
 * 仿官方術科電腦化測試的數字鍵盤：只能輸入數字、小數點、負號。
 */
export function NumericKeypadSheet({
  visible,
  initial,
  label,
  unit,
  onClose,
  onDone,
}: {
  visible: boolean;
  initial: string;
  label: string;
  unit?: string;
  onClose: () => void;
  onDone: (v: string) => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={label}>
      {visible && <KeypadBody initial={initial} unit={unit} onDone={onDone} />}
    </Sheet>
  );
}

function KeypadBody({ initial, unit, onDone }: { initial: string; unit?: string; onDone: (v: string) => void }) {
  const { colors } = useTheme();
  const haptic = useHaptic();
  const [v, setV] = useState(initial);

  const press = (k: string) => {
    haptic('light');
    setV((cur) => {
      if (k === 'del') return cur.slice(0, -1);
      if (k === 'clr') return '';
      if (k === '±') return cur.startsWith('-') ? cur.slice(1) : '-' + cur;
      if (k === '.') return cur.includes('.') ? cur : (cur === '' || cur === '-' ? cur + '0' : cur) + '.';
      if (cur.replace(/[-.]/g, '').length >= 12) return cur;
      if (cur === '0') return k;
      if (cur === '-0') return '-' + k;
      return cur + k;
    });
  };

  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '±', '0', '.'];
  return (
    <>
      <View style={[styles.display, { backgroundColor: colors.surfaceAlt, borderColor: colors.line }]}>
        <AppText variant="display" mono style={{ flex: 1, textAlign: 'right' }} numberOfLines={1}>
          {v === '' ? ' ' : v}
        </AppText>
        {unit && (
          <AppText variant="bodyStrong" color={colors.inkSoft}>
            {unit}
          </AppText>
        )}
      </View>
      <View style={styles.row}>
        <View style={styles.grid}>
          {keys.map((k) => (
            <Pressable
              key={k}
              onPress={() => press(k)}
              style={({ pressed }) => [
                styles.key,
                { backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderColor: colors.line },
              ]}>
              <AppText variant="title" mono>
                {k}
              </AppText>
            </Pressable>
          ))}
        </View>
        <View style={styles.side}>
          <Pressable
            onPress={() => press('del')}
            style={({ pressed }) => [styles.sideKey, { backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderColor: colors.line }]}>
            <Ionicons name="backspace-outline" size={24} color={colors.ink} />
          </Pressable>
          <Pressable
            onPress={() => press('clr')}
            style={({ pressed }) => [styles.sideKey, { backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderColor: colors.line }]}>
            <AppText variant="bodyStrong">清除</AppText>
          </Pressable>
        </View>
      </View>
      <Button
        title="確定"
        variant="accent"
        icon="checkmark"
        onPress={() => {
          onDone(v === '-' ? '' : v.replace(/\.$/, ''));
        }}
        style={{ marginTop: space.md }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  display: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    marginBottom: space.md,
  },
  row: { flexDirection: 'row', gap: space.sm },
  grid: { flex: 3, flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  key: {
    width: '30%',
    flexGrow: 1,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  side: { flex: 1, gap: space.sm },
  sideKey: { flex: 1, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
