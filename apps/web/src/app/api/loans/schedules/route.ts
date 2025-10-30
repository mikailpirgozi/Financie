import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  loanIds: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { loanIds } = querySchema.parse(searchParams);
    
    const loanIdArray = loanIds.split(',').filter(Boolean);
    
    if (loanIdArray.length === 0) {
      return NextResponse.json({}, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          'CDN-Cache-Control': 'public, s-maxage=60',
        }
      });
    }

    // Batch fetch all schedules in one query
    const { data: schedules, error } = await supabase
      .from('loan_schedules')
      .select('*')
      .in('loan_id', loanIdArray)
      .order('loan_id', { ascending: true })
      .order('installment_no', { ascending: true });

    if (error) throw error;

    // Group schedules by loan_id
    const schedulesMap: Record<string, typeof schedules> = {};
    schedules?.forEach((schedule) => {
      if (!schedulesMap[schedule.loan_id]) {
        schedulesMap[schedule.loan_id] = [];
      }
      schedulesMap[schedule.loan_id].push(schedule);
    });

    return NextResponse.json(schedulesMap, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'CDN-Cache-Control': 'public, s-maxage=60',
      }
    });
  } catch (error) {
    console.error('GET /api/loans/schedules error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
