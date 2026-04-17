import { type NextRequest, NextResponse } from 'next/server';
import {
  createRecurringTransactionSchema,
  type CreateRecurringTransactionInput,
} from '@finapp/core';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const householdId = request.nextUrl.searchParams.get('householdId');
    if (!householdId) {
      return NextResponse.json({ error: 'householdId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('household_id', householdId)
      .order('next_run_date', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ recurring: data ?? [] });
  } catch (error) {
    console.error('GET /api/recurring error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const input: CreateRecurringTransactionInput = createRecurringTransactionSchema.parse({
      ...body,
      startDate: body.startDate ? new Date(body.startDate as string) : undefined,
      endDate: body.endDate ? new Date(body.endDate as string) : undefined,
    });

    const { data, error } = await supabase
      .from('recurring_transactions')
      .insert({
        household_id: input.householdId,
        kind: input.kind,
        category_id: input.categoryId,
        amount: input.amount,
        currency: input.currency,
        frequency: input.frequency,
        start_date: input.startDate.toISOString().slice(0, 10),
        end_date: input.endDate ? input.endDate.toISOString().slice(0, 10) : null,
        next_run_date: input.startDate.toISOString().slice(0, 10),
        merchant: input.merchant ?? null,
        source: input.source ?? null,
        note: input.note ?? null,
        is_active: input.isActive,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ recurring: data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/recurring error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
