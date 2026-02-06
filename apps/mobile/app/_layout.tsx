import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { envError } from '../src/lib/env';
import { queryClient } from '../src/lib/queryClient';
import { ThemeProvider } from '../src/contexts';

const ONBOARDING_COMPLETED_KEY = '@onboarding_completed';

/** Error boundary to catch crashes during render */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>Aplikácia spadla</Text>
          <ScrollView style={errorStyles.scroll}>
            <Text style={errorStyles.message}>
              {this.state.error?.message ?? 'Neznáma chyba'}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 16,
  },
  scroll: {
    maxHeight: 300,
    width: '100%',
  },
  message: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'monospace',
  },
});

export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const segments = useSegments();
  const router = useRouter();

  // Initialize app - all native module calls happen INSIDE useEffect (after mount)
  useEffect(() => {
    const init = async () => {
      try {
        // 1. Configure notification handler (safe, after native modules ready)
        try {
          const { configureNotificationHandler } = require('../src/lib/notifications');
          configureNotificationHandler();
        } catch (err) {
          console.warn('Notification handler setup failed:', err);
        }

        // 2. Check onboarding status
        try {
          const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
          setHasSeenOnboarding(value === 'true');
        } catch {
          console.warn('Failed to check onboarding status');
          setHasSeenOnboarding(true);
        }

        // 3. Initialize RevenueCat (optional, don't block on failure)
        try {
          const { initializeSubscriptions } = require('../src/lib/subscriptions');
          await initializeSubscriptions();
        } catch (err) {
          console.warn('Subscriptions init failed:', err);
        }

        // 4. Check auth session
        try {
          const { supabase } = require('../src/lib/supabase');
          const { data: { session } } = await supabase.auth.getSession();
          setIsAuthenticated(!!session);

          // 5. Listen for auth changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event: string, session: { user: unknown } | null) => {
              setIsAuthenticated(!!session);

              if (session) {
                import('../src/lib/notifications')
                  .then(({ registerForPushNotifications }) =>
                    registerForPushNotifications()
                  )
                  .catch((err) =>
                    console.warn('Push notification registration failed:', err)
                  );
              }
            }
          );

          return () => subscription.unsubscribe();
        } catch (err) {
          console.error('Auth init failed:', err);
          setIsAuthenticated(false);
          setHasSeenOnboarding(true);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('App init failed:', msg);
        setInitError(msg);
        // Fallback so app doesn't stay on white screen
        setIsAuthenticated(false);
        setHasSeenOnboarding(true);
      }
    };

    init();
  }, []);

  // Handle notification taps (lazy import)
  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    try {
      const Notifications = require('expo-notifications');
      sub = Notifications.addNotificationResponseReceivedListener(
        (response: { notification: { request: { content: { data: Record<string, unknown> } } } }) => {
          const data = response.notification.request.content.data;
          if (data.loanId) {
            router.push(`/(tabs)/loans/${data.loanId as string}`);
          }
        }
      );
    } catch (err) {
      console.warn('Notification listener setup failed:', err);
    }

    return () => sub?.remove();
  }, [router]);

  // Refresh onboarding status when segments change
  useEffect(() => {
    const refreshOnboardingStatus = async () => {
      try {
        const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
        const completed = value === 'true';
        if (completed !== hasSeenOnboarding) {
          setHasSeenOnboarding(completed);
        }
      } catch (error) {
        console.error('Failed to refresh onboarding status:', error);
      }
    };

    if (segments[0] === '(auth)') {
      refreshOnboardingStatus();
    }
  }, [segments]);

  useEffect(() => {
    if (isAuthenticated === null || hasSeenOnboarding === null) return;

    const inAuthGroup = segments[0] === '(auth)';
    const currentRoute = segments[segments.length - 1];

    if (currentRoute === 'onboarding') {
      return;
    }

    if (!hasSeenOnboarding && currentRoute !== 'onboarding') {
      router.replace('/(auth)/onboarding');
      return;
    }

    if (hasSeenOnboarding) {
      if (!isAuthenticated && !inAuthGroup) {
        router.replace('/(auth)/login');
      } else if (isAuthenticated && inAuthGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, hasSeenOnboarding, segments]);

  // Show env or init error screen instead of blank white screen
  if (envError || initError) {
    return (
      <View style={errorStyles.container}>
        <Text style={errorStyles.title}>
          {envError ? 'Chyba konfigurácie' : 'Chyba pri štarte'}
        </Text>
        <ScrollView style={errorStyles.scroll}>
          <Text style={errorStyles.message}>{envError ?? initError}</Text>
        </ScrollView>
      </View>
    );
  }

  // Show loading while checking auth/onboarding (prevents blank screen)
  if (isAuthenticated === null || hasSeenOnboarding === null) {
    return (
      <View style={errorStyles.container}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <GestureHandlerRootView style={styles.container}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(screens)" />
              <Stack.Screen name="index" />
            </Stack>
          </GestureHandlerRootView>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

