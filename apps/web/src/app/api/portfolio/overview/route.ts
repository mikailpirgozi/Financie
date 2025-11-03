import { NextRequest, NextResponse } from 'next/server';
import { getPortfolioOverviewSchema } from '@finapp/core';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/portfolio/overview
 * Získa agregovaný prehľad portfólia - majetky, úvery, cash flow, net worth
 */
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

    // Validácia
    const validatedInput = getPortfolioOverviewSchema.parse({ householdId });

    // Verify user has access to household
    const { data: membership } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', validatedInput.householdId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Získaj portfolio overview z view
    const { data: overview, error: overviewError } = await supabase
      .from('v_portfolio_overview')
      .select('*')
      .eq('household_id', validatedInput.householdId)
      .single();

    if (overviewError) {
      console.error('Portfolio overview error:', overviewError);
      return NextResponse.json(
        { error: 'Failed to fetch portfolio overview' },
        { status: 500 }
      );
    }

    // Formátuj response
    const portfolioData = {
      householdId: overview.household_id,
      
      // Assets
      totalAssetsValue: Number(overview.total_assets_value || 0),
      productiveAssetsValue: Number(overview.productive_assets_value || 0),
      nonProductiveAssetsValue: Number(overview.non_productive_assets_value || 0),
      totalAssetsCount: Number(overview.total_assets_count || 0),
      productiveAssetsCount: Number(overview.productive_assets_count || 0),
      
      // Cash flow
      monthlyIncomeFromAssets: Number(overview.monthly_income_from_assets || 0),
      monthlyExpensesFromAssets: Number(overview.monthly_expenses_from_assets || 0),
      netCashFlowFromAssets: Number(overview.net_cash_flow_from_assets || 0),
      
      // Loans
      totalLoansCount: Number(overview.total_loans_count || 0),
      totalOriginalPrincipal: Number(overview.total_original_principal || 0),
      totalDebt: Number(overview.total_debt || 0),
      nextMonthLoanPayment: Number(overview.next_month_loan_payment || 0),
      
      // Portfolio metrics
      netWorth: Number(overview.net_worth || 0),
      debtToAssetRatio: Number(overview.debt_to_asset_ratio || 0),
      totalMonthlyCashFlow: Number(overview.total_monthly_cash_flow || 0),
    };

    return NextResponse.json({ portfolio: portfolioData });
  } catch (error) {
    console.error('GET /api/portfolio/overview error:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

