/**
 * Theme System for FinApp Mobile
 * Supports Light and Dark modes with consistent color palette
 */

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // Backgrounds
  background: string;
  surface: string;
  surfaceElevated: string;
  surfacePressed: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Brand
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // Semantic
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  danger: string;
  dangerLight: string;
  info: string;
  infoLight: string;

  // Borders
  border: string;
  borderLight: string;
  borderFocus: string;

  // Status indicators
  statusActive: string;
  statusOverdue: string;
  statusDueSoon: string;
  statusPaid: string;

  // Shadows (for iOS)
  shadowColor: string;

  // Section-specific colors
  expense: string;
  expenseLight: string;
  income: string;
  incomeLight: string;

  // Aliases for compatibility
  card: string; // Alias for surface
  error: string; // Alias for danger
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface ThemeTypography {
  fontFamily: string;
  sizes: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    hero: number;
  };
  weights: {
    regular: '400';
    medium: '500';
    semibold: '600';
    bold: '700';
    extrabold: '800';
  };
  lineHeights: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

export interface ThemeBorderRadius {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: ThemeSpacing;
  typography: ThemeTypography;
  borderRadius: ThemeBorderRadius;
}

// Shared values across themes
const spacing: ThemeSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

const typography: ThemeTypography = {
  fontFamily: 'System',
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 28,
    hero: 48,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

const borderRadius: ThemeBorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Light Theme Colors
const lightColors: ThemeColors = {
  // Backgrounds
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfacePressed: '#F1F5F9',

  // Text
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Brand - Violet
  primary: '#7C3AED',
  primaryLight: '#EDE9FE',
  primaryDark: '#5B21B6',

  // Semantic
  success: '#059669',
  successLight: '#D1FAE5',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  info: '#0284C7',
  infoLight: '#E0F2FE',

  // Borders
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderFocus: '#7C3AED',

  // Status indicators
  statusActive: '#7C3AED',
  statusOverdue: '#DC2626',
  statusDueSoon: '#D97706',
  statusPaid: '#059669',

  // Shadows
  shadowColor: '#000000',

  // Section-specific colors
  expense: '#EF4444',
  expenseLight: '#FEE2E2',
  income: '#10B981',
  incomeLight: '#D1FAE5',

  // Aliases for compatibility
  card: '#FFFFFF',
  error: '#DC2626',
};

// Dark Theme Colors
const darkColors: ThemeColors = {
  // Backgrounds
  background: '#0F172A',
  surface: '#1E293B',
  surfaceElevated: '#334155',
  surfacePressed: '#475569',

  // Text
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F172A',

  // Brand - Violet (lighter for dark mode)
  primary: '#A78BFA',
  primaryLight: '#312E81',
  primaryDark: '#C4B5FD',

  // Semantic (adjusted for dark mode)
  success: '#34D399',
  successLight: '#064E3B',
  warning: '#FBBF24',
  warningLight: '#78350F',
  danger: '#F87171',
  dangerLight: '#7F1D1D',
  info: '#38BDF8',
  infoLight: '#0C4A6E',

  // Borders
  border: '#334155',
  borderLight: '#1E293B',
  borderFocus: '#A78BFA',

  // Status indicators
  statusActive: '#A78BFA',
  statusOverdue: '#F87171',
  statusDueSoon: '#FBBF24',
  statusPaid: '#34D399',

  // Shadows
  shadowColor: '#000000',

  // Section-specific colors
  expense: '#F87171',
  expenseLight: '#7F1D1D',
  income: '#34D399',
  incomeLight: '#064E3B',

  // Aliases for compatibility
  card: '#1E293B',
  error: '#F87171',
};

// Export themes
export const lightTheme: Theme = {
  mode: 'light',
  colors: lightColors,
  spacing,
  typography,
  borderRadius,
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: darkColors,
  spacing,
  typography,
  borderRadius,
};

// Helper function to get theme by mode
export function getTheme(mode: ThemeMode, systemColorScheme: 'light' | 'dark' = 'light'): Theme {
  if (mode === 'system') {
    return systemColorScheme === 'dark' ? darkTheme : lightTheme;
  }
  return mode === 'dark' ? darkTheme : lightTheme;
}

// Priority colors helper
export const priorityColors = {
  high: {
    light: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
    dark: { bg: '#7F1D1D', text: '#FECACA', border: '#991B1B' },
  },
  normal: {
    light: { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' },
    dark: { bg: '#374151', text: '#E5E7EB', border: '#4B5563' },
  },
  low: {
    light: { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
    dark: { bg: '#1E3A5F', text: '#BFDBFE', border: '#1E40AF' },
  },
};

// Status colors helper
export const noteStatusColors = {
  pending: {
    light: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
    dark: { bg: '#78350F', text: '#FDE68A', border: '#92400E' },
  },
  completed: {
    light: { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
    dark: { bg: '#064E3B', text: '#A7F3D0', border: '#065F46' },
  },
  info: {
    light: { bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD' },
    dark: { bg: '#0C4A6E', text: '#BAE6FD', border: '#0369A1' },
  },
};

// Expense category colors
export const expenseCategoryColors: Record<string, { light: string; dark: string }> = {
  food: { light: '#F97316', dark: '#FB923C' },
  transport: { light: '#3B82F6', dark: '#60A5FA' },
  shopping: { light: '#EC4899', dark: '#F472B6' },
  entertainment: { light: '#8B5CF6', dark: '#A78BFA' },
  bills: { light: '#EF4444', dark: '#F87171' },
  health: { light: '#10B981', dark: '#34D399' },
  education: { light: '#06B6D4', dark: '#22D3EE' },
  travel: { light: '#F59E0B', dark: '#FBBF24' },
  other: { light: '#6B7280', dark: '#9CA3AF' },
  default: { light: '#7C3AED', dark: '#A78BFA' },
};

// Income source colors
export const incomeSourceColors: Record<string, { light: string; dark: string }> = {
  salary: { light: '#10B981', dark: '#34D399' },
  freelance: { light: '#3B82F6', dark: '#60A5FA' },
  investment: { light: '#8B5CF6', dark: '#A78BFA' },
  rental: { light: '#F59E0B', dark: '#FBBF24' },
  gift: { light: '#EC4899', dark: '#F472B6' },
  refund: { light: '#06B6D4', dark: '#22D3EE' },
  other: { light: '#6B7280', dark: '#9CA3AF' },
  default: { light: '#10B981', dark: '#34D399' },
};

// Helper function to get category color
export function getCategoryColor(
  category: string | undefined | null,
  type: 'expense' | 'income',
  isDark: boolean
): string {
  const colorMap = type === 'expense' ? expenseCategoryColors : incomeSourceColors;
  const normalizedCategory = (category || 'default').toLowerCase();
  const colorSet = colorMap[normalizedCategory] || colorMap.default;
  return isDark ? colorSet.dark : colorSet.light;
}
