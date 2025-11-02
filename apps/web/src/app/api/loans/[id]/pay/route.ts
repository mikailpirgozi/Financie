import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const paymentSchema = z.object({
  installmentId: z.string().uuid(),
  amount: z.number().positive(),
  date: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loanId = params.id;
    const body = await req.json();
    const { installmentId, amount, date } = paymentSchema.parse(body);

    // Get loan
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('household_id')
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

    // Get installment
    const { data: installment, error: installmentError } = await supabase
      .from('loan_schedules')
      .select('*')
      .eq('id', installmentId)
      .eq('loan_id', loanId)
      .single();

    if (installmentError || !installment) {
      return NextResponse.json({ error: 'Installment not found' }, { status: 404 });
    }

    if (installment.status === 'paid') {
      return NextResponse.json({ error: 'Installment already paid' }, { status: 400 });
    }

    // Check if payment covers installment
    if (amount < Number(installment.total_due)) {
      return NextResponse.json(
        {
          error: 'Payment amount is less than installment total',
          required: Number(installment.total_due),
          provided: amount,
        },
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
      return NextResponse.json(
        { error: 'Failed to update installment', details: updateError },
        { status: 500 }
      );
    }

    // Get or create loan payment category
    let { data: loanCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('household_id', loan.household_id)
      .eq('kind', 'expense')
      .eq('name', 'Splátky úverov')
      .single();

    if (!loanCategory) {
      const { data: newCategory } = await supabase
        .from('categories')
        .insert({
          household_id: loan.household_id,
          kind: 'expense',
          name: 'Splátky úverov',
        })
        .select()
        .single();
      loanCategory = newCategory;
    }

    // Record payment as expense
    const paymentDate = date ? new Date(date) : new Date();
    const { data: payment, error: paymentError } = await supabase
      .from('expenses')
      .insert({
        household_id: loan.household_id,
        date: paymentDate.toISOString().split('T')[0],
        amount: amount,
        category_id: loanCategory?.id ?? null,
        merchant: `Splátka úveru #${installment.installment_no}`,
        note: JSON.stringify({
          loan_id: loanId,
          installment_id: installmentId,
          principal: Number(installment.principal_due),
          interest: Number(installment.interest_due),
          fees: Number(installment.fees_due),
        }),
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Failed to record payment as expense:', paymentError);
      // Don't fail the whole operation, just log
    }

    return NextResponse.json({
      success: true,
      message: 'Payment recorded successfully',
      installment: {
        ...installment,
        status: 'paid',
        paid_at: new Date().toISOString(),
      },
      payment,
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
