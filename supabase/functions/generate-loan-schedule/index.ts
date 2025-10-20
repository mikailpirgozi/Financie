import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Note: In production, import loan engine from @finapp/core
// For Edge Functions, we'll need to bundle or inline the logic

serve(async (req) => {
  try {
    const { loanId } = await req.json();

    if (!loanId) {
      return new Response(
        JSON.stringify({ success: false, error: 'loanId is required' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get loan details
    const { data: loan, error: loanError } = await supabaseClient
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (loanError) throw loanError;
    if (!loan) throw new Error('Loan not found');

    // Calculate schedule (simplified version - use @finapp/core in production)
    const schedule = calculateLoanSchedule(loan);

    // Delete existing schedule
    await supabaseClient
      .from('loan_schedules')
      .delete()
      .eq('loan_id', loanId);

    // Insert new schedule
    const { error: insertError } = await supabaseClient
      .from('loan_schedules')
      .insert(schedule);

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${schedule.length} installments for loan ${loanId}`,
        schedule,
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

// Simplified loan schedule calculation
// In production, use the full @finapp/core loan engine
function calculateLoanSchedule(loan: Record<string, unknown>) {
  const principal = Number(loan.principal);
  const annualRate = Number(loan.annual_rate);
  const termMonths = Number(loan.term_months);
  const startDate = new Date(loan.start_date as string);
  const feeMonthly = Number(loan.fee_monthly ?? 0);
  const insuranceMonthly = Number(loan.insurance_monthly ?? 0);

  const monthlyRate = annualRate / 100 / 12;
  const schedule = [];

  let balance = principal;

  for (let i = 1; i <= termMonths; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    const interestDue = balance * monthlyRate;
    const principalDue = principal / termMonths;
    const feesDue = feeMonthly + insuranceMonthly;
    const totalDue = principalDue + interestDue + feesDue;

    balance -= principalDue;

    schedule.push({
      loan_id: loan.id,
      installment_no: i,
      due_date: dueDate.toISOString().split('T')[0],
      principal_due: Math.round(principalDue * 100) / 100,
      interest_due: Math.round(interestDue * 100) / 100,
      fees_due: Math.round(feesDue * 100) / 100,
      total_due: Math.round(totalDue * 100) / 100,
      principal_balance_after: Math.round(Math.max(0, balance) * 100) / 100,
      status: 'pending',
    });
  }

  return schedule;
}

