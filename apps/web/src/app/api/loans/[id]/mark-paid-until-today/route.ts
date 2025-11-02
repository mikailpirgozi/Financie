import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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

    const { date } = await request.json();

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    // Verify user has access to this loan
    const { data: loan } = await supabase
      .from('loans')
      .select('household_id')
      .eq('id', params.id)
      .single();

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', loan.household_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Mark all pending and overdue installments with due_date <= date as paid
    const { data, error } = await supabase
      .from('loan_schedules')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('loan_id', params.id)
      .in('status', ['pending', 'overdue'])
      .lte('due_date', date)
      .select();

    if (error) {
      console.error('Error marking installments as paid:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      count: data?.length || 0 
    });
  } catch (error) {
    console.error('Error in mark-paid-until-today:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

