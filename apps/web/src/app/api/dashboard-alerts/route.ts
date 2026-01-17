import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLoans } from '@/lib/api/loans';

export const dynamic = 'force-dynamic';

interface NextPayment {
  date: string;
  amount: number;
  lender: string;
  loanName: string | null;
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
  totalMonthlyPayment: number;
  totalInterestPaid: number;
  totalInterestRemaining: number;
  paidOffCount: number;
}

interface DocumentStats {
  totalCount: number;
  expiringCount: number;
  expiredCount: number;
  expiringSoonCount: number;
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

export interface DashboardAlertsResponse {
  loans: LoanStats;
  documents: DocumentStats;
  vehicles: VehicleStats;
  finance: FinanceStats;
  householdId: string;
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const householdId = searchParams.get('householdId');

    if (!householdId) {
      return NextResponse.json({ error: 'householdId is required' }, { status: 400 });
    }

    // Fetch all data in parallel
    const [
      loansData,
      insurancesResult,
      vehicleDocumentsResult,
      finesResult,
      vehiclesResult,
      dashboardResult,
      overdueRpcResult,
    ] = await Promise.all([
      getLoans(householdId),
      supabase
        .from('insurances')
        .select('id, valid_to, type')
        .eq('household_id', householdId),
      supabase
        .from('vehicle_documents')
        .select('id, valid_to, document_type')
        .eq('household_id', householdId),
      supabase
        .from('fines')
        .select('id, fine_amount, is_paid')
        .eq('household_id', householdId),
      supabase
        .from('vehicle_tco_summary')
        .select('id, current_value, total_loan_balance, stk_expiring_soon, ek_expiring_soon, insurance_expiring_soon')
        .eq('household_id', householdId),
      supabase
        .from('monthly_summaries')
        .select('*')
        .eq('household_id', householdId)
        .order('month', { ascending: false })
        .limit(2),
      supabase.rpc('count_overdue_installments', { p_household_id: householdId }),
    ]);

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + THIRTY_DAYS_MS);

    // Process Loans
    const activeLoans = loansData.filter(l => l.status === 'active');
    const paidOffLoans = loansData.filter(l => l.status === 'paid_off');
    const totalDebt = activeLoans.reduce((sum, l) => sum + parseAmount(l.current_balance), 0);
    const totalPrincipal = loansData.reduce((sum, l) => sum + parseAmount(l.principal), 0);
    const totalPaid = loansData.reduce((sum, l) => sum + parseAmount(l.paid_principal), 0);
    const totalProgress = totalPrincipal > 0 ? (totalPaid / totalPrincipal) * 100 : 0;

    // Calculate monthly payment and interest
    let totalMonthlyPayment = 0;
    let totalInterestPaid = 0;
    let totalInterestRemaining = 0;
    
    for (const loan of loansData) {
      if (loan.next_installment) {
        totalMonthlyPayment += parseAmount(loan.next_installment.total_due);
      }
      // Calculate interest from paid amount - paid principal
      const paidAmount = parseAmount(loan.paid_amount);
      const paidPrincipal = parseAmount(loan.paid_principal);
      totalInterestPaid += Math.max(0, paidAmount - paidPrincipal);
      totalInterestRemaining += parseAmount(loan.total_interest) - Math.max(0, paidAmount - paidPrincipal);
    }

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
    const insurances = insurancesResult.data || [];
    const vehicleDocuments = vehicleDocumentsResult.data || [];
    
    const allDocs: Array<{ type: string; validTo: string }> = [
      ...insurances.map(i => ({ type: 'insurance', validTo: i.valid_to })),
      ...vehicleDocuments.map(d => ({ type: d.document_type, validTo: d.valid_to })),
    ];

    // Count expired documents (validTo < now)
    const expiredDocs = allDocs.filter(doc => {
      const validTo = new Date(doc.validTo);
      return validTo < now;
    });

    // Count documents expiring within 30 days
    const expiringDocs = allDocs.filter(doc => {
      const validTo = new Date(doc.validTo);
      return validTo >= now && validTo <= thirtyDaysFromNow;
    });

    const docsNeedingAttention = [...expiredDocs, ...expiringDocs];

    // Find nearest expiring document
    let nearestExpiring: ExpiringDocument | null = null;
    for (const doc of docsNeedingAttention) {
      const daysUntil = calculateDaysUntil(doc.validTo);
      if (!nearestExpiring || daysUntil < nearestExpiring.daysUntil) {
        nearestExpiring = {
          type: doc.type,
          date: doc.validTo,
          daysUntil,
        };
      }
    }

    // Process Fines
    const fines = finesResult.data || [];
    const unpaidFines = fines.filter(f => !f.is_paid);
    const unpaidFinesTotal = unpaidFines.reduce((sum, f) => sum + parseAmount(f.fine_amount), 0);

    // Process Vehicles
    const vehicles = vehiclesResult.data || [];
    const vehicleStats = {
      totalCount: vehicles.length,
      totalValue: vehicles.reduce((sum, v) => sum + parseAmount(v.current_value), 0),
      loanBalance: vehicles.reduce((sum, v) => sum + parseAmount(v.total_loan_balance), 0),
      expiringDocsCount: vehicles.filter(v => 
        v.stk_expiring_soon || v.ek_expiring_soon || v.insurance_expiring_soon
      ).length,
    };

    // Process Finance
    const summaries = dashboardResult.data || [];
    const currentMonth = summaries[0];
    const previousMonth = summaries[1];

    const financeStats: FinanceStats = {
      netWorth: parseAmount(currentMonth?.net_worth),
      netWorthChange: currentMonth && previousMonth
        ? parseAmount(currentMonth.net_worth) - parseAmount(previousMonth.net_worth)
        : parseAmount(currentMonth?.net_worth_change),
      totalIncome: parseAmount(currentMonth?.total_income),
      totalExpenses: parseAmount(currentMonth?.total_expenses),
      netCashFlow: parseAmount(currentMonth?.total_income) - parseAmount(currentMonth?.total_expenses),
      month: currentMonth?.month || new Date().toLocaleDateString('sk-SK', { year: 'numeric', month: 'long' }),
    };

    const response: DashboardAlertsResponse = {
      loans: {
        totalDebt,
        activeCount: activeLoans.length,
        overdueCount: overdueRpcResult.data || 0,
        nextPayment,
        totalProgress,
        totalPrincipal,
        totalMonthlyPayment,
        totalInterestPaid: Math.max(0, totalInterestPaid),
        totalInterestRemaining: Math.max(0, totalInterestRemaining),
        paidOffCount: paidOffLoans.length,
      },
      documents: {
        totalCount: allDocs.length,
        expiringCount: docsNeedingAttention.length,
        expiredCount: expiredDocs.length,
        expiringSoonCount: expiringDocs.length,
        unpaidFinesCount: unpaidFines.length,
        unpaidFinesTotal,
        nearestExpiring,
      },
      vehicles: vehicleStats,
      finance: financeStats,
      householdId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/dashboard-alerts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
