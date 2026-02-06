import { useQuery } from '@tanstack/react-query';
import {
  getCurrentHousehold,
  getDashboardAlerts,
  type DashboardAlertsResponse,
} from '@/lib/api';

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
  const query = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: async (): Promise<DashboardAlertsData> => {
      const household = await getCurrentHousehold();
      const householdId = household.id;

      // 🚀 Jeden API request namiesto 9 paralelných volaní
      const data = await getDashboardAlerts(householdId);

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
    staleTime: 60 * 1000, // 60 seconds (increased from 30s)
    gcTime: 5 * 60 * 1000, // 5 minutes
    // Removed refetchOnMount: 'always' - now respects staleTime for faster navigation
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Mobile: window focus nie je relevantný
    placeholderData: (previousData) => previousData,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    hasData: !!query.data,
  };
}
