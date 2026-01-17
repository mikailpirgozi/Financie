import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { refreshLoanMetrics } from '@/lib/api/loans';

export const dynamic = 'force-dynamic';

/**
 * Mark a single installment as paid without recording a payment
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; installmentId: string }> }
) {
  try {
    const { id: loanId, installmentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this loan
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('household_id')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', loan.household_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify installment exists and belongs to this loan
    const { data: installment, error: installmentError } = await supabase
      .from('loan_schedules')
      .select('*')
      .eq('id', installmentId)
      .eq('loan_id', loanId)
      .single();

    if (installmentError || !installment) {
      return NextResponse.json(
        { error: 'Installment not found' },
        { status: 404 }
      );
    }

    if (installment.status === 'paid') {
      return NextResponse.json(
        { error: 'Installment already paid' },
        { status: 400 }
      );
    }

    // Mark installment as paid
    const { error: updateError } = await supabase
      .from('loan_schedules')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', installmentId);

    if (updateError) {
      console.error('Error marking installment as paid:', updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Refresh loan_metrics materialized view to update balances and overdue counts
    await refreshLoanMetrics();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in mark-paid:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

