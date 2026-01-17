import { useRouter } from 'expo-router';
import { InteractionManager } from 'react-native';

/**
 * Optimized navigation hook that navigates immediately
 * and defers heavy operations until after animation completes
 */
export function useOptimizedNavigation() {
  const router = useRouter();

  const navigate = (href: string) => {
    // Navigate immediately for instant UI feedback
    router.push(href as Parameters<typeof router.push>[0]);
    
    // Defer any heavy operations until after navigation animation
    InteractionManager.runAfterInteractions(() => {
      // Heavy operations can run here after navigation completes
    });
  };

  return { navigate, router };
}

/**
 * Hook to defer heavy operations until after interactions complete
 * Use this in screens to prevent blocking UI during mount
 */
export function useDeferredMount(callback: () => void, deps: React.DependencyList = []) {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
      callback();
    });

    return () => task.cancel();
  }, deps);

  return isReady;
}

import React from 'react';

