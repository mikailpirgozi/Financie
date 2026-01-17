import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/loans/[id]/documents/[docId]
 * Get a single document
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: loanId, docId } = await params;
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

    // Fetch document
    const { data: document, error: documentError } = await supabase
      .from('loan_documents')
      .select('*')
      .eq('id', docId)
      .eq('loan_id', loanId)
      .single();

    if (documentError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Transform to camelCase
    const transformedDocument = {
      id: document.id,
      householdId: document.household_id,
      loanId: document.loan_id,
      documentType: document.document_type,
      name: document.name,
      filePath: document.file_path,
      fileSize: document.file_size,
      mimeType: document.mime_type,
      notes: document.notes,
      createdAt: document.created_at,
      updatedAt: document.updated_at,
    };

    return NextResponse.json({ document: transformedDocument });
  } catch (error) {
    console.error('GET /api/loans/[id]/documents/[docId] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/loans/[id]/documents/[docId]
 * Delete a document
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: loanId, docId } = await params;
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

    // Get document to get file path for storage deletion
    const { data: document, error: fetchError } = await supabase
      .from('loan_documents')
      .select('file_path')
      .eq('id', docId)
      .eq('loan_id', loanId)
      .single();

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete document record
    const { error: deleteError } = await supabase
      .from('loan_documents')
      .delete()
      .eq('id', docId)
      .eq('loan_id', loanId);

    if (deleteError) {
      console.error('Error deleting document:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    // Also delete from storage if file exists
    if (document.file_path) {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.file_path]);

      if (storageError) {
        // Log but don't fail - record is already deleted
        console.warn('Failed to delete file from storage:', storageError);
      }
    }

    return NextResponse.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/loans/[id]/documents/[docId] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
