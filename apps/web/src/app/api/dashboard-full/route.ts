import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMonthlySummaries } from '@/lib/api/summaries';

export const dynamic = 'force-dynamic';
export const revalidate = 30; // Cache for 30 seconds

interface MonthlySummaryData {
  month: string;
  total_income?: number | string;
  total_expenses?: number | string;
  loan_balance_remaining?: number;
  total_assets?: number;
  net_worth?: number;
  loan_payments_total?: number | string;
  loan_principal_paid?: number | string;
  loan_interest_paid?: number | string;
  loan_fees_paid?: number | string;
  net_worth_change?: number | string;
}

/**
 * 🚀 OPTIMALIZOVANÝ ENDPOINT: dashboard-full
 * 
 * Vráti všetky dashboard data v jednom requeste:
 * - Household info
 * - Dashboard KPI data (current + history)
 * - Overdue installments count
 * - Recent transactions (optional)
 * 
 * Výhody:
 * - 1 HTTP request namiesto 3-4
 * - Paralelné DB queries
 * - Response caching (30s)
 * - Optimalizované pre mobile
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const monthsCount = parseInt(searchParams.get('monthsCount') || '6', 10);
    const includeRecent = searchParams.get('includeRecent') === 'true';

    // 1. Get household info
    const { data: membership, error: membershipError } = await supabase
      .from('household_members')
      .select('household_id, households(id, name, created_at)')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'No household found for user' },
        { status: 404 }
      );
    }

    // Handle both array and direct object formats
    type HouseholdData = { id: string; name: string; created_at: string };
    const householdData: HouseholdData = Array.isArray(membership.households)
      ? membership.households[0]
      : (membership.households as HouseholdData);
    
    if (!householdData || !householdData.id) {
      return NextResponse.json(
        { error: 'No household found for user' },
        { status: 404 }
      );
    }
    
    const householdId = householdData.id;

    // 2. Paralelne načítaj všetky potrebné dáta
    const [summariesData, overdueResult, recentTransactions] = await Promise.all([
      // 🚀 OPTIMALIZOVANÉ: Dashboard summaries z materialized view (ak existuje)
      supabase
        .rpc('get_household_dashboard_summary', { 
          p_household_id: householdId,
          p_months_count: monthsCount 
        })
        .then(({ data, error }) => {
          if (error || !data || data.length === 0) {
            // Fallback na monthly_summaries table
            return getMonthlySummaries(householdId).catch(() => []);
          }
          return data;
        }),
      
      // Overdue count
      supabase
        .rpc('count_overdue_installments', { p_household_id: householdId })
        .then(({ data, error }) => (error ? 0 : data ?? 0)),
      
      // Recent transactions (optional)
      includeRecent
        ? supabase
            .from('expenses')
            .select('id, date, amount, merchant')
            .eq('household_id', householdId)
            .order('date', { ascending: false })
            .limit(10)
            .then(({ data }) => data ?? [])
        : Promise.resolve([]),
    ]);

    // 3. Ak nie sú summaries, vytvoriť dynamicky (fallback)
    let summaries = summariesData;
    if (!summaries || summaries.length === 0) {
      console.log('⚠️ No summaries from materialized view, calculating dynamically...');
      summaries = await calculateDashboardDataDynamic(supabase, householdId, monthsCount);
    }

    // 4. Formátuj response
    const history = summaries.slice(1, monthsCount).map((summary: MonthlySummaryData) => ({
      month: summary.month,
      totalIncome: summary.total_income?.toString() ?? '0',
      totalExpenses: summary.total_expenses?.toString() ?? '0',
      netCashFlow: (
        parseFloat(String(summary.total_income ?? 0)) -
        parseFloat(String(summary.total_expenses ?? 0))
      ).toString(),
      loanPaymentsTotal: summary.loan_payments_total?.toString() ?? '0',
      loanPrincipalPaid: summary.loan_principal_paid?.toString() ?? '0',
      loanInterestPaid: summary.loan_interest_paid?.toString() ?? '0',
      loanFeesPaid: summary.loan_fees_paid?.toString() ?? '0',
      loanBalanceRemaining: summary.loan_balance_remaining?.toString() ?? '0',
      totalAssets: summary.total_assets?.toString() ?? '0',
      netWorth: summary.net_worth?.toString() ?? '0',
      netWorthChange: summary.net_worth_change?.toString() ?? '0',
    }));

    const currentMonth = summaries.length > 0 ? summaries[0] : null;

    const response = {
      household: {
        id: household.id,
        name: household.name,
        created_at: household.created_at,
      },
      dashboard: {
        currentMonth: currentMonth
          ? {
              month: currentMonth.month,
              totalIncome: currentMonth.total_income?.toString() ?? '0',
              totalExpenses: currentMonth.total_expenses?.toString() ?? '0',
              netCashFlow: (
                parseFloat(String(currentMonth.total_income ?? 0)) -
                parseFloat(String(currentMonth.total_expenses ?? 0))
              ).toString(),
              loanPaymentsTotal: currentMonth.loan_payments_total?.toString() ?? '0',
              loanPrincipalPaid: currentMonth.loan_principal_paid?.toString() ?? '0',
              loanInterestPaid: currentMonth.loan_interest_paid?.toString() ?? '0',
              loanFeesPaid: currentMonth.loan_fees_paid?.toString() ?? '0',
              loanBalanceRemaining: currentMonth.loan_balance_remaining?.toString() ?? '0',
              totalAssets: currentMonth.total_assets?.toString() ?? '0',
              netWorth: currentMonth.net_worth?.toString() ?? '0',
              netWorthChange: currentMonth.net_worth_change?.toString() ?? '0',
            }
          : null,
        history,
      },
      overdueCount: overdueResult,
      recentTransactions: includeRecent ? recentTransactions : undefined,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('GET /api/dashboard-full error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Pomocná funkcia: dynamické kalkulovanie dashboard dát
 */
