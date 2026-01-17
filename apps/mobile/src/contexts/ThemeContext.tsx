import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, ThemeMode, getTheme, lightTheme } from '../lib/theme';

const THEME_STORAGE_KEY = '@app_theme_mode';

interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme() ?? 'light';
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
          setThemeModeState(savedMode as ThemeMode);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadTheme();
  }, []);

  // Save theme preference
  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }, []);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const currentEffectiveMode = themeMode === 'system' ? systemColorScheme : themeMode;
    const newMode = currentEffectiveMode === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
  }, [themeMode, systemColorScheme, setThemeMode]);

  // Get current theme
  const theme = useMemo(() => {
    return getTheme(themeMode, systemColorScheme);
  }, [themeMode, systemColorScheme]);

  // Check if dark mode
  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemColorScheme]);

  const value = useMemo(
    () => ({
      theme,
      themeMode,
      isDark,
      setThemeMode,
      toggleTheme,
    }),
    [theme, themeMode, isDark, setThemeMode, toggleTheme]
  );

  // Return a default theme while loading to prevent flicker
  if (!isLoaded) {
    return (
      <ThemeContext.Provider
        value={{
          theme: lightTheme,
          themeMode: 'system',
          isDark: false,
          setThemeMode: () => {},
          toggleTheme: () => {},
        }}
      >
        {children}
      </ThemeContext.Provider>
    );
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access theme context
 * @returns Theme context value with colors, spacing, typography, and theme controls
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Hook to get only theme colors (for simpler usage)
 */
export function useThemeColors() {
  const { theme } = useTheme();
  return theme.colors;
}

/**
 * Hook to check if dark mode is active
 */
export function useIsDark() {
  const { isDark } = useTheme();
  return isDark;
}
