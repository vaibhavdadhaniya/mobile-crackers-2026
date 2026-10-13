import { Platform, ViewStyle } from 'react-native';

export const colors = {
  primary: '#F97316',
  primaryDark: '#C2410C',
  primaryDeep: '#7C2D12',
  primarySoft: '#FFF3EA',
  primaryBorder: '#FED7AA',
  bg: '#FFFFFF',
  surface: '#F8F7F5',
  card: '#FFFFFF',
  text: '#1C1917',
  muted: '#6B6560',
  faint: '#A8A29E',
  border: '#ECE7E2',
  success: '#15803D',
  successSoft: '#E8F7EE',
  danger: '#DC2626',
  dangerSoft: '#FDECEC',
  warning: '#B45309',
  warningSoft: '#FEF5E1',
  info: '#1D4ED8',
  infoSoft: '#EAF1FE',
};

export const gradient = {
  brand: ['#F97316', '#EA580C'] as const,
};

// Inter font families by weight (loaded in app/_layout.tsx).
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };

// Cross-platform soft shadow.
export function shadow(level: 1 | 2 | 3 = 1): ViewStyle {
  const s = { 1: [1, 4, 0.05, 1], 2: [4, 12, 0.08, 4], 3: [8, 24, 0.12, 10] }[level];
  return Platform.select<ViewStyle>({
    ios: { shadowColor: '#1C1917', shadowOffset: { width: 0, height: s[0] }, shadowRadius: s[1], shadowOpacity: s[2] },
    default: { elevation: s[3], shadowColor: '#1C1917' },
  })!;
}

// Space reserved at the bottom of tab screens for the floating tab bar.
export const TAB_BAR_HEIGHT = 62;
