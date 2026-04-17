import { type NextRequest, NextResponse } from 'next/server';
import { materializeRecurringSchema } from '@finapp/core';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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
    const input = materializeRecurringSchema.parse({
      ...body,
      until: body.until ? new Date(body.until as string) : undefined,
    });

    const { data, error } = await supabase.rpc('materialize_recurring', {
      p_household_id: input.householdId,
      p_until: input.until
        ? input.until.toISOString().slice(0, 10)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });

    if (error) throw error;

    return NextResponse.json({ generated: data ?? [] });
  } catch (error) {
    console.error('POST /api/recurring/materialize error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
