import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/loans/notes
 *
 * Batch endpoint pre načítanie loan notes pre viacero úverov v jednom requeste.
 *
 * Query params:
 *   - loanIds:  comma-separated UUIDs (max 100)
 *               ALEBO
 *   - householdId: UUID — vrati pre vsetky uvery danej domacnosti
 *   - pinnedHighOnly: 'true' (default) — vrati len pinned + priority='high'
 *
 * Response: { notes: Record<loanId, LoanNote[]> }
 *
 * Nahradza N+1 fetch z mobile loans.tsx (1 request namiesto 10+).
 */

const querySchema = z
  .object({
    loanIds: z.string().optional(),
    householdId: z.string().uuid().optional(),
    pinnedHighOnly: z.enum(['true', 'false']).default('true'),
  })
  .refine((d) => d.loanIds || d.householdId, {
    message: 'loanIds or householdId is required',
  });

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = querySchema.safeParse(searchParams);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { loanIds: loanIdsParam, householdId, pinnedHighOnly } = parseResult.data;

    // Step 1: vyriesit zoznam povolenych loan_id (RLS-aware)
    let loanIds: string[] = [];

    if (householdId) {
      // Overit membership a vziat vsetky uvery domacnosti
      const { data: membership } = await supabase
        .from('household_members')
        .select('id')
        .eq('household_id', householdId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!membership) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      const { data: loans } = await supabase
        .from('loans')
        .select('id')
        .eq('household_id', householdId);
      loanIds = (loans ?? []).map((l) => l.id);
    } else if (loanIdsParam) {
      const requested = loanIdsParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 100);

      if (requested.length === 0) {
        return NextResponse.json({ notes: {} });
      }

      // RLS-aware filter: prijmi len uvery ku ktorym mam pristup cez household_members
      const { data: ownedLoans } = await supabase.from('loans').select('id').in('id', requested);
      loanIds = (ownedLoans ?? []).map((l) => l.id);
    }

    if (loanIds.length === 0) {
      return NextResponse.json({ notes: {} });
    }

    // Step 2: jeden batch select na loan_notes
    let notesQuery = supabase
      .from('loan_notes')
      .select(
        'id, loan_id, content, priority, status, is_pinned, payment_id, schedule_id, created_at'
      )
      .in('loan_id', loanIds)
      .order('is_pinned', { ascending: false })
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });

    if (pinnedHighOnly === 'true') {
      notesQuery = notesQuery.eq('is_pinned', true).eq('priority', 'high');
    }

    const { data: notes, error: notesError } = await notesQuery;

    if (notesError) {
      console.error('Error batch-fetching notes:', notesError);
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }

    // Step 3: groupBy loan_id
    const grouped: Record<string, typeof notes> = {};
    for (const note of notes ?? []) {
      if (!grouped[note.loan_id]) grouped[note.loan_id] = [];
      grouped[note.loan_id].push(note);
    }

    return NextResponse.json(
      { notes: grouped },
      {
        headers: {
          // Per-user payload, krátka private cache
          'Cache-Control': 'private, max-age=30, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('GET /api/loans/notes error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
