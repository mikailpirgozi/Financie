import { NextRequest, NextResponse } from 'next/server';
import { createLoanSchema } from '@finapp/core';
import { createLoan, getLoans } from '@/lib/api/loans';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/logger';
import { checkSubscriptionLimits } from '@/lib/stripe/subscriptions';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const householdId = searchParams.get('householdId');

    if (!householdId) {
      return NextResponse.json({ error: 'householdId is required' }, { status: 400 });
    }

    const loans = await getLoans(householdId);

    return NextResponse.json({ loans });
  } catch (error) {
    console.error('GET /api/loans error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate input
    const validatedInput = createLoanSchema.parse({
      ...body,
      startDate: new Date(body.startDate),
    });

    // Check subscription limits
    const limitsCheck = await checkSubscriptionLimits(user.id, 'loans');
    if (!limitsCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Subscription limit reached',
          message: `You have reached the maximum number of loans (${limitsCheck.limit}) for your plan. Please upgrade to create more loans.`,
          current: limitsCheck.current,
          limit: limitsCheck.limit,
        },
        { status: 403 }
      );
    }

    const result = await createLoan(validatedInput);

    // Log audit
    await logAudit({
      householdId: validatedInput.householdId,
      userId: user.id,
      action: 'create',
      entityType: 'loan',
      entityId: result.loan.id,
      changes: {
        new_value: validatedInput,
      },
      request,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('POST /api/loans error:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

