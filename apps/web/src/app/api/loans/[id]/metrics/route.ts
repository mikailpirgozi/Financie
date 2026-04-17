import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: loanId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch metrics from security_invoker view (filtruje podľa membership)
    const { data, error } = await supabase
      .from('v_loan_metrics')
      .select('*')
      .eq('loan_id', loanId)
      .single();

    if (error) {
      // If not found, return null gracefully
      if (error.code === 'PGRST116') {
        return NextResponse.json(null);
      }
      throw error;
    }

    return NextResponse.json(data, {
      headers: {
        // SECURITY: per-user dáta – private cache
        'Cache-Control': 'private, max-age=30, must-revalidate',
      },
    });
  } catch (error) {
    console.error('GET /api/loans/[id]/metrics error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
