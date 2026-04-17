import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  householdId: z.string().uuid().optional(),
  monthsCount: z.coerce.number().int().min(1).max(24).default(6),
});

/**
 * GET /api/dashboard-data
 *
 * Set-based dashboard endpoint - 1 RPC call namiesto N paralelnych queries.
 * Backed by `public.get_dashboard_data(p_household_id, p_months_count)`.
 *
 * Vraca:
 *   {
 *     currentMonth: { month, totalIncome, totalExpense, netCashFlow },
 *     monthlySummaries: [{ month, income, expense, net }, ...],
 *     loans: { total, active, balanceRemaining, totalPaid, totalInterest, overdueCount },
 *     assets: { count, totalValue },
 *     netWorth
 *   }
 *
 * Pri chybajucom householdId si endpoint zistuje household z prveho
 * membership zaznamu prihlaseneho usera.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let householdId = parsed.data.householdId;
    if (!householdId) {
      const { data: membership, error: membershipError } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (membershipError || !membership?.household_id) {
        return NextResponse.json({ error: 'No household found for user' }, { status: 404 });
      }
      householdId = membership.household_id;
    }

    // 1 RPC namiesto 4-5 paralelnych queries.
    // RPC ma vlastny auth.uid() guard cez is_household_member().
    const { data, error } = await supabase.rpc('get_dashboard_data', {
      p_household_id: householdId,
      p_months_count: parsed.data.monthsCount,
    });

    if (error) {
      // 42501 = unauthorized z RLS / SECURITY DEFINER guarda
      if (error.code === '42501') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      console.error('GET /api/dashboard-data RPC error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { householdId, data },
      {
        headers: {
          // User-bound; never share on CDN. Browser keeps short private copy.
          'Cache-Control': 'private, max-age=15, must-revalidate',
        },
      }
    );
  } catch (err) {
    console.error('GET /api/dashboard-data error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
