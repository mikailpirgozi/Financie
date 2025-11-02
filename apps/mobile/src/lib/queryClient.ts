import { QueryClient } from '@tanstack/react-query';

/**
 * Global QueryClient pre mobile app
 * Konfigurácia:
 * - staleTime: 30s - dáta sú považované za "fresh" 30 sekúnd
 * - gcTime: 5 min - garbage collection cache po 5 minútach neaktivity
 * - retry: 2x - automatický retry pre failed requests
 * - refetchOnWindowFocus: false - nerob refetch pri focus (mobile špecifické)
 * - refetchOnMount: true - refetch pri mount komponentu ak sú data stale
 * - refetchOnReconnect: true - refetch pri obnovení internetu
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data freshness & caching
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
      
      // Retry logic
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch behavior
      refetchOnWindowFocus: false, // Mobile: window focus nie je relevantný
      refetchOnMount: true,
      refetchOnReconnect: true,
      
      // Network mode
      networkMode: 'online', // Vyžaduje online pripojenie
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

/**
 * Query keys pre konzistentnú cache management
 */
export const queryKeys = {
  // Household
  household: ['household', 'current'] as const,
  
  // Dashboard
  dashboard: (householdId: string, monthsCount: number) => 
    ['dashboard', householdId, monthsCount] as const,
  dashboardFull: (householdId: string) => 
    ['dashboard-full', householdId] as const,
  overdue: (householdId: string) => 
    ['overdue', householdId] as const,
  
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
    kind ? ['categories', householdId, kind] as const : ['categories', householdId] as const,
  
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

