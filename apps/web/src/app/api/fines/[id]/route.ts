import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/logger';

export const dynamic = 'force-dynamic';

const updateFineSchema = z.object({
  assetId: z.string().uuid().optional().nullable(),
  fineDate: z.string().optional(),
  fineAmount: z.number().min(0).optional(),
  fineAmountLate: z.number().optional().nullable(),
  country: z.string().optional().nullable(),
  enforcementCompany: z.string().optional().nullable(),
  isPaid: z.boolean().optional(),
  ownerPaidDate: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  filePaths: z.array(z.string()).optional(),
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
      .from('fines')
      .select(`*, asset:assets(id, kind, name, license_plate)`)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Fine not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const fine = {
      id: data.id,
      householdId: data.household_id,
      assetId: data.asset_id,
      fineDate: data.fine_date,
      fineAmount: data.fine_amount,
      fineAmountLate: data.fine_amount_late,
      country: data.country,
      enforcementCompany: data.enforcement_company,
      isPaid: data.is_paid,
      ownerPaidDate: data.owner_paid_date,
      description: data.description,
      notes: data.notes,
      filePaths: data.file_paths || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      asset: data.asset ? {
        id: data.asset.id,
        kind: data.asset.kind,
        name: data.asset.name,
        licensePlate: data.asset.license_plate,
      } : undefined,
    };

    return NextResponse.json({ data: fine });
  } catch (error) {
    console.error('GET /api/fines/[id] error:', error);
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

    const { data: existing, error: fetchError } = await supabase
      .from('fines')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Fine not found' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const body = await request.json();
    const validatedInput = updateFineSchema.parse(body);

    const updateData: Record<string, unknown> = {};

    if (validatedInput.assetId !== undefined) updateData.asset_id = validatedInput.assetId;
    if (validatedInput.fineDate !== undefined) updateData.fine_date = validatedInput.fineDate;
    if (validatedInput.fineAmount !== undefined) updateData.fine_amount = validatedInput.fineAmount;
    if (validatedInput.fineAmountLate !== undefined) updateData.fine_amount_late = validatedInput.fineAmountLate;
    if (validatedInput.country !== undefined) updateData.country = validatedInput.country;
    if (validatedInput.enforcementCompany !== undefined) updateData.enforcement_company = validatedInput.enforcementCompany;
    if (validatedInput.isPaid !== undefined) updateData.is_paid = validatedInput.isPaid;
    if (validatedInput.ownerPaidDate !== undefined) updateData.owner_paid_date = validatedInput.ownerPaidDate;
    if (validatedInput.description !== undefined) updateData.description = validatedInput.description;
    if (validatedInput.notes !== undefined) updateData.notes = validatedInput.notes;
    if (validatedInput.filePaths !== undefined) updateData.file_paths = validatedInput.filePaths;

    const { data, error } = await supabase
      .from('fines')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating fine:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      householdId: existing.household_id,
      userId: user.id,
      action: 'update',
      entityType: 'fine',
      entityId: id,
      changes: { old_value: existing, new_value: validatedInput },
      request,
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PUT /api/fines/[id] error:', error);
    
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

    const { data: existing, error: fetchError } = await supabase
      .from('fines')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Fine not found' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const { error } = await supabase
      .from('fines')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting fine:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      householdId: existing.household_id,
      userId: user.id,
      action: 'delete',
      entityType: 'fine',
      entityId: id,
      changes: { old_value: existing },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/fines/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
