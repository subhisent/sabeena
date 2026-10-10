export const colors = {
  background: '#F7F8FA',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#EEF0F3',
  borderDark: '#CBD5E1',
  black: '#000000',
  white: '#FFFFFF',
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  purple: '#7C3AED',
  purpleLight: '#F5F3FF',
  segmentBackground: '#F1F5F9',
  inputBackground: '#FFFFFF',
  status: {
    new: { bg: '#EFF6FF', text: '#2563EB', dot: '#2563EB' },
    inProgress: { bg: '#FEF3C7', text: '#D97706', dot: '#D97706' },
    followUp: { bg: '#F5F3FF', text: '#7C3AED', dot: '#7C3AED' },
    won: { bg: '#DCFCE7', text: '#16A34A', dot: '#16A34A' },
    lost: { bg: '#F1F5F9', text: '#64748B', dot: '#64748B' },
  },
};

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const typography = {
  h1: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 36,
    color: colors.text,
  },
  h2: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.text,
  },
  h3: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.text,
  },
  headline: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  bodyMedium: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  caption: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  },
  footnote: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  },
  badge: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  card: 20,
  pill: 999,
  full: 9999,
};

export const shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
};

export const cardStyles = {
  backgroundColor: colors.card,
  borderRadius: radius.card,
  borderWidth: 1,
  borderColor: colors.border,
  ...shadows.card,
};

const AVATAR_PALETTES = [
  { backgroundColor: '#E0E7FF', textColor: '#3730A3' }, // Indigo
  { backgroundColor: '#DBEAFE', textColor: '#1E40AF' }, // Blue
  { backgroundColor: '#CFFAFE', textColor: '#155E75' }, // Cyan
  { backgroundColor: '#CCFBF1', textColor: '#115E59' }, // Teal
  { backgroundColor: '#D1FAE5', textColor: '#065F46' }, // Emerald
  { backgroundColor: '#FEF3C7', textColor: '#92400E' }, // Amber
  { backgroundColor: '#FFEDD5', textColor: '#9A3412' }, // Orange
  { backgroundColor: '#FEE2E2', textColor: '#991B1B' }, // Red
  { backgroundColor: '#FCE7F3', textColor: '#9D174D' }, // Pink
  { backgroundColor: '#F3E8FF', textColor: '#6B21A8' }, // Purple
  { backgroundColor: '#EDE9FE', textColor: '#5B21B6' }, // Violet
];

export function getAvatarColors(name?: string): { backgroundColor: string; textColor: string } {
  if (!name || name.trim().length === 0) {
    return AVATAR_PALETTES[0];
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

export const theme = {
  colors,
  fonts,
  typography,
  spacing,
  radius,
  shadows,
  cardStyles,
  getAvatarColors,
};

export default theme;
