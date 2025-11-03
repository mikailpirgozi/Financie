import { useQuery } from '@tanstack/react-query';
import { getCurrentHousehold, getDashboardData } from '../lib/api';
import { supabase } from '../lib/supabase';

/**
 * 🚀 PROGRESSIVE LOADING PATTERN + STALE-WHILE-REVALIDATE
 * 
 * Stratégia:
 * 1. Zobraz cached data okamžite (ak existujú) - INSTANT UX
 * 2. V pozadí fetchni fresh data
 * 3. Update UI smooth bez loadingu
 * 
 * Výhody:
 * - Okamžitý UI response (0ms perceived loading)
 * - Smooth updates bez blikania
 * - Vždy fresh data v pozadí
 * - Optimistic UX
 */

interface ProgressiveDashboardOptions {
  monthsCount?: number;
  includeRecent?: boolean;
  priority?: 'critical' | 'secondary' | 'tertiary';
}

/**
 * Hook: Progressive dashboard loading s prioritami
 */
export function useProgressiveDashboard(options: ProgressiveDashboardOptions = {}) {
  const { monthsCount = 6, includeRecent = false, priority = 'critical' } = options;

  // Nastavenie stale time podľa priority
  const staleTimeByPriority = {
    critical: 10 * 1000, // 10s - KPI cards, najčastejšie zobrazované
    secondary: 30 * 1000, // 30s - charts, grafy
    tertiary: 60 * 1000, // 60s - history table, menej dôležité
  };

  const query = useQuery({
    queryKey: ['dashboard-full', monthsCount, includeRecent],
    queryFn: async () => {
      // Temporary: Use legacy approach directly (localhost API not running)
      // TODO: Switch back to getDashboardFull when backend is deployed
      const household = await getCurrentHousehold();
      const dashboard = await getDashboardData(household.id, monthsCount);
      
      const { data: overdueData } = await supabase
        .rpc('count_overdue_installments', { p_household_id: household.id });
      
      // Count upcoming installments (due within 5 days)
      const today = new Date();
      const fiveDaysFromNow = new Date(today);
      fiveDaysFromNow.setDate(today.getDate() + 5);
      
      const { data: upcomingData } = await supabase
        .from('loan_schedules')
        .select('id, due_date, status, loan_id')
        .eq('status', 'pending')
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', fiveDaysFromNow.toISOString().split('T')[0])
        .in('loan_id', (await supabase
          .from('loans')
          .select('id')
          .eq('household_id', household.id)
          .then(res => res.data?.map(l => l.id) ?? [])));
      
      return {
        household,
        dashboard,
        overdueCount: overdueData ?? 0,
        upcomingCount: upcomingData?.length ?? 0,
        recentTransactions: undefined,
      };
    },
    
    // 🔥 STALE-WHILE-REVALIDATE konfigurácia
    staleTime: staleTimeByPriority[priority],
    gcTime: 5 * 60 * 1000, // 5 min cache
    
    // Retry logic - no retry for 500 errors (fallback sa aktivuje okamžite)
    retry: 0,
    
    // Refetch stratégie
    refetchOnMount: 'always', // Vždy refresh pri mount (ale používa cache)
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    
    // ⚡ KĽÚČOVÉ: keepPreviousData = zobraz staré data počas fetchovania nových
    // V TanStack Query v5 je to placeholderData: keepPreviousData
    placeholderData: (previousData) => previousData,
    
    // Network mode
    networkMode: 'online',
  });

  return {
    // Data
    household: query.data?.household,
    dashboard: query.data?.dashboard,
    overdueCount: query.data?.overdueCount ?? 0,
    upcomingCount: query.data?.upcomingCount ?? 0,
    recentTransactions: query.data?.recentTransactions,
    
    // States
    isLoading: query.isLoading, // TRUE len pri prvom načítaní (bez cache)
    isFetching: query.isFetching, // TRUE aj pri background refetch
    isRefetching: query.isRefetching, // TRUE len pri manuálnom refetch
    isStale: query.isStale, // TRUE ak sú data stale (potrebujú refresh)
    error: query.error,
    
    // Helpers
    hasData: !!query.data,
    hasCachedData: !!query.data && query.isStale,
    isBackgroundRefreshing: query.isFetching && !query.isLoading,
    
    // Actions
    refetch: query.refetch,
    
    // Metadata
    dataUpdatedAt: query.dataUpdatedAt,
    lastFetchedAt: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
  };
}

/**
 * Hook: Critical data (KPI cards) - najvyššia priorita
 * Použitie: Zobraz okamžite, refresh často
 */
export function useCriticalDashboard(monthsCount: number = 6) {
  return useProgressiveDashboard({
    monthsCount,
    includeRecent: false,
    priority: 'critical',
  });
}

/**
 * Hook: Secondary data (charts) - stredná priorita
 * Použitie: Môže sa načítať o chvíľu neskôr, refresh menej často
 */
export function useSecondaryDashboard(monthsCount: number = 6) {
  return useProgressiveDashboard({
    monthsCount,
    includeRecent: false,
    priority: 'secondary',
  });
}

/**
 * Hook: Tertiary data (history table) - najnižšia priorita
 * Použitie: Lazy load pri scrolle, refresh zriedka
 */
export function useTertiaryDashboard(monthsCount: number = 12, includeRecent: boolean = true) {
  return useProgressiveDashboard({
    monthsCount,
    includeRecent,
    priority: 'tertiary',
  });
}

/**
 * Custom hook: Inteligentný refresh indikátor
 * Zobrazí malý indikátor len pri background refetch (nie fullscreen loading)
 */
export function useSmartRefreshIndicator() {
  const { isFetching, isLoading, hasData } = useProgressiveDashboard();
  
  // Zobraz indikátor len ak:
  // 1. Fetching prebieh
  // 2. NIE je to prvé načítavanie (isLoading)
  // 3. Už máme nejaké data (hasData)
  const showIndicator = isFetching && !isLoading && hasData;
  
  return {
    showIndicator,
    message: 'Aktualizujem dáta...',
  };
}

