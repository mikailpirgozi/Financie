import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Schema for creating a note
const createNoteSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
  status: z.enum(['pending', 'completed', 'info']).default('info'),
  is_pinned: z.boolean().default(false),
  payment_id: z.string().uuid().optional().nullable(),
  schedule_id: z.string().uuid().optional().nullable(),
});

/**
 * GET /api/loans/[id]/notes
 * List all notes for a loan
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: loanId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify loan belongs to user's household
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('household_id')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Verify user belongs to household
    const { data: membership, error: membershipError } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', loan.household_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch notes ordered by: pinned first, then by priority, then by date
    const { data: notes, error: notesError } = await supabase
      .from('loan_notes')
      .select('*')
      .eq('loan_id', loanId)
      .order('is_pinned', { ascending: false })
      .order('priority', { ascending: true }) // high comes first alphabetically
      .order('created_at', { ascending: false });

    if (notesError) {
      console.error('Error fetching notes:', notesError);
      return NextResponse.json(
        { error: 'Failed to fetch notes' },
        { status: 500 }
      );
    }

    return NextResponse.json({ notes: notes || [] });
  } catch (error) {
    console.error('GET /api/loans/[id]/notes error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/loans/[id]/notes
 * Create a new note for a loan
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: loanId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createNoteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const noteData = validationResult.data;

    // Verify loan belongs to user's household
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('household_id')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Verify user belongs to household
    const { data: membership, error: membershipError } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', loan.household_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Create the note
    const { data: note, error: createError } = await supabase
      .from('loan_notes')
      .insert({
        loan_id: loanId,
        content: noteData.content,
        priority: noteData.priority,
        status: noteData.status,
        is_pinned: noteData.is_pinned,
        payment_id: noteData.payment_id || null,
        schedule_id: noteData.schedule_id || null,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating note:', createError);
      return NextResponse.json(
        { error: 'Failed to create note' },
        { status: 500 }
      );
    }

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error('POST /api/loans/[id]/notes error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
