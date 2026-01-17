import { NextRequest, NextResponse } from 'next/server';
import { linkLoanToAssetSchema } from '@finapp/core';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/loans/[id]/link-asset
 * Prepojí úver s majetkom
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
    const body = await request.json();

    // Validácia
    const validatedInput = linkLoanToAssetSchema.parse({
      loanId,
      assetId: body.assetId,
    });

    // Over že úver existuje a používateľ má prístup
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('household_id')
      .eq('id', validatedInput.loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Over že majetok existuje a patrí do rovnakej domácnosti
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('household_id')
      .eq('id', validatedInput.assetId)
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    if (loan.household_id !== asset.household_id) {
      return NextResponse.json(
        { error: 'Loan and asset must belong to the same household' },
        { status: 400 }
      );
    }

    // Verify user has access
    const { data: membership } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', loan.household_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin', 'member'].includes(membership.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Prepoj úver s majetkom
    const { error: updateError } = await supabase
      .from('loans')
      .update({ linked_asset_id: validatedInput.assetId })
      .eq('id', validatedInput.loanId);

    if (updateError) {
      console.error('Update loan error:', updateError);
      return NextResponse.json(
        { error: 'Failed to link loan to asset' },
        { status: 500 }
      );
    }

    // Aktualizuj asset-loan metriky
    await supabase.rpc('update_asset_loan_metrics', {
      p_household_id: loan.household_id,
    });

    return NextResponse.json({
      success: true,
      message: 'Loan successfully linked to asset',
      loanId: validatedInput.loanId,
      assetId: validatedInput.assetId,
    });
  } catch (error) {
    console.error('POST /api/loans/[id]/link-asset error:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/loans/[id]/link-asset
 * Odpojí úver od majetku
 */
export async function DELETE(
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

    // Over že úver existuje
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('household_id')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Verify user has access
    const { data: membership } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', loan.household_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin', 'member'].includes(membership.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Odpoj úver od majetku
    const { error: updateError } = await supabase
      .from('loans')
      .update({ linked_asset_id: null })
      .eq('id', loanId);

    if (updateError) {
      console.error('Update loan error:', updateError);
      return NextResponse.json(
        { error: 'Failed to unlink loan from asset' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Loan successfully unlinked from asset',
      loanId,
    });
  } catch (error) {
    console.error('DELETE /api/loans/[id]/link-asset error:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

