import { NextRequest, NextResponse } from 'next/server';
import { getAssetMetricsSchema } from '@finapp/core';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/assets/[id]/metrics
 * Získa metriky pre majetok - LTV, equity, ROI, cash flow
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assetId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const searchParams = request.nextUrl.searchParams;
    const includeRoi = searchParams.get('includeRoi') !== 'false';
    const roiPeriodMonths = parseInt(searchParams.get('roiPeriodMonths') || '12', 10);

    // Validácia
    const validatedInput = getAssetMetricsSchema.parse({
      assetId,
      includeRoi,
      roiPeriodMonths,
    });

    // Získaj majetok a over prístup
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select(`
        *,
        household_id
      `)
      .eq('id', validatedInput.assetId)
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Verify user has access
    const { data: membership } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', asset.household_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Získaj prepojený úver (ak existuje)
    const { data: linkedLoan } = await supabase
      .from('loans')
      .select('id, lender, principal')
      .eq('linked_asset_id', validatedInput.assetId)
      .eq('status', 'active')
      .single();

    let loanBalance = 0;
    let loanMonthlyPayment = 0;

    if (linkedLoan) {
      // Vypočítaj zostatok úveru
      const { data: schedules } = await supabase
        .from('loan_schedules')
        .select('principal_due, total_due')
        .eq('loan_id', linkedLoan.id)
        .neq('status', 'paid');

      if (schedules && schedules.length > 0) {
        loanBalance = schedules.reduce((sum, s) => sum + Number(s.principal_due), 0);
        
        // Najbližšia mesačná splátka
        const { data: nextPayment } = await supabase
          .from('loan_schedules')
          .select('total_due')
          .eq('loan_id', linkedLoan.id)
          .eq('status', 'pending')
          .gte('due_date', new Date().toISOString().split('T')[0])
          .order('due_date', { ascending: true })
          .limit(1)
          .single();

        if (nextPayment) {
          loanMonthlyPayment = Number(nextPayment.total_due);
        }
      } else {
        // Ak nie sú schedules, použi original principal
        loanBalance = Number(linkedLoan.principal);
      }
    }

    // Vypočítaj LTV a equity metriky
    const assetValue = Number(asset.current_value);
    const ltv = assetValue > 0 ? (loanBalance / assetValue * 100) : 0;
    const equity = Math.max(0, assetValue - loanBalance);

    // Vypočítaj cash flow metriky
    const monthlyIncome = Number(asset.monthly_income || 0);
    const monthlyExpenses = Number(asset.monthly_expenses || 0);
    const netMonthlyCashFlow = monthlyIncome - monthlyExpenses - loanMonthlyPayment;

    const metrics = {
      ltvRatio: Number(ltv.toFixed(2)),
      equity: Number(equity.toFixed(2)),
      netMonthlyCashFlow: Number(netMonthlyCashFlow.toFixed(2)),
    };

    // ROI výpočet (ak je požadovaný)
    let roi = null;
    if (validatedInput.includeRoi) {
      // Zavolaj DB funkciu pre ROI
      const { data: roiData, error: roiError } = await supabase
        .rpc('calculate_asset_roi', {
          p_asset_id: validatedInput.assetId,
          p_period_months: validatedInput.roiPeriodMonths,
        });

      if (!roiError && roiData && roiData.length > 0) {
        const r = roiData[0];
        roi = {
          cashFlowRoi: Number(r.cash_flow_roi || 0),
          appreciationRoi: Number(r.appreciation_roi || 0),
          totalRoi: Number(r.total_roi || 0),
          totalIncome: Number(r.total_income || 0),
          totalExpenses: Number(r.total_expenses || 0),
          netCashFlow: Number(r.net_cash_flow || 0),
          currentValue: Number(r.current_value || 0),
          acquisitionValue: Number(r.acquisition_value || 0),
          valueChange: Number(r.value_change || 0),
        };
      }
    }

    // Získaj najnovšie metriky z histórie (ak existujú)
    const { data: latestMetrics } = await supabase
      .from('asset_loan_metrics')
      .select('*')
      .eq('asset_id', validatedInput.assetId)
      .order('calculation_date', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      assetId: validatedInput.assetId,
      metrics,
      roi,
      linkedLoan: linkedLoan ? {
        id: linkedLoan.id,
        lender: linkedLoan.lender,
        currentBalance: loanBalance,
        monthlyPayment: loanMonthlyPayment,
      } : null,
      historicalMetrics: latestMetrics ? {
        calculationDate: latestMetrics.calculation_date,
        assetValue: Number(latestMetrics.asset_value),
        loanBalance: Number(latestMetrics.loan_balance),
        equity: Number(latestMetrics.equity),
        ltvRatio: Number(latestMetrics.ltv_ratio),
      } : null,
    });
  } catch (error) {
    console.error('GET /api/assets/[id]/metrics error:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

