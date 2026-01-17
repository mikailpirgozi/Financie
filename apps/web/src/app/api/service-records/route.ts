import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/logger';

export const dynamic = 'force-dynamic';

const serviceRecordSchema = z.object({
  householdId: z.string().uuid(),
  assetId: z.string().uuid(),
  serviceDate: z.string(),
  serviceProvider: z.string().optional().nullable(),
  serviceType: z.enum(['regular', 'repair', 'tire_change', 'inspection', 'other']).optional().nullable(),
  kmState: z.number().optional().nullable(),
  price: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  filePaths: z.array(z.string()).optional().default([]),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const householdId = searchParams.get('householdId');
    const assetId = searchParams.get('assetId');

    if (!householdId) {
      return NextResponse.json({ error: 'householdId is required' }, { status: 400 });
    }

    let query = supabase
      .from('service_records')
      .select(`*, asset:assets(id, kind, name, license_plate)`)
      .eq('household_id', householdId)
      .order('service_date', { ascending: false });

    if (assetId) {
      query = query.eq('asset_id', assetId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching service records:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const records = data?.map(item => ({
      id: item.id,
      householdId: item.household_id,
      assetId: item.asset_id,
      serviceDate: item.service_date,
      serviceProvider: item.service_provider,
      serviceType: item.service_type,
      kmState: item.km_state,
      price: item.price,
      description: item.description,
      notes: item.notes,
      filePaths: item.file_paths || [],
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      asset: item.asset ? {
        id: item.asset.id,
        kind: item.asset.kind,
        name: item.asset.name,
        licensePlate: item.asset.license_plate,
      } : undefined,
    })) || [];

    const stats = {
      total: records.length,
      totalCost: records.reduce((sum, r) => sum + (Number(r.price) || 0), 0),
    };

    return NextResponse.json({ data: records, stats });
  } catch (error) {
    console.error('GET /api/service-records error:', error);
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
    const validatedInput = serviceRecordSchema.parse(body);

    const dbData = {
      household_id: validatedInput.householdId,
      asset_id: validatedInput.assetId,
      service_date: validatedInput.serviceDate,
      service_provider: validatedInput.serviceProvider || null,
      service_type: validatedInput.serviceType || null,
      km_state: validatedInput.kmState || null,
      price: validatedInput.price || null,
      description: validatedInput.description || null,
      notes: validatedInput.notes || null,
      file_paths: validatedInput.filePaths,
    };

    const { data, error } = await supabase
      .from('service_records')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      console.error('Error creating service record:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      householdId: validatedInput.householdId,
      userId: user.id,
      action: 'create',
      entityType: 'service_record',
      entityId: data.id,
      changes: { new_value: validatedInput },
      request,
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/service-records error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
