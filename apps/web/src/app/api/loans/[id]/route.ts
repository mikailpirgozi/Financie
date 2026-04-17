import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { updateLoanSchema } from '@finapp/core';
import { getLoan, deleteLoan, updateLoan } from '@/lib/api/loans';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const updateLoanBodySchema = updateLoanSchema;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getLoan(id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/loans/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateLoanBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await updateLoan(id, parsed.data);

    // Invalidate caches
    revalidateTag('loans-list', 'max');
    revalidateTag(`loan-${id}`, 'max');

    return NextResponse.json(result);
  } catch (error) {
    console.error('PUT /api/loans/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH is an alias for PUT (partial update semantics)
export const PATCH = PUT;

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteLoan(id);

    // Revalidate loans list cache
    revalidateTag('loans-list', 'max');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/loans/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
