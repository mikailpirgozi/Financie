import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { refreshLoanMetrics } from '@/lib/api/loans';

export const dynamic = 'force-dynamic';

/**
 * Revert a schedule entry to pending and delete any linked payment records.
 * Used when the user accidentally marks an installment as paid.
 *
 * Supports both POST (idempotent mark-as-pending) and DELETE (remove payment record).
 */
async function revertInstallment(loanId: string, scheduleId: string): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify the loan belongs to a household the user is a member of
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

  // Fetch the schedule row
  const { data: schedule, error: scheduleError } = await supabase
    .from('loan_schedules')
    .select('*')
    .eq('id', scheduleId)
    .eq('loan_id', loanId)
    .single();

  if (scheduleError || !schedule) {
    return NextResponse.json({ error: 'Installment not found' }, { status: 404 });
  }

  if (schedule.status !== 'paid') {
    return NextResponse.json({ success: true, alreadyPending: true });
  }

  // Determine if the installment is in the future (→ pending) or past (→ overdue)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(schedule.due_date);
  dueDate.setHours(0, 0, 0, 0);
  const nextStatus = dueDate < today ? 'overdue' : 'pending';

  const { error: updateError } = await supabase
    .from('loan_schedules')
    .update({
      status: nextStatus,
      paid_at: null,
      paid_amount: null,
    })
    .eq('id', scheduleId);

  if (updateError) {
    console.error('Error reverting schedule status:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Delete any payment rows linked to this schedule entry (if such a column exists)
  await supabase.from('payments').delete().eq('loan_id', loanId).eq('schedule_id', scheduleId);

  await refreshLoanMetrics();

  return NextResponse.json({ success: true, status: nextStatus });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  try {
    const { id, scheduleId } = await params;
    return await revertInstallment(id, scheduleId);
  } catch (error) {
    console.error('Error in unpay endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  try {
    const { id, scheduleId } = await params;
    return await revertInstallment(id, scheduleId);
  } catch (error) {
    console.error('Error in unpay endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
