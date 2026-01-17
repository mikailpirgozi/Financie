import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/logger';

export const dynamic = 'force-dynamic';

// Validation schema for updating insurance
const updateInsuranceSchema = z.object({
  assetId: z.string().uuid().optional().nullable(),
  insurerId: z.string().uuid().optional().nullable(),
  type: z.enum(['pzp', 'kasko', 'pzp_kasko', 'leasing', 'property', 'life', 'other']).optional(),
  policyNumber: z.string().min(1).optional(),
  company: z.string().optional().nullable(),
  brokerCompany: z.string().optional().nullable(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  price: z.number().min(0).optional(),
  paymentFrequency: z.enum(['monthly', 'quarterly', 'biannual', 'yearly']).optional(),
  paidDate: z.string().optional().nullable(),
  greenCardValidFrom: z.string().optional().nullable(),
  greenCardValidTo: z.string().optional().nullable(),
  kmState: z.number().optional().nullable(),
  coverageAmount: z.number().optional().nullable(),
  deductibleAmount: z.number().optional().nullable(),
  deductiblePercentage: z.number().optional().nullable(),
  lastExtendedDate: z.string().optional().nullable(),
  extensionCount: z.number().optional(),
  filePaths: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('insurances')
      .select(`
        *,
        asset:assets(id, kind, name, license_plate)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Insurance not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to camelCase
    const insurance = {
      id: data.id,
      householdId: data.household_id,
      assetId: data.asset_id,
      insurerId: data.insurer_id,
      type: data.type,
      policyNumber: data.policy_number,
      company: data.company,
      brokerCompany: data.broker_company,
      validFrom: data.valid_from,
      validTo: data.valid_to,
      price: data.price,
      paymentFrequency: data.payment_frequency,
      paidDate: data.paid_date,
      greenCardValidFrom: data.green_card_valid_from,
      greenCardValidTo: data.green_card_valid_to,
      kmState: data.km_state,
      coverageAmount: data.coverage_amount,
      deductibleAmount: data.deductible_amount,
      deductiblePercentage: data.deductible_percentage,
      lastExtendedDate: data.last_extended_date,
      extensionCount: data.extension_count,
      filePaths: data.file_paths || [],
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      asset: data.asset ? {
        id: data.asset.id,
        kind: data.asset.kind,
        name: data.asset.name,
        licensePlate: data.asset.license_plate,
      } : undefined,
    };

    return NextResponse.json({ data: insurance });
  } catch (error) {
    console.error('GET /api/insurances/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First get the existing insurance to get householdId for audit
    const { data: existing, error: fetchError } = await supabase
      .from('insurances')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Insurance not found' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const body = await request.json();
    const validatedInput = updateInsuranceSchema.parse(body);

    // Build update object with snake_case
    const updateData: Record<string, unknown> = {};

    if (validatedInput.assetId !== undefined) updateData.asset_id = validatedInput.assetId;
    if (validatedInput.insurerId !== undefined) updateData.insurer_id = validatedInput.insurerId;
    if (validatedInput.type !== undefined) updateData.type = validatedInput.type;
    if (validatedInput.policyNumber !== undefined) updateData.policy_number = validatedInput.policyNumber;
    if (validatedInput.company !== undefined) updateData.company = validatedInput.company;
    if (validatedInput.brokerCompany !== undefined) updateData.broker_company = validatedInput.brokerCompany;
    if (validatedInput.validFrom !== undefined) updateData.valid_from = validatedInput.validFrom;
    if (validatedInput.validTo !== undefined) updateData.valid_to = validatedInput.validTo;
    if (validatedInput.price !== undefined) updateData.price = validatedInput.price;
    if (validatedInput.paymentFrequency !== undefined) updateData.payment_frequency = validatedInput.paymentFrequency;
    if (validatedInput.paidDate !== undefined) updateData.paid_date = validatedInput.paidDate;
    if (validatedInput.greenCardValidFrom !== undefined) updateData.green_card_valid_from = validatedInput.greenCardValidFrom;
    if (validatedInput.greenCardValidTo !== undefined) updateData.green_card_valid_to = validatedInput.greenCardValidTo;
    if (validatedInput.kmState !== undefined) updateData.km_state = validatedInput.kmState;
    if (validatedInput.coverageAmount !== undefined) updateData.coverage_amount = validatedInput.coverageAmount;
    if (validatedInput.deductibleAmount !== undefined) updateData.deductible_amount = validatedInput.deductibleAmount;
    if (validatedInput.deductiblePercentage !== undefined) updateData.deductible_percentage = validatedInput.deductiblePercentage;
    if (validatedInput.lastExtendedDate !== undefined) updateData.last_extended_date = validatedInput.lastExtendedDate;
    if (validatedInput.extensionCount !== undefined) updateData.extension_count = validatedInput.extensionCount;
    if (validatedInput.filePaths !== undefined) updateData.file_paths = validatedInput.filePaths;
    if (validatedInput.notes !== undefined) updateData.notes = validatedInput.notes;

    const { data, error } = await supabase
      .from('insurances')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating insurance:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log audit
    await logAudit({
      householdId: existing.household_id,
      userId: user.id,
      action: 'update',
      entityType: 'insurance',
      entityId: id,
      changes: {
        old_value: existing,
        new_value: validatedInput,
      },
      request,
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PUT /api/insurances/[id] error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First get the insurance to get householdId for audit
    const { data: existing, error: fetchError } = await supabase
      .from('insurances')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Insurance not found' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const { error } = await supabase
      .from('insurances')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting insurance:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log audit
    await logAudit({
      householdId: existing.household_id,
      userId: user.id,
      action: 'delete',
      entityType: 'insurance',
      entityId: id,
      changes: {
        old_value: existing,
      },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/insurances/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
