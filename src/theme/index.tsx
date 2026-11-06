import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useAppStore } from '@/lib/store';
import { darkColors, lightColors, type ThemeColors } from './tokens';

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

export * from './tokens';
