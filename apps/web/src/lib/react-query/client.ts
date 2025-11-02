import { QueryClient } from '@tanstack/react-query';

/**
 * Factory pre vytvorenie QueryClient s optimalizovanou konfiguráciou
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data freshness & caching (optimalizované pre rýchlejšie načítavanie)
        staleTime: 30 * 1000, // 30 seconds - kratšie pre častejšie refresh
        gcTime: 10 * 60 * 1000, // 10 minutes cache
        
        // Retry logic
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Refetch behavior (optimalizované pre lepší UX)
        refetchOnWindowFocus: true, // Refresh pri návrate na tab
        refetchOnMount: true, // Refresh pri mount ak sú data stale
        refetchOnReconnect: true, // Refresh pri obnovení internetu
        
        // Network mode
        networkMode: 'online',
      },
      mutations: {
        // Mutation retry
        retry: 1,
        retryDelay: 1000,
        
        // Network mode
        networkMode: 'online',
      },
    },
  });
}
