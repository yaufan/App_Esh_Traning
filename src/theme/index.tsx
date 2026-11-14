import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useAppStore } from '@/lib/store';
import { darkColors, lightColors, type as baseType, type ThemeColors } from './tokens';

type Theme = { colors: ThemeColors; dark: boolean };

const ThemeCtx = createContext<Theme>({ colors: lightColors, dark: false });

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const pref = useAppStore((s) => s.settings.theme);
  const dark = pref === 'system' ? system === 'dark' : pref === 'dark';
  const value = useMemo(() => ({ colors: dark ? darkColors : lightColors, dark }), [dark]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}

export const FONT_SCALES = [
  { value: 1, label: '標準' },
  { value: 1.12, label: '大' },
  { value: 1.25, label: '特大' },
] as const;

/** 使用者設定的字體倍率 */
export function useFontScale() {
  const k = useAppStore((s) => s.settings.fontScale) ?? 1;
  return FONT_SCALES.some((f) => f.value === k) ? k : 1;
}

/** 依字體倍率放大後的文字樣式；直接用 <Text> 的地方要用這個，不要用 tokens 的 type */
export function useType() {
  const k = useFontScale();
  return useMemo(() => {
    if (k === 1) return baseType;
    const out = {} as Record<keyof typeof baseType, (typeof baseType)[keyof typeof baseType]>;
    for (const key of Object.keys(baseType) as (keyof typeof baseType)[]) {
      const t = baseType[key];
      out[key] = { ...t, fontSize: Math.round(t.fontSize * k), lineHeight: Math.round(t.lineHeight * k) };
    }
    return out as typeof baseType;
  }, [k]);
}

export * from './tokens';
