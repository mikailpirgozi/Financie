import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateEarlyRepayment } from '@finapp/core';
import type { EarlyRepaymentInput } from '@finapp/core';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get loan
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', params.id)
      .single();

    if (loanError) throw loanError;
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Get current installment (count paid installments)
    const { data: paidInstallments, error: scheduleError } = await supabase
      .from('loan_schedules')
      .select('installment_no')
      .eq('loan_id', params.id)
      .eq('status', 'paid')
      .order('installment_no', { ascending: false })
      .limit(1);

    if (scheduleError) throw scheduleError;

    const currentInstallment = paidInstallments && paidInstallments.length > 0
      ? paidInstallments[0].installment_no
      : 0;

    // Parse request body
    const body = await request.json();
    const { repaymentAmount, execute = false } = body;

    if (!repaymentAmount || repaymentAmount <= 0) {
      return NextResponse.json(
        { error: 'Valid repayment amount is required' },
        { status: 400 }
      );
    }

    // Prepare early repayment input
    const earlyRepaymentInput: EarlyRepaymentInput = {
      loanType: loan.loan_type,
      principal: Number(loan.principal),
      annualRate: Number(loan.annual_rate),
      termMonths: loan.term_months,
      startDate: new Date(loan.start_date),
      dayCountConvention: loan.day_count_convention,
      feeSetup: Number(loan.fee_setup),
      feeMonthly: Number(loan.fee_monthly),
      insuranceMonthly: Number(loan.insurance_monthly),
      balloonAmount: loan.balloon_amount ? Number(loan.balloon_amount) : undefined,
      currentInstallment: currentInstallment + 1,
      repaymentAmount: Number(repaymentAmount),
      penaltyPct: Number(loan.early_repayment_penalty_pct),
    };

    // Calculate early repayment
    const result = calculateEarlyRepayment(earlyRepaymentInput);

    // If execute flag is true, update the loan
    if (execute) {
      // Delete remaining schedule entries
      const { error: deleteError } = await supabase
        .from('loan_schedules')
        .delete()
        .eq('loan_id', params.id)
        .gt('installment_no', currentInstallment);

      if (deleteError) throw deleteError;

      // If fully paid off, update loan status
      if (result.remainingBalance === 0) {
        const { error: updateError } = await supabase
          .from('loans')
          .update({ status: 'paid_off' })
          .eq('id', params.id);

        if (updateError) throw updateError;
      } else {
        // Insert new schedule
        const scheduleData = result.newSchedule.map((entry) => ({
          loan_id: params.id,
          installment_no: entry.installmentNo + currentInstallment,
          due_date: entry.dueDate.toISOString().split('T')[0],
          principal_due: entry.principalDue,
          interest_due: entry.interestDue,
          fees_due: entry.feesDue,
          total_due: entry.totalDue,
          principal_balance_after: entry.principalBalanceAfter,
          status: entry.status,
        }));

        const { error: insertError } = await supabase
          .from('loan_schedules')
          .insert(scheduleData);

        if (insertError) throw insertError;
      }

      // Record payment
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          household_id: loan.household_id,
          loan_id: params.id,
          date: new Date().toISOString().split('T')[0],
          amount: repaymentAmount,
          meta: {
            type: 'early_repayment',
            penalty: result.penaltyAmount,
            saved: result.totalSaved,
          },
        });

      if (paymentError) throw paymentError;
    }

    return NextResponse.json({
      ...result,
      executed: execute,
    });
  } catch (error) {
    console.error('POST /api/loans/[id]/early-repayment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

