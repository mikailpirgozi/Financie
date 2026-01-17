import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Schema for creating a document
const createDocumentSchema = z.object({
  document_type: z.enum(['contract', 'payment_schedule', 'amendment', 'other']),
  name: z.string().min(1, 'Name is required'),
  file_path: z.string().min(1, 'File path is required'),
  file_size: z.number().optional(),
  mime_type: z.string().optional(),
  notes: z.string().optional().nullable(),
});

/**
 * GET /api/loans/[id]/documents
 * List all documents for a loan
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

    // Fetch documents ordered by type, then by date
    const { data: documents, error: documentsError } = await supabase
      .from('loan_documents')
      .select('*')
      .eq('loan_id', loanId)
      .order('document_type', { ascending: true })
      .order('created_at', { ascending: false });

    if (documentsError) {
      console.error('Error fetching documents:', documentsError);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    // Transform to camelCase for frontend
    const transformedDocuments = (documents || []).map((doc) => ({
      id: doc.id,
      householdId: doc.household_id,
      loanId: doc.loan_id,
      documentType: doc.document_type,
      name: doc.name,
      filePath: doc.file_path,
      fileSize: doc.file_size,
      mimeType: doc.mime_type,
      notes: doc.notes,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    }));

    return NextResponse.json({ documents: transformedDocuments });
  } catch (error) {
    console.error('GET /api/loans/[id]/documents error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/loans/[id]/documents
 * Create a new document for a loan
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
    const validationResult = createDocumentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const docData = validationResult.data;

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

    // Create the document record
    const { data: document, error: createError } = await supabase
      .from('loan_documents')
      .insert({
        household_id: loan.household_id,
        loan_id: loanId,
        document_type: docData.document_type,
        name: docData.name,
        file_path: docData.file_path,
        file_size: docData.file_size || null,
        mime_type: docData.mime_type || null,
        notes: docData.notes || null,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating document:', createError);
      return NextResponse.json(
        { error: 'Failed to create document' },
        { status: 500 }
      );
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

    return NextResponse.json({ document: transformedDocument }, { status: 201 });
  } catch (error) {
    console.error('POST /api/loans/[id]/documents error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
