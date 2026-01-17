import { NextRequest, NextResponse } from 'next/server';
import { updateAssetValueSchema } from '@finapp/core';
import { addAssetValuation } from '@/lib/api/assets';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate input
    const validatedInput = updateAssetValueSchema.parse({
      assetId: id,
      value: body.value,
      date: new Date(body.date),
      source: body.source ?? 'manual',
    });

    const valuation = await addAssetValuation(validatedInput);

    return NextResponse.json({ valuation }, { status: 201 });
  } catch (error) {
    console.error('POST /api/assets/[id]/valuations error:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

