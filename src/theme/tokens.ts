import { Platform } from 'react-native';

/**
 * 視覺語言：工地安全標示。深藏青（法規的嚴謹）＋安全黃（警示、重點），
 * 背景用暖白紙色，像一份印好的講義。分數、計時、條號用等寬數字。
 */
export const palette = {
  navy900: '#0F1B33',
  navy800: '#14213D',
  navy700: '#1D2F55',
  navy600: '#2A4170',
  navy100: '#E4E9F3',
  yellow500: '#F2B705',
  yellow400: '#F6C93A',
  yellow100: '#FFF4CC',
  paper: '#F5F2EA',
  paperDeep: '#ECE7DB',
  white: '#FFFFFF',
  ink: '#14213D',
  inkSoft: '#56607A',
  inkMute: '#8A91A5',
  line: '#E2DCCD',
  green600: '#1F8A5B',
  green100: '#DDF3E8',
  red600: '#D14343',
  red100: '#FBE3E1',
  blue600: '#2F6FED',
  teal600: '#0E8C8C',
  orange600: '#E07A1F',
};

export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  ink: string;
  inkSoft: string;
  inkMute: string;
  line: string;
  accent: string;
  accentInk: string;
  accentSoft: string;
  hero: string;
  heroInk: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  cat1: string;
  cat2: string;
  cat3: string;
  overlay: string;
};

export const lightColors: ThemeColors = {
  bg: palette.paper,
  surface: palette.white,
  surfaceAlt: palette.paperDeep,
  ink: palette.ink,
  inkSoft: palette.inkSoft,
  inkMute: palette.inkMute,
  line: palette.line,
  accent: palette.yellow500,
  accentInk: '#2E2400',
  accentSoft: palette.yellow100,
  hero: palette.navy800,
  heroInk: '#F5F2EA',
  success: palette.green600,
  successSoft: palette.green100,
  danger: palette.red600,
  dangerSoft: palette.red100,
  info: palette.blue600,
  cat1: palette.navy600,
  cat2: palette.teal600,
  cat3: palette.orange600,
  overlay: 'rgba(15,27,51,0.45)',
};

export const darkColors: ThemeColors = {
  bg: '#0B1324',
  surface: '#14203A',
  surfaceAlt: '#1A2846',
  ink: '#EEF1F7',
  inkSoft: '#B4BDD3',
  inkMute: '#7E89A6',
  line: '#26375C',
  accent: palette.yellow400,
  accentInk: '#2E2400',
  accentSoft: '#3A3210',
  hero: '#1A2846',
  heroInk: '#F5F2EA',
  success: '#3DBE85',
  successSoft: '#123A2A',
  danger: '#F06A6A',
  dangerSoft: '#3D1C22',
  info: '#6F9BFF',
  cat1: '#7E9BE0',
  cat2: '#3CC2C2',
  cat3: '#F39A4A',
  overlay: 'rgba(0,0,0,0.55)',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };

export const fonts = {
  mono: 'JetBrainsMono_600SemiBold',
  monoBold: 'JetBrainsMono_800ExtraBold',
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: undefined }),
};

export const type = {
  display: { fontSize: 30, lineHeight: 38, fontWeight: '800' as const, letterSpacing: 0.2 },
  title: { fontSize: 22, lineHeight: 30, fontWeight: '800' as const },
  heading: { fontSize: 18, lineHeight: 26, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 26, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 26, fontWeight: '700' as const },
  small: { fontSize: 14, lineHeight: 21, fontWeight: '400' as const },
  smallStrong: { fontSize: 14, lineHeight: 21, fontWeight: '700' as const },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '600' as const, letterSpacing: 0.4 },
};

export const MAX_WIDTH = 720;

export const categoryMeta: Record<1 | 2 | 3, { name: string; short: string; key: 'cat1' | 'cat2' | 'cat3' }> = {
  1: { name: '職業安全衛生相關法規', short: '法規', key: 'cat1' },
  2: { name: '職業安全衛生計畫及管理', short: '計畫及管理', key: 'cat2' },
  3: { name: '專業課程', short: '專業課程', key: 'cat3' },
};
