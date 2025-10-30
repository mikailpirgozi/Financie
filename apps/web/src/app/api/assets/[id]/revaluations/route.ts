import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { addAssetValuation } from '@/lib/api/assets';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, value, source } = body;

    if (!date || !value || !source) {
      return NextResponse.json(
        { error: 'Missing required fields: date, value, source' },
        { status: 400 }
      );
    }

    const valuation = await addAssetValuation({
      assetId: params.id,
      date: new Date(date),
      value: parseFloat(value),
      source: source as 'manual' | 'automatic',
    });

    return NextResponse.json({ valuation });
  } catch (error) {
    console.error('POST /api/assets/[id]/revaluations error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

