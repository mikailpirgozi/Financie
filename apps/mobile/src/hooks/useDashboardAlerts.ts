import { useQuery } from '@tanstack/react-query';
import { getDashboardAlerts, type DashboardAlertsResponse } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { useHousehold } from '@/hooks/useHousehold';

interface NextPayment {
  date: string;
  amount: number;
  lender: string;
  loanName?: string;
  daysUntil: number;
  loanId: string;
}

/**
 * Dashboard Alerts data - optimized single API call
 * Nahradil 9 paralelných API volaní jedným server-side agregovaným requestom
 */
export interface DashboardAlertsData {
  loans: Omit<DashboardAlertsResponse['loans'], 'nextPayment'> & {
    nextPayment: NextPayment | null;
  };
  documents: DashboardAlertsResponse['documents'];
  vehicles: DashboardAlertsResponse['vehicles'];
  finance: DashboardAlertsResponse['finance'];
  householdId: string | null;
}

export function useDashboardAlerts() {
  // Zdielany household query (cachovany na 5 min) - neduplikuje GET household
  const householdQuery = useHousehold();
  const householdId = householdQuery.data?.id;

  const query = useQuery({
    queryKey: householdId
      ? queryKeys.dashboardAlerts(householdId)
      : ['dashboard-alerts', 'no-household'],
    enabled: !!householdId,
    queryFn: async (): Promise<DashboardAlertsData> => {
      // 🚀 Jeden API request namiesto 9 paralelných volaní
      const data = await getDashboardAlerts(householdId as string);

      return {
        loans: {
          ...data.loans,
          nextPayment: data.loans.nextPayment
            ? {
                ...data.loans.nextPayment,
                loanName: data.loans.nextPayment.loanName ?? undefined,
              }
            : null,
        },
        documents: data.documents,
        vehicles: data.vehicles,
        finance: data.finance,
        householdId: data.householdId,
      };
    },
    staleTime: 60 * 1000, // 60 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false, // global default - respektuj staleTime
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

  return {
    data: query.data,
    isLoading: householdQuery.isLoading || query.isLoading,
    isFetching: query.isFetching,
    error: householdQuery.error ?? query.error,
    refetch: query.refetch,
    hasData: !!query.data,
  };
}
