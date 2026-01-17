import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/logger';

export const dynamic = 'force-dynamic';

const updateServiceRecordSchema = z.object({
  assetId: z.string().uuid().optional(),
  serviceDate: z.string().optional(),
  serviceProvider: z.string().optional().nullable(),
  serviceType: z.enum(['regular', 'repair', 'tire_change', 'inspection', 'other']).optional().nullable(),
  kmState: z.number().optional().nullable(),
  price: z.number().optional().nullable(),
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
      .from('service_records')
      .select(`*, asset:assets(id, kind, name, license_plate)`)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Service record not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const record = {
      id: data.id,
      householdId: data.household_id,
      assetId: data.asset_id,
      serviceDate: data.service_date,
      serviceProvider: data.service_provider,
      serviceType: data.service_type,
      kmState: data.km_state,
      price: data.price,
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

    return NextResponse.json({ data: record });
  } catch (error) {
    console.error('GET /api/service-records/[id] error:', error);
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
      .from('service_records')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Service record not found' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const body = await request.json();
    const validatedInput = updateServiceRecordSchema.parse(body);

    const updateData: Record<string, unknown> = {};

    if (validatedInput.assetId !== undefined) updateData.asset_id = validatedInput.assetId;
    if (validatedInput.serviceDate !== undefined) updateData.service_date = validatedInput.serviceDate;
    if (validatedInput.serviceProvider !== undefined) updateData.service_provider = validatedInput.serviceProvider;
    if (validatedInput.serviceType !== undefined) updateData.service_type = validatedInput.serviceType;
    if (validatedInput.kmState !== undefined) updateData.km_state = validatedInput.kmState;
    if (validatedInput.price !== undefined) updateData.price = validatedInput.price;
    if (validatedInput.description !== undefined) updateData.description = validatedInput.description;
    if (validatedInput.notes !== undefined) updateData.notes = validatedInput.notes;
    if (validatedInput.filePaths !== undefined) updateData.file_paths = validatedInput.filePaths;

    const { data, error } = await supabase
      .from('service_records')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating service record:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      householdId: existing.household_id,
      userId: user.id,
      action: 'update',
      entityType: 'service_record',
      entityId: id,
      changes: { old_value: existing, new_value: validatedInput },
      request,
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PUT /api/service-records/[id] error:', error);
    
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
      .from('service_records')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Service record not found' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const { error } = await supabase
      .from('service_records')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting service record:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      householdId: existing.household_id,
      userId: user.id,
      action: 'delete',
      entityType: 'service_record',
      entityId: id,
      changes: { old_value: existing },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/service-records/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
