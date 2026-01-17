import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { refreshLoanMetrics } from '@/lib/api/loans';
import { calculateLoan } from '@finapp/core';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: loanId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get loan
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Verify user is member of household
    const { data: membership } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', loan.household_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete existing schedule
    await supabase.from('loan_schedules').delete().eq('loan_id', loanId);

    // Calculate new schedule
    const schedule = calculateLoan({
      loanType: loan.loan_type,
      principal: Number(loan.principal),
      annualRate: Number(loan.annual_rate),
      termMonths: loan.term_months,
      startDate: new Date(loan.start_date),
      dayCountConvention: loan.day_count_convention,
      feeSetup: Number(loan.fee_setup || 0),
      feeMonthly: Number(loan.fee_monthly || 0),
      insuranceMonthly: Number(loan.insurance_monthly || 0),
      balloonAmount: loan.balloon_amount ? Number(loan.balloon_amount) : undefined,
    });

    // Insert new schedule
    const scheduleData = schedule.schedule.map((entry) => ({
      loan_id: loanId,
      installment_no: entry.installmentNo,
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

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to insert schedule', details: insertError },
        { status: 500 }
      );
    }

    // Refresh loan_metrics materialized view to update balances and overdue counts
    await refreshLoanMetrics();

    return NextResponse.json({
      success: true,
      message: `Generated ${schedule.schedule.length} installments`,
      totalInterest: schedule.totalInterest,
      totalPayment: schedule.totalPayment,
    });
  } catch (error) {
    console.error('Error regenerating schedule:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

