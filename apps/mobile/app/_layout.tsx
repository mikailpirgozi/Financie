import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../src/lib/supabase';
import { registerForPushNotifications } from '../src/lib/notifications';
import { initializeSubscriptions } from '../src/lib/subscriptions';
import { queryClient } from '../src/lib/queryClient';

const ONBOARDING_COMPLETED_KEY = '@onboarding_completed';

export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Check onboarding status
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
        setHasSeenOnboarding(value === 'true');
      } catch (error) {
        console.error('Failed to check onboarding status:', error);
        setHasSeenOnboarding(true); // Default to true on error
      }
    };

    checkOnboarding();

    // Initialize RevenueCat
    initializeSubscriptions().catch((err) =>
      console.error('Failed to initialize subscriptions:', err)
    );

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);

      // Register for push notifications when user logs in
      if (session) {
        registerForPushNotifications().catch((err) =>
          console.error('Failed to register for push notifications:', err)
        );
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle notification taps
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        
        // Navigate to loan detail when notification is tapped
        if (data.loanId) {
          router.push(`/(tabs)/loans/${data.loanId as string}`);
        }
      }
    );

    return () => subscription.remove();
  }, [router]);

  // Refresh onboarding status when segments change
  useEffect(() => {
    const refreshOnboardingStatus = async () => {
      try {
        const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
        const completed = value === 'true';
        // Only update if changed
        if (completed !== hasSeenOnboarding) {
          setHasSeenOnboarding(completed);
        }
      } catch (error) {
        console.error('Failed to refresh onboarding status:', error);
      }
    };

    // Refresh when we're on auth screens
    if (segments[0] === '(auth)') {
      refreshOnboardingStatus();
    }
  }, [segments]);

  useEffect(() => {
    if (isAuthenticated === null || hasSeenOnboarding === null) return;

    const inAuthGroup = segments[0] === '(auth)';
    const currentRoute = segments[segments.length - 1];

    // Skip routing if we're on onboarding screen to prevent loops
    if (currentRoute === 'onboarding') {
      return;
    }

    // First time users - show onboarding (only if not already there)
    if (!hasSeenOnboarding && currentRoute !== 'onboarding') {
      router.replace('/(auth)/onboarding');
      return;
    }

    // Skip routing if user has seen onboarding and is in the expected flow
    if (hasSeenOnboarding) {
      // Authentication logic
      if (!isAuthenticated && !inAuthGroup) {
        // Redirect to login if not authenticated
        router.replace('/(auth)/login');
      } else if (isAuthenticated && inAuthGroup) {
        // Redirect to tabs if authenticated and in auth group
        router.replace('/(tabs)');
      }
      // Allow (screens) and (tabs) groups when authenticated
    }
  }, [isAuthenticated, hasSeenOnboarding, segments]);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={styles.container}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(screens)" />
          <Stack.Screen name="index" />
        </Stack>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

