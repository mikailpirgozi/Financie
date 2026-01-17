import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Schema for updating a note
const updateNoteSchema = z.object({
  content: z.string().min(1).optional(),
  priority: z.enum(['high', 'normal', 'low']).optional(),
  status: z.enum(['pending', 'completed', 'info']).optional(),
  is_pinned: z.boolean().optional(),
});

/**
 * GET /api/loans/[id]/notes/[noteId]
 * Get a single note
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id: loanId, noteId } = await params;
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

    // Fetch the note
    const { data: note, error: noteError } = await supabase
      .from('loan_notes')
      .select('*')
      .eq('id', noteId)
      .eq('loan_id', loanId)
      .single();

    if (noteError || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ note });
  } catch (error) {
    console.error('GET /api/loans/[id]/notes/[noteId] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/loans/[id]/notes/[noteId]
 * Update a note
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id: loanId, noteId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateNoteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

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

    // Verify note exists and belongs to this loan
    const { data: existingNote, error: existingError } = await supabase
      .from('loan_notes')
      .select('id')
      .eq('id', noteId)
      .eq('loan_id', loanId)
      .single();

    if (existingError || !existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Update the note
    const { data: note, error: updateError } = await supabase
      .from('loan_notes')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', noteId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating note:', updateError);
      return NextResponse.json(
        { error: 'Failed to update note' },
        { status: 500 }
      );
    }

    return NextResponse.json({ note });
  } catch (error) {
    console.error('PATCH /api/loans/[id]/notes/[noteId] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/loans/[id]/notes/[noteId]
 * Delete a note
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id: loanId, noteId } = await params;
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

    // Delete the note
    const { error: deleteError } = await supabase
      .from('loan_notes')
      .delete()
      .eq('id', noteId)
      .eq('loan_id', loanId);

    if (deleteError) {
      console.error('Error deleting note:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete note' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/loans/[id]/notes/[noteId] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
