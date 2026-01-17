import { useQuery } from '@tanstack/react-query';
import {
  getCurrentHousehold,
  getLoans,
  getInsurances,
  getVehicleDocuments,
  getFines,
  getVehicles,
  getDashboardData,
} from '@/lib/api';
import { supabase } from '@/lib/supabase';

interface NextPayment {
  date: string;
  amount: number;
  lender: string;
  loanName?: string;
  daysUntil: number;
  loanId: string;
}

interface ExpiringDocument {
  type: string;
  date: string;
  daysUntil: number;
}

interface LoanStats {
  totalDebt: number;
  activeCount: number;
  overdueCount: number;
  nextPayment: NextPayment | null;
  totalProgress: number;
  totalPrincipal: number;
}

interface DocumentStats {
  totalCount: number;
  expiringCount: number; // Total needing attention (expired + expiring soon)
  expiredCount: number; // Already expired
  expiringSoonCount: number; // Expiring within 30 days
  unpaidFinesCount: number;
  unpaidFinesTotal: number;
  nearestExpiring: ExpiringDocument | null;
}

interface VehicleStats {
  totalCount: number;
  totalValue: number;
  loanBalance: number;
  expiringDocsCount: number;
}

interface FinanceStats {
  netWorth: number;
  netWorthChange: number;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  month: string;
}

export interface DashboardAlertsData {
  loans: LoanStats;
  documents: DocumentStats;
  vehicles: VehicleStats;
  finance: FinanceStats;
  householdId: string | null;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function parseAmount(val: number | string | undefined | null): number {
  if (val === undefined || val === null) return 0;
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(num) ? 0 : num;
}

function calculateDaysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function useDashboardAlerts() {
  const query = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: async (): Promise<DashboardAlertsData> => {
      const household = await getCurrentHousehold();
      const householdId = household.id;

      // Fetch all data in parallel
      const [
        loansData,
        insurancesData,
        stkData,
        ekData,
        vignettesData,
        finesData,
        vehiclesData,
        dashboardData,
        overdueRpcData,
      ] = await Promise.all([
        getLoans(householdId),
        getInsurances(householdId),
        getVehicleDocuments(householdId, 'stk'),
        getVehicleDocuments(householdId, 'ek'),
        getVehicleDocuments(householdId, 'vignette'),
        getFines(householdId),
        getVehicles(householdId),
        getDashboardData(householdId, 1),
        supabase.rpc('count_overdue_installments', { p_household_id: householdId }),
      ]);

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + THIRTY_DAYS_MS);

      // Process Loans
      const activeLoans = loansData.filter(l => l.status === 'active');
      const totalDebt = activeLoans.reduce((sum, l) => sum + parseAmount(l.remaining_balance), 0);
      const totalPrincipal = loansData.reduce((sum, l) => sum + parseAmount(l.principal), 0);
      const totalPaid = loansData.reduce((sum, l) => sum + parseAmount(l.amount_paid || l.paid_principal), 0);
      const totalProgress = totalPrincipal > 0 ? (totalPaid / totalPrincipal) * 100 : 0;

      // Find next payment
      let nextPayment: NextPayment | null = null;
      for (const loan of activeLoans) {
        if (loan.next_installment) {
          const ni = loan.next_installment;
          if (!nextPayment || ni.days_until < nextPayment.daysUntil) {
            nextPayment = {
              date: ni.due_date,
              amount: parseAmount(ni.total_due),
              lender: loan.lender,
              loanName: loan.name,
              daysUntil: ni.days_until,
              loanId: loan.id,
            };
          }
        }
      }

      // Process Documents
      const allDocs: Array<{ type: string; validTo: string }> = [
        ...insurancesData.data.map(i => ({ type: 'insurance', validTo: i.validTo })),
        ...stkData.data.map(d => ({ type: 'stk', validTo: d.validTo })),
        ...ekData.data.map(d => ({ type: 'ek', validTo: d.validTo })),
        ...vignettesData.data.map(d => ({ type: 'vignette', validTo: d.validTo })),
      ];

      // Count expired documents (validTo < now)
      const expiredDocs = allDocs.filter(doc => {
        const validTo = new Date(doc.validTo);
        return validTo < now;
      });

      // Count documents expiring within 30 days (validTo >= now AND validTo <= thirtyDaysFromNow)
      const expiringDocs = allDocs.filter(doc => {
        const validTo = new Date(doc.validTo);
        return validTo >= now && validTo <= thirtyDaysFromNow;
      });

      // Total count of documents needing attention (expired + expiring soon)
      const docsNeedingAttention = [...expiredDocs, ...expiringDocs];

      // Find nearest expiring or most recently expired document
      let nearestExpiring: ExpiringDocument | null = null;
      for (const doc of docsNeedingAttention) {
        const daysUntil = calculateDaysUntil(doc.validTo);
        // Priority: expired docs first (negative daysUntil), then by closest to expiration
        if (!nearestExpiring || daysUntil < nearestExpiring.daysUntil) {
          nearestExpiring = {
            type: doc.type,
            date: doc.validTo,
            daysUntil,
          };
        }
      }

      // Process Fines
      const unpaidFines = finesData.data.filter(f => !f.isPaid);
      const unpaidFinesTotal = unpaidFines.reduce((sum, f) => sum + parseAmount(f.fineAmount), 0);

      // Process Vehicles
      const vehicles = vehiclesData.data;
      const vehicleStats = vehiclesData.stats;

      // Count vehicles with expiring docs (simplified - count from expiring docs stats)
      const expiringDocsCount = vehicleStats?.expiringSoonCount || 0;

      // Process Finance
      const currentMonth = dashboardData.currentMonth;

      return {
        loans: {
          totalDebt,
          activeCount: activeLoans.length,
          overdueCount: overdueRpcData.data || 0,
          nextPayment,
          totalProgress,
          totalPrincipal,
        },
        documents: {
          totalCount: allDocs.length,
          expiringCount: docsNeedingAttention.length, // Now includes both expired AND expiring soon
          expiredCount: expiredDocs.length,
          expiringSoonCount: expiringDocs.length,
          unpaidFinesCount: unpaidFines.length,
          unpaidFinesTotal,
          nearestExpiring,
        },
        vehicles: {
          totalCount: vehicles.length,
          totalValue: vehicleStats?.totalValue || 0,
          loanBalance: vehicleStats?.totalLoanBalance || 0,
          expiringDocsCount,
        },
        finance: {
          netWorth: parseAmount(currentMonth.netWorth),
          netWorthChange: parseAmount(currentMonth.netWorthChange),
          totalIncome: parseAmount(currentMonth.totalIncome),
          totalExpenses: parseAmount(currentMonth.totalExpenses),
          netCashFlow: parseAmount(currentMonth.netCashFlow),
          month: currentMonth.month,
        },
        householdId,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
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
