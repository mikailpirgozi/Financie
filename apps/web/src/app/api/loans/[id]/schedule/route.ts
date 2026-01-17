import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const runtime = 'nodejs'; // Will use Edge when Supabase supports it
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(10).max(100).default(50),
  status: z.enum(['paid', 'pending', 'overdue']).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: loanId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validácia query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { page, limit, status } = querySchema.parse(searchParams);

    // Paralelné queries (50-100ms total)
    let scheduleQuery = supabase
      .from('loan_schedules')
      .select('*', { count: 'exact' })
      .eq('loan_id', loanId);

    if (status) {
      scheduleQuery = scheduleQuery.eq('status', status);
    }

    const [scheduleResult, metricsResult] = await Promise.all([
      // Stránkovaný schedule
      scheduleQuery
        .range((page - 1) * limit, page * limit - 1)
        .order('installment_no', { ascending: true }),

      // Metriky z materialized view (instant)
      supabase.from('loan_metrics').select('*').eq('loan_id', loanId).single(),
    ]);

    if (scheduleResult.error) throw scheduleResult.error;

    return NextResponse.json(
      {
        schedule: scheduleResult.data ?? [],
        count: scheduleResult.count ?? 0,
        page,
        limit,
        pages: Math.ceil((scheduleResult.count ?? 0) / limit),
        metrics: metricsResult.data,
      },
      {
        headers: {
          // Vercel Edge Cache (CDN layer)
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          'CDN-Cache-Control': 'public, s-maxage=60',
        },
      }
    );
  } catch (error) {
    console.error('GET /api/loans/[id]/schedule error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
