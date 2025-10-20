import { NextRequest, NextResponse } from 'next/server';
import { payLoanSchema } from '@finapp/core';
import { payLoan } from '@/lib/api/loans';
import { createClient } from '@/lib/supabase/server';

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

    const body = await request.json();
    
    // Validate input
    const validatedInput = payLoanSchema.parse({
      loanId: params.id,
      amount: body.amount,
      date: new Date(body.date),
    });

    const result = await payLoan(
      validatedInput.loanId,
      validatedInput.amount,
      validatedInput.date
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/loans/[id]/pay error:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