async function calculateDashboardDataDynamic(
  supabaseClient: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  monthsCount: number
): Promise<MonthlySummaryData[]> {
  const now = new Date();
  const months: string[] = [];
  
  for (let i = 0; i < monthsCount; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }

  // Paralelné queries pre všetky potrebné dáta
  const [incomesResult, expensesResult, metricsResult, assetsResult] =
    await Promise.all([
      supabaseClient
        .from('incomes')
        .select('date, amount')
        .eq('household_id', householdId)
        .gte('date', `${months[months.length - 1]}-01`)
        .lte('date', `${months[0]}-31`),
      
      supabaseClient
        .from('expenses')
        .select('date, amount')
        .eq('household_id', householdId)
        .gte('date', `${months[months.length - 1]}-01`)
        .lte('date', `${months[0]}-31`),
      
      supabaseClient.from('loan_metrics').select('*'),
      
      supabaseClient
        .from('assets')
        .select('current_value')
        .eq('household_id', householdId),
    ]);

  const incomes = incomesResult.data || [];
  const expenses = expensesResult.data || [];
  const metrics = metricsResult.data || [];
  const assets = assetsResult.data || [];

  const summaryByMonth = months.map((month) => {
    const monthStart = `${month}-01`;
    const monthEnd = `${month}-31`;

    interface IncomeRecord { date: string; amount: number }
    interface ExpenseRecord { date: string; amount: number }
    interface MetricRecord { current_balance?: number }
    interface AssetRecord { current_value: number }

    const monthIncomes = (incomes as IncomeRecord[]).filter(
      (i: IncomeRecord) => i.date >= monthStart && i.date <= monthEnd
    );
    const monthExpenses = (expenses as ExpenseRecord[]).filter(
      (e: ExpenseRecord) => e.date >= monthStart && e.date <= monthEnd
    );

    const totalIncome = monthIncomes.reduce(
      (sum: number, i: IncomeRecord) => sum + parseFloat(String(i.amount)),
      0
    );
    const totalExpenses = monthExpenses.reduce(
      (sum: number, e: ExpenseRecord) => sum + parseFloat(String(e.amount)),
      0
    );

    const loanBalanceRemaining = (metrics as MetricRecord[]).reduce(
      (sum: number, m: MetricRecord) => sum + parseFloat(String(m.current_balance ?? 0)),
      0
    );
    const totalAssets = (assets as AssetRecord[]).reduce(
      (sum: number, a: AssetRecord) => sum + parseFloat(String(a.current_value)),
      0
    );

    return {
      month,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      loan_balance_remaining: loanBalanceRemaining,
      total_assets: totalAssets,
      net_worth: totalAssets - loanBalanceRemaining,
      loan_payments_total: 0,
      loan_principal_paid: 0,
      loan_interest_paid: 0,
      loan_fees_paid: 0,
      net_worth_change: 0,
    } as MonthlySummaryData;
  });

  return summaryByMonth;
}

