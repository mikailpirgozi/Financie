import { type NextRequest, NextResponse } from 'next/server';
import {
  forecastCashflow,
  type ForecastInput,
  type ForecastLoanInstallment,
  type ForecastRecurringItem,
} from '@finapp/core';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const householdId = params.get('householdId');
    const monthsCount = Number(params.get('monthsCount') ?? '12');
    const openingBalance = Number(params.get('openingBalance') ?? '0');

    if (!householdId) {
      return NextResponse.json({ error: 'householdId is required' }, { status: 400 });
    }

    const startMonth = params.get('startMonth') ?? currentMonthKey();
    const horizonEnd = new Date();
    horizonEnd.setUTCMonth(horizonEnd.getUTCMonth() + monthsCount + 1);
    const horizonEndIso = horizonEnd.toISOString().slice(0, 10);
    const horizonStartIso = `${startMonth}-01`;

    // Loan installments due in horizon, joined via household.
    const { data: loanRows, error: loanErr } = await supabase
      .from('loan_schedules')
      .select('due_date,total_due,loans!inner(household_id,status)')
      .eq('loans.household_id', householdId)
      .eq('loans.status', 'active')
      .gte('due_date', horizonStartIso)
      .lte('due_date', horizonEndIso);

    if (loanErr) throw loanErr;

    const loanInstallments: ForecastLoanInstallment[] = (loanRows ?? []).map((r) => ({
      dueDate: (r as { due_date: string }).due_date,
      totalDue: Number((r as { total_due: number | string }).total_due),
    }));

    const { data: recurringRows, error: recErr } = await supabase
      .from('recurring_transactions')
      .select('kind,amount,frequency,start_date,end_date,next_run_date,is_active')
      .eq('household_id', householdId)
      .eq('is_active', true);

    if (recErr) throw recErr;

    const recurring: ForecastRecurringItem[] = (recurringRows ?? []).map((r) => ({
      kind: (r as { kind: 'expense' | 'income' }).kind,
      amount: Number((r as { amount: number | string }).amount),
      frequency: (r as { frequency: ForecastRecurringItem['frequency'] }).frequency,
      startDate:
        (r as { next_run_date: string }).next_run_date ?? (r as { start_date: string }).start_date,
      endDate: (r as { end_date: string | null }).end_date,
    }));

    const input: ForecastInput = {
      startMonth,
      monthsCount,
      openingBalance,
      loanInstallments,
      recurring,
    };

    const result = forecastCashflow(input);
    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/forecast/cashflow error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
