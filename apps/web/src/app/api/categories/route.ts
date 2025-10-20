import { NextRequest, NextResponse } from 'next/server';
import { createCategorySchema } from '@finapp/core';
import { createCategory, getCategories } from '@/lib/api/categories';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const householdId = searchParams.get('householdId');
    const kind = searchParams.get('kind');

    if (!householdId) {
      return NextResponse.json({ error: 'householdId is required' }, { status: 400 });
    }

    const categories = await getCategories(householdId, kind ?? undefined);

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('GET /api/categories error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate input
    const validatedInput = createCategorySchema.parse(body);

    const category = await createCategory(validatedInput);

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('POST /api/categories error:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

