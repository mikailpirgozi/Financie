import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dashboardQuerySchema, type DashboardData, type MonthlyDashboardData } from '@finapp/core';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('Dashboard API: No user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const householdId = searchParams.get('householdId');
    const monthsCount = searchParams.get('monthsCount');

    console.log('Dashboard API request:', { householdId, monthsCount, userId: user.id });

    if (!householdId) {
      return NextResponse.json({ error: 'householdId is required' }, { status: 400 });
    }

    // Validate query parameters
    const validatedQuery = dashboardQuerySchema.parse({
      householdId,
      monthsCount: monthsCount ? parseInt(monthsCount, 10) : 12,
    });

    console.log('Calling get_dashboard_data with:', validatedQuery);

    // Call the database function
    const { data, error } = await supabase.rpc('get_dashboard_data', {
      p_household_id: validatedQuery.householdId,
      p_months_count: validatedQuery.monthsCount,
    });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Dashboard data received:', data ? `${data.length} months` : 'null');

    if (!data || data.length === 0) {
      return NextResponse.json({
        currentMonth: createEmptyMonthData(new Date().toISOString().slice(0, 7)),
        history: [],
      } as DashboardData);
    }

    // Transform database response to API format
    const transformedData: MonthlyDashboardData[] = data.map((row: {
      month: string;
      total_income: string;
      total_expenses: string;
      net_cash_flow: string;
      loan_payments_total: string;
      loan_principal_paid: string;
      loan_interest_paid: string;
      loan_fees_paid: string;
      loan_balance_remaining: string;
      total_assets: string;
      net_worth: string;
      net_worth_change: string;
    }) => ({
      month: row.month,
      totalIncome: row.total_income,
      totalExpenses: row.total_expenses,
      netCashFlow: row.net_cash_flow,
      loanPaymentsTotal: row.loan_payments_total,
      loanPrincipalPaid: row.loan_principal_paid,
      loanInterestPaid: row.loan_interest_paid,
      loanFeesPaid: row.loan_fees_paid,
      loanBalanceRemaining: row.loan_balance_remaining,
      totalAssets: row.total_assets,
      netWorth: row.net_worth,
      netWorthChange: row.net_worth_change,
    }));

    // Sort by month descending (newest first)
    transformedData.sort((a, b) => b.month.localeCompare(a.month));

    const response: DashboardData = {
      currentMonth: transformedData[0],
      history: transformedData,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/dashboard error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

function createEmptyMonthData(month: string): MonthlyDashboardData {
  return {
    month,
    totalIncome: '0.00',
    totalExpenses: '0.00',
    netCashFlow: '0.00',
    loanPaymentsTotal: '0.00',
    loanPrincipalPaid: '0.00',
    loanInterestPaid: '0.00',
    loanFeesPaid: '0.00',
    loanBalanceRemaining: '0.00',
    totalAssets: '0.00',
    netWorth: '0.00',
    netWorthChange: '0.00',
  };
}

