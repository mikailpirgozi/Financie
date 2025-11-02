import { NextRequest, NextResponse } from 'next/server';
import { getMonthlySummaries } from '@/lib/api/summaries';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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
 * Calculate dashboard data dynamically from transactions
 */
async function calculateDashboardData(householdId: string, monthsCount: number) {
  const supabase = await createClient();
  
  // Get current date for month calculations
  const now = new Date();
  
  // Calculate month range
  const months: string[] = [];
  for (let i = 0; i < monthsCount; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }

  // Get incomes for all months
  const { data: incomes } = await supabase
    .from('incomes')
    .select('date, amount')
    .eq('household_id', householdId)
    .gte('date', `${months[months.length - 1]}-01`)
    .lte('date', `${months[0]}-31`);

  // Get expenses for all months
  const { data: expenses } = await supabase
    .from('expenses')
    .select('date, amount')
    .eq('household_id', householdId)
    .gte('date', `${months[months.length - 1]}-01`)
    .lte('date', `${months[0]}-31`);

  // Get loans and compute remaining balance
  const { data: loans } = await supabase
    .from('loans')
    .select('id, principal, status')
    .eq('household_id', householdId);

  const { data: metrics } = await supabase
    .from('loan_metrics')
    .select('*')
    .in('loan_id', loans?.map(l => l.id) || []);

  // Get assets
  const { data: assets } = await supabase
    .from('assets')
    .select('current_value')
    .eq('household_id', householdId);

  // Calculate monthly summaries
  const summaryByMonth = new Map<string, MonthlySummaryData>();
  
  months.forEach(month => {
    const monthStart = `${month}-01`;
    const monthEnd = `${month}-31`;
    
    const monthIncomes = incomes?.filter(i => i.date >= monthStart && i.date <= monthEnd) || [];
    const monthExpenses = expenses?.filter(e => e.date >= monthStart && e.date <= monthEnd) || [];
    
    const totalIncome = monthIncomes.reduce((sum, i) => sum + parseFloat(String(i.amount)), 0);
    const totalExpenses = monthExpenses.reduce((sum, e) => sum + parseFloat(String(e.amount)), 0);
    
    const loanBalanceRemaining = metrics?.reduce((sum, m) => sum + parseFloat(String(m.current_balance ?? 0)), 0) ?? 0;
    const totalAssets = assets?.reduce((sum, a) => sum + parseFloat(String(a.current_value)), 0) ?? 0;
    
    summaryByMonth.set(month, {
      month,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      loan_balance_remaining: loanBalanceRemaining,
      total_assets: totalAssets,
      net_worth: totalAssets - loanBalanceRemaining,
    });
  });

  return Array.from(summaryByMonth.values());
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
    const monthsCountStr = searchParams.get('monthsCount') || '12';
    const monthsCount = parseInt(monthsCountStr, 10);

    if (!householdId) {
      return NextResponse.json({ error: 'householdId is required' }, { status: 400 });
    }

    if (isNaN(monthsCount) || monthsCount < 1) {
      return NextResponse.json({ error: 'monthsCount must be a positive number' }, { status: 400 });
    }

    // Try to get summaries from monthly_summaries table first
    let summaries = await getMonthlySummaries(householdId);
    
    // If no summaries, calculate dynamically
    if (!summaries || summaries.length === 0) {
      console.log('📊 No monthly_summaries found, calculating dynamically...');
      summaries = await calculateDashboardData(householdId, monthsCount);
    }

    // Format summaries for mobile app
    // Take the first monthsCount items (already sorted descending by month)
    const history = summaries.slice(1, monthsCount).map((summary: MonthlySummaryData) => ({
      month: summary.month,
      totalIncome: summary.total_income?.toString() ?? '0',
      totalExpenses: summary.total_expenses?.toString() ?? '0',
      netCashFlow: (parseFloat(String(summary.total_income ?? 0)) - parseFloat(String(summary.total_expenses ?? 0))).toString(),
      loanPaymentsTotal: summary.loan_payments_total?.toString() ?? '0',
      loanPrincipalPaid: summary.loan_principal_paid?.toString() ?? '0',
      loanInterestPaid: summary.loan_interest_paid?.toString() ?? '0',
      loanFeesPaid: summary.loan_fees_paid?.toString() ?? '0',
      loanBalanceRemaining: summary.loan_balance_remaining?.toString() ?? '0',
      totalAssets: summary.total_assets?.toString() ?? '0',
      netWorth: summary.net_worth?.toString() ?? '0',
      netWorthChange: summary.net_worth_change?.toString() ?? '0',
    }));

    // Current month is the first one
    const currentMonth = summaries.length > 0 ? summaries[0] : null;
    if (!currentMonth) {
      return NextResponse.json({
        currentMonth: {
          month: new Date().toLocaleDateString('sk-SK', { year: 'numeric', month: 'long' }),
          totalIncome: '0',
          totalExpenses: '0',
          netCashFlow: '0',
          loanPaymentsTotal: '0',
          loanPrincipalPaid: '0',
          loanInterestPaid: '0',
          loanFeesPaid: '0',
          loanBalanceRemaining: '0',
          totalAssets: '0',
          netWorth: '0',
          netWorthChange: '0',
        },
        history,
      });
    }

    return NextResponse.json({
      currentMonth: {
        month: currentMonth.month,
        totalIncome: currentMonth.total_income?.toString() ?? '0',
        totalExpenses: currentMonth.total_expenses?.toString() ?? '0',
        netCashFlow: (parseFloat(String(currentMonth.total_income ?? 0)) - parseFloat(String(currentMonth.total_expenses ?? 0))).toString(),
        loanPaymentsTotal: currentMonth.loan_payments_total?.toString() ?? '0',
        loanPrincipalPaid: currentMonth.loan_principal_paid?.toString() ?? '0',
        loanInterestPaid: currentMonth.loan_interest_paid?.toString() ?? '0',
        loanFeesPaid: currentMonth.loan_fees_paid?.toString() ?? '0',
        loanBalanceRemaining: currentMonth.loan_balance_remaining?.toString() ?? '0',
        totalAssets: currentMonth.total_assets?.toString() ?? '0',
        netWorth: currentMonth.net_worth?.toString() ?? '0',
        netWorthChange: currentMonth.net_worth_change?.toString() ?? '0',
      },
      history,
    });
  } catch (error) {
    console.error('GET /api/dashboard error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

