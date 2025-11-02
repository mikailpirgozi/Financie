import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  getCurrentHousehold, 
  getDashboardData,
  getDashboardFull,
} from '../lib/api';
import { queryKeys } from '../lib/queryClient';
import { supabase } from '../lib/supabase';

/**
 * Hook: načíta aktuálnu household
 */
export function useCurrentHousehold() {
  return useQuery({
    queryKey: queryKeys.household,
    queryFn: getCurrentHousehold,
    staleTime: 5 * 60 * 1000, // 5 minutes - household sa nemení často
  });
}

/**
 * Hook: načíta dashboard data
 */
export function useDashboard(householdId: string, monthsCount: number = 6) {
  return useQuery({
    queryKey: queryKeys.dashboard(householdId, monthsCount),
    queryFn: () => getDashboardData(householdId, monthsCount),
    enabled: !!householdId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook: načíta overdue count
 */
export function useOverdueCount(householdId: string) {
  return useQuery({
    queryKey: queryKeys.overdue(householdId),
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('count_overdue_installments', { p_household_id: householdId });
      
      if (error) throw error;
      return data ?? 0;
    },
    enabled: !!householdId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * 🚀 OPTIMALIZOVANÁ VERZIA: Hook pre kompletný dashboard
 * Používa nový /api/dashboard-full endpoint = 1 request namiesto 3+
 * 
 * Výhody:
 * - Rýchlejšie načítavanie (1 HTTP request)
 * - Menej network overhead
 * - Server-side caching
 * - Automatický retry a error handling
 */
export function useDashboardFull(monthsCount: number = 6, includeRecent: boolean = false) {
  const query = useQuery({
    queryKey: ['dashboard-full', monthsCount, includeRecent],
    queryFn: () => getDashboardFull(monthsCount, includeRecent),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
  
  return {
    household: query.data?.household,
    dashboard: query.data?.dashboard,
    overdueCount: query.data?.overdueCount ?? 0,
    recentTransactions: query.data?.recentTransactions,
    
    isLoading: query.isLoading,
    error: query.error,
    
    // Legacy compatibility
    householdLoading: query.isLoading,
    dashboardLoading: query.isLoading,
    overdueLoading: query.isLoading,
    
    refetch: query.refetch,
    refetchDashboard: query.refetch,
  };
}

/**
 * FALLBACK VERZIA: Používa staré 3 separátne requesty
 * Použitie ak dashboard-full nefunguje alebo pre kompatibilitu
 */
export function useDashboardFullLegacy(monthsCount: number = 6) {
  // 1. Načítaj household najskôr (potrebujeme ID)
  const householdQuery = useCurrentHousehold();
  
  // 2. Paralelne načítaj dashboard data a overdue count
  const dashboardQuery = useDashboard(
    householdQuery.data?.id ?? '', 
    monthsCount
  );
  
  const overdueQuery = useOverdueCount(
    householdQuery.data?.id ?? ''
  );
  
  // Aggregate loading state
  const isLoading = householdQuery.isLoading || 
    (householdQuery.isSuccess && dashboardQuery.isLoading);
  
  // Aggregate error state
  const error = householdQuery.error || dashboardQuery.error || overdueQuery.error;
  
  // Výsledok
  return {
    household: householdQuery.data,
    dashboard: dashboardQuery.data,
    overdueCount: overdueQuery.data ?? 0,
    isLoading,
    error,
    
    // Individual states pre fine-grained control
    householdLoading: householdQuery.isLoading,
    dashboardLoading: dashboardQuery.isLoading,
    overdueLoading: overdueQuery.isLoading,
    
    // Refetch functions
    refetch: () => {
      householdQuery.refetch();
      dashboardQuery.refetch();
      overdueQuery.refetch();
    },
    refetchDashboard: dashboardQuery.refetch,
  };
}

/**
 * Hook: prefetch dashboard data
 * Použitie: await prefetchDashboard() pred navigáciou na dashboard
 */
export function usePrefetchDashboard() {
  const queryClient = useQueryClient();
  
  return async (householdId: string, monthsCount: number = 6) => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.dashboard(householdId, monthsCount),
        queryFn: () => getDashboardData(householdId, monthsCount),
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.overdue(householdId),
        queryFn: async () => {
          const { data, error } = await supabase
            .rpc('count_overdue_installments', { p_household_id: householdId });
          
          if (error) throw error;
          return data ?? 0;
        },
      }),
    ]);
  };
}

