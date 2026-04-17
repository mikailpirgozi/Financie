import { type NextRequest, NextResponse } from 'next/server';
import { updateRecurringTransactionSchema } from '@finapp/core';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const input = updateRecurringTransactionSchema.parse({
      ...body,
      endDate: body.endDate ? new Date(body.endDate as string) : body.endDate,
    });

    const update: Record<string, unknown> = {};
    if (input.amount !== undefined) update.amount = input.amount;
    if (input.categoryId !== undefined) update.category_id = input.categoryId;
    if (input.frequency !== undefined) update.frequency = input.frequency;
    if (input.endDate !== undefined) {
      update.end_date = input.endDate ? (input.endDate as Date).toISOString().slice(0, 10) : null;
    }
    if (input.merchant !== undefined) update.merchant = input.merchant;
    if (input.source !== undefined) update.source = input.source;
    if (input.note !== undefined) update.note = input.note;
    if (input.isActive !== undefined) update.is_active = input.isActive;

    const { data, error } = await supabase
      .from('recurring_transactions')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ recurring: data });
  } catch (error) {
    console.error('PATCH /api/recurring/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/recurring/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
