import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { evaluate, formatNumber } from '@/lib/calc';
import { radius, space, useTheme } from '@/theme';
import { AppText, useHaptic } from './primitives';
import { Sheet } from './sheet';

const KEYS: { k: string; kind?: 'op' | 'fn' | 'eq' | 'clr' }[][] = [
  [{ k: 'C', kind: 'clr' }, { k: '(', kind: 'op' }, { k: ')', kind: 'op' }, { k: '⌫', kind: 'clr' }],
  [{ k: 'log', kind: 'fn' }, { k: '√', kind: 'fn' }, { k: '^', kind: 'op' }, { k: '÷', kind: 'op' }],
  [{ k: '7' }, { k: '8' }, { k: '9' }, { k: '×', kind: 'op' }],
  [{ k: '4' }, { k: '5' }, { k: '6' }, { k: '−', kind: 'op' }],
  [{ k: '1' }, { k: '2' }, { k: '3' }, { k: '+', kind: 'op' }],
  [{ k: '0' }, { k: '.' }, { k: 'ln', kind: 'fn' }, { k: '=', kind: 'eq' }],
];

/** 作答時可叫出的計算機（官方電腦化測試也提供計算機） */
export function CalculatorSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const haptic = useHaptic();
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState<string>('');
  const [tape, setTape] = useState<string[]>([]);

  const press = (k: string) => {
    haptic('light');
    if (k === 'C') return (setExpr(''), setResult(''));
    if (k === '⌫') return setExpr((e) => e.replace(/(log|ln)$|.$/, ''));
    if (k === '=') {
      try {
        const v = formatNumber(evaluate(expr));
        setResult(v);
        setTape((t) => [`${expr} = ${v}`, ...t].slice(0, 6));
        setExpr(v);
      } catch (e) {
        setResult((e as Error).message);
      }
      return;
    }
    if (k === 'log' || k === 'ln' || k === '√') return setExpr((e) => e + k + '(');
    setExpr((e) => e + k);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="計算機">
      <View style={[styles.display, { backgroundColor: colors.hero }]}>
        {tape.slice(0, 2).map((t, i) => (
          <AppText key={i} variant="small" mono color={colors.inkMute} numberOfLines={1} style={{ textAlign: 'right' }}>
            {t}
          </AppText>
        ))}
        <AppText variant="title" mono color={colors.heroInk} numberOfLines={2} style={{ textAlign: 'right' }}>
          {expr || '0'}
        </AppText>
        {!!result && result !== expr && (
          <AppText variant="smallStrong" color={colors.accent} style={{ textAlign: 'right' }}>
            {result}
          </AppText>
        )}
      </View>
      <View style={{ gap: space.sm }}>
        {KEYS.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: space.sm }}>
            {row.map(({ k, kind }) => {
              const bg =
                kind === 'eq' ? colors.accent : kind === 'op' || kind === 'fn' ? colors.surfaceAlt : kind === 'clr' ? colors.dangerSoft : colors.surface;
              const fg = kind === 'eq' ? colors.accentInk : kind === 'clr' ? colors.danger : colors.ink;
              return (
                <Pressable
                  key={k}
                  onPress={() => press(k)}
                  style={({ pressed }) => [styles.key, { backgroundColor: bg, borderColor: colors.line, opacity: pressed ? 0.7 : 1 }]}>
                  <AppText variant="heading" mono color={fg}>
                    {k}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  display: { borderRadius: radius.md, padding: space.lg, marginBottom: space.md, minHeight: 96, justifyContent: 'flex-end' },
  key: { flex: 1, height: 52, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
