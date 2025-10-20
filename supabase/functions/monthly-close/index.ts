import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface MonthlySummaryData {
  household_id: string;
  month: string;
  incomes_total: number;
  expenses_total: number;
  loan_principal_paid: number;
  loan_interest_paid: number;
  loan_fees_paid: number;
  loans_balance: number;
  net_worth: number;
}

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get current month (YYYY-MM)
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get all households
    const { data: households, error: householdsError } = await supabaseClient
      .from('households')
      .select('id');

    if (householdsError) throw householdsError;

    const summaries: MonthlySummaryData[] = [];

    for (const household of households ?? []) {
      // Calculate incomes total
      const { data: incomes } = await supabaseClient
        .from('incomes')
        .select('amount')
        .eq('household_id', household.id)
        .gte('date', `${month}-01`)
        .lt('date', getNextMonth(month));

      const incomesTotal = incomes?.reduce((sum, i) => sum + Number(i.amount), 0) ?? 0;

      // Calculate expenses total
      const { data: expenses } = await supabaseClient
        .from('expenses')
        .select('amount')
        .eq('household_id', household.id)
        .gte('date', `${month}-01`)
        .lt('date', getNextMonth(month));

      const expensesTotal = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;

      // Calculate loan payments
      const { data: loanPayments } = await supabaseClient
        .from('payments')
        .select('amount, meta')
        .eq('household_id', household.id)
        .not('loan_id', 'is', null)
        .gte('date', `${month}-01`)
        .lt('date', getNextMonth(month));

      let loanPrincipalPaid = 0;
      let loanInterestPaid = 0;
      let loanFeesPaid = 0;

      for (const payment of loanPayments ?? []) {
        const meta = payment.meta as { principal?: number; interest?: number; fees?: number } | null;
        loanPrincipalPaid += meta?.principal ?? 0;
        loanInterestPaid += meta?.interest ?? 0;
        loanFeesPaid += meta?.fees ?? 0;
      }

      // Calculate total loans balance
      const { data: loans } = await supabaseClient
        .from('loans')
        .select('id')
        .eq('household_id', household.id)
        .eq('status', 'active');

      let loansBalance = 0;

      for (const loan of loans ?? []) {
        const { data: schedules } = await supabaseClient
          .from('loan_schedules')
          .select('principal_balance_after')
          .eq('loan_id', loan.id)
          .eq('status', 'pending')
          .order('installment_no', { ascending: true })
          .limit(1);

        if (schedules && schedules.length > 0) {
          loansBalance += Number(schedules[0].principal_balance_after);
        }
      }

      // Calculate net worth (assets - loans)
      const { data: assets } = await supabaseClient
        .from('assets')
        .select('current_value')
        .eq('household_id', household.id);

      const assetsTotal = assets?.reduce((sum, a) => sum + Number(a.current_value), 0) ?? 0;
      const netWorth = assetsTotal - loansBalance;

      summaries.push({
        household_id: household.id,
        month,
        incomes_total: incomesTotal,
        expenses_total: expensesTotal,
        loan_principal_paid: loanPrincipalPaid,
        loan_interest_paid: loanInterestPaid,
        loan_fees_paid: loanFeesPaid,
        loans_balance: loansBalance,
        net_worth: netWorth,
      });
    }

    // Upsert monthly summaries
    const { error: upsertError } = await supabaseClient
      .from('monthly_summaries')
      .upsert(summaries, {
        onConflict: 'household_id,month',
      });

    if (upsertError) throw upsertError;

    // Mark overdue loan schedules
    const { error: updateError } = await supabaseClient
      .from('loan_schedules')
      .update({ status: 'overdue' })
      .eq('status', 'pending')
      .lt('due_date', now.toISOString().split('T')[0]);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Monthly close completed for ${summaries.length} households`,
        month,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function getNextMonth(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  if (!year || !monthNum) return month;
  
  const date = new Date(year, monthNum, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

