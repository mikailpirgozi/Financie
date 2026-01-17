import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateRule } from '@finapp/core';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current household
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No household found' }, { status: 404 });
    }

    // Get rules
    const { data: rules, error } = await supabase
      .from('rules')
      .select('*')
      .eq('household_id', membership.household_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ rules: rules || [] });
  } catch (error) {
    console.error('GET /api/rules error:', error);
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

    // Get current household
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No household found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { matchType, matchValue, categoryId, applyTo } = body;

    // Validate rule
    const validation = validateRule({ matchType, matchValue, categoryId, applyTo });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Create rule
    const { data: rule, error } = await supabase
      .from('rules')
      .insert({
        household_id: membership.household_id,
        match_type: matchType,
        match_value: matchValue,
        category_id: categoryId,
        apply_to: applyTo,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error('POST /api/rules error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

