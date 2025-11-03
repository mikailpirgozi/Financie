import { NextRequest, NextResponse } from 'next/server';
import { createAssetCashFlowSchema } from '@finapp/core';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/assets/[id]/cash-flow
 * Získa históriu cash flow pre majetok
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assetId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type');

    // Over prístup k majetku
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('household_id')
      .eq('id', assetId)
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Verify user has access
    const { data: membership } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', asset.household_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Zostav query
    let query = supabase
      .from('asset_cash_flows')
      .select('*')
      .eq('asset_id', assetId)
      .order('date', { ascending: false });

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    if (type) {
      query = query.eq('type', type);
    }

    const { data: cashFlows, error: cashFlowsError } = await query;

    if (cashFlowsError) {
      console.error('Cash flows error:', cashFlowsError);
      return NextResponse.json(
        { error: 'Failed to fetch cash flows' },
        { status: 500 }
      );
    }

    // Vypočítaj sumáre
    const summary = {
      totalIncome: 0,
      totalExpenses: 0,
      netCashFlow: 0,
      count: cashFlows?.length || 0,
    };

    cashFlows?.forEach(cf => {
      const amount = Number(cf.amount);
      if (['rental_income', 'dividend', 'interest', 'sale_income'].includes(cf.type)) {
        summary.totalIncome += amount;
      } else {
        summary.totalExpenses += amount;
      }
    });

    summary.netCashFlow = summary.totalIncome - summary.totalExpenses;

    return NextResponse.json({
      cashFlows: cashFlows || [],
      summary,
    });
  } catch (error) {
    console.error('GET /api/assets/[id]/cash-flow error:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assets/[id]/cash-flow
 * Pridá nový cash flow záznam pre majetok
 */
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

    const assetId = params.id;
    const body = await request.json();

    // Validácia
    const validatedInput = createAssetCashFlowSchema.parse({
      assetId,
      date: new Date(body.date),
      type: body.type,
      amount: body.amount,
      description: body.description,
    });

    // Over prístup k majetku
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('household_id')
      .eq('id', validatedInput.assetId)
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Verify user has access
    const { data: membership } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', asset.household_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin', 'member'].includes(membership.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Vytvor cash flow záznam
    const { data: cashFlow, error: createError } = await supabase
      .from('asset_cash_flows')
      .insert({
        asset_id: validatedInput.assetId,
        date: validatedInput.date.toISOString().split('T')[0],
        type: validatedInput.type,
        amount: validatedInput.amount,
        description: validatedInput.description,
      })
      .select()
      .single();

    if (createError) {
      console.error('Create cash flow error:', createError);
      return NextResponse.json(
        { error: 'Failed to create cash flow record' },
        { status: 500 }
      );
    }

    return NextResponse.json({ cashFlow }, { status: 201 });
  } catch (error) {
    console.error('POST /api/assets/[id]/cash-flow error:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

