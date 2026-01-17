import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getLoan, deleteLoan } from '@/lib/api/loans';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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

