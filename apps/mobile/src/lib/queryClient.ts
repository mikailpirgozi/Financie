import { QueryClient } from '@tanstack/react-query';

/**
 * Global QueryClient pre mobile app
 * Konfigurácia:
 * - staleTime: 60s - dáta sú považované za "fresh" 60 sekúnd
 * - gcTime: 5 min - garbage collection cache po 5 minútach neaktivity
 * - retry: 2x - automatický retry pre failed requests
 * - refetchOnWindowFocus: false - mobile nepotrebuje
 * - refetchOnMount: false - kazdy navrat na obrazovku NESPUSTI fetch
 *   (data ktore su `fresh` v cache sa hned zobrazia; refetch len cez
 *   pull-to-refresh, mutations alebo realtime).
 * - refetchOnReconnect: true - po obnove pripojenia osviezit
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data freshness & caching
      staleTime: 60 * 1000, // 60 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)

      // Retry logic
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch behavior – konzervativne defaulty (opt-in per query)
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,

      // Network mode
      networkMode: 'online', // Vyžaduje online pripojenie
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      networkMode: 'online',
    },
  },
});

/**
 * Query keys pre konzistentnú cache management
 */
export const queryKeys = {
  // Household
  household: ['household', 'current'] as const,

  // Dashboard
  dashboard: (householdId: string, monthsCount: number) =>
    ['dashboard', householdId, monthsCount] as const,
  dashboardFull: (householdId: string) => ['dashboard-full', householdId] as const,
  dashboardAlerts: (householdId: string) => ['dashboard-alerts', householdId] as const,
  overdue: (householdId: string) => ['overdue', householdId] as const,
  loanNotes: (householdId: string) => ['loan-notes', householdId] as const,

  // Loans
  loans: (householdId: string) => ['loans', householdId] as const,
  loan: (loanId: string) => ['loan', loanId] as const,
  loanSchedule: (loanId: string) => ['loan-schedule', loanId] as const,

  // Expenses
  expenses: (householdId: string) => ['expenses', householdId] as const,
  expense: (expenseId: string) => ['expense', expenseId] as const,

  // Incomes
  incomes: (householdId: string) => ['incomes', householdId] as const,
  income: (incomeId: string) => ['income', incomeId] as const,

  // Categories
  categories: (householdId: string, kind?: string) =>
    kind ? (['categories', householdId, kind] as const) : (['categories', householdId] as const),

  // Rules
  rules: (householdId: string) => ['rules', householdId] as const,

  // Subscription
  subscription: (householdId: string) => ['subscription', householdId] as const,
} as const;

/**
 * Utility: Invalidate všetky dashboard related queries
 */
export function invalidateDashboard(householdId: string) {
  queryClient.invalidateQueries({
    queryKey: ['dashboard'],
    refetchType: 'active',
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.dashboardFull(householdId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.overdue(householdId),
  });
}

/**
 * Utility: Prefetch dashboard data
 */
export async function prefetchDashboard(_householdId: string) {
  // Implementované v hook
  return Promise.resolve();
}
