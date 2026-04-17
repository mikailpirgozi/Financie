import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { envError } from '../src/lib/env';
import { queryClient } from '../src/lib/queryClient';
import { ThemeProvider } from '../src/contexts';
import { initSentry, Sentry } from '../src/lib/sentry';

initSentry();

const ONBOARDING_COMPLETED_KEY = '@onboarding_completed';

/** Error boundary to catch crashes during render */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; componentStack: string | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, componentStack: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] ERROR:', error.message);
    console.error('[ErrorBoundary] STACK:', error.stack);
    console.error('[ErrorBoundary] COMPONENT STACK:', errorInfo.componentStack);
    this.setState({ componentStack: errorInfo.componentStack ?? null });
    try {
      Sentry.withScope((scope) => {
        scope.setExtras({ componentStack: errorInfo.componentStack ?? '' });
        Sentry.captureException(error);
      });
    } catch {
      // Sentry not initialised — ignore.
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>Aplikácia spadla</Text>
          <ScrollView style={errorStyles.scroll}>
            <Text style={errorStyles.message}>{this.state.error?.message ?? 'Neznáma chyba'}</Text>
            <Text style={errorStyles.stack}>{this.state.error?.stack ?? ''}</Text>
            <Text style={errorStyles.stack}>{this.state.componentStack ?? ''}</Text>
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
  stack: {
    fontSize: 10,
    color: '#999',
    fontFamily: 'monospace',
    marginTop: 8,
  },
});

function RootLayout() {
  // DEFAULTS: app renders immediately as unauthenticated with onboarding done
  // Auth check runs in background and updates state if user IS authenticated
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const segments = useSegments();
  const router = useRouter();

  // Initialize app in background
  useEffect(() => {
    let authCleanup: (() => void) | null = null;

    (async () => {
      // 1. Check onboarding
      try {
        const val = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
        if (val !== 'true') setHasSeenOnboarding(false);
      } catch {
        // keep default (true)
      }

      // 2. Check auth
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { supabase } = require('../src/lib/supabase');
        const { data } = await supabase.auth.getSession();
        if (data?.session) setIsAuthenticated(true);

        // Listen for future changes
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event: string, session: { user: unknown } | null) => {
          setIsAuthenticated(!!session);

          // Defense in depth: when Supabase reports the user has been
          // signed out (e.g. token expiration, manual logout, deleted
          // user), drop any cached household / query data so the next
          // user on the device starts from a clean slate.
          if (event === 'SIGNED_OUT') {
            try {
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              const { clearHouseholdCache } = require('../src/lib/api');
              clearHouseholdCache();
            } catch {
              // optional - ignore if module not loadable
            }
            try {
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              const { queryClient } = require('../src/lib/queryClient');
              queryClient.cancelQueries();
              queryClient.clear();
            } catch {
              // optional - ignore if module not loadable
            }
          }
        });
        authCleanup = () => subscription.unsubscribe();
      } catch (err) {
        console.warn('Auth check failed:', err);
      }

      // 3. Notifications (fire and forget)
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { configureNotificationHandler } = require('../src/lib/notifications');
        configureNotificationHandler();
      } catch {
        // optional
      }

      // 4. RevenueCat (fire and forget)
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { initializeSubscriptions } = require('../src/lib/subscriptions');
        initializeSubscriptions().catch(() => {});
      } catch {
        // optional
      }

      setIsReady(true);
    })().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message + '\n' + err.stack : String(err);
      setInitError(msg);
      setIsReady(true);
    });

    return () => authCleanup?.();
  }, []);

  // Handle notification taps
  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Notifications = require('expo-notifications');
      sub = Notifications.addNotificationResponseReceivedListener(
        (response: {
          notification: { request: { content: { data: Record<string, unknown> } } };
        }) => {
          const data = response.notification.request.content.data;
          if (data.loanId) {
            router.push(`/(tabs)/loans/${data.loanId as string}`);
          }
        }
      );
    } catch {
      // optional
    }
    return () => sub?.remove();
  }, [router]);

  // Routing: redirect based on auth state (only after init is done)
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const currentRoute = segments[segments.length - 1];

    if (currentRoute === 'onboarding') return;

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
  }, [isAuthenticated, hasSeenOnboarding, isReady, segments]);

  // Show env error screen
  if (envError || initError) {
    return (
      <View style={errorStyles.container}>
        <Text style={errorStyles.title}>
          {envError ? 'Chyba konfigurácie' : 'Chyba inicializácie'}
        </Text>
        <ScrollView style={errorStyles.scroll}>
          <Text style={errorStyles.message}>{envError ?? initError}</Text>
        </ScrollView>
      </View>
    );
  }

  // ALWAYS render the router - no loading screen, no blocking
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

// Wrap the root layout with Sentry's ErrorBoundary + Performance instrumentation.
// Safe even when initSentry() didn't run with a DSN — Sentry.wrap is a no-op then.
export default Sentry.wrap(RootLayout);
