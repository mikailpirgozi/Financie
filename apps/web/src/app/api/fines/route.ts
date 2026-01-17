import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/logger';

export const dynamic = 'force-dynamic';

const fineSchema = z.object({
  householdId: z.string().uuid(),
  assetId: z.string().uuid().optional().nullable(),
  fineDate: z.string(),
  fineAmount: z.number().min(0),
  fineAmountLate: z.number().optional().nullable(),
  country: z.string().optional().nullable(),
  enforcementCompany: z.string().optional().nullable(),
  isPaid: z.boolean().default(false),
  ownerPaidDate: z.string().optional().nullable(),
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
    const isPaid = searchParams.get('isPaid');

    if (!householdId) {
      return NextResponse.json({ error: 'householdId is required' }, { status: 400 });
    }

    let query = supabase
      .from('fines')
      .select(`*, asset:assets(id, kind, name, license_plate)`)
      .eq('household_id', householdId)
      .order('fine_date', { ascending: false });

    if (assetId) {
      query = query.eq('asset_id', assetId);
    }

    if (isPaid !== null && isPaid !== undefined) {
      query = query.eq('is_paid', isPaid === 'true');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching fines:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const fines = data?.map(item => ({
      id: item.id,
      householdId: item.household_id,
      assetId: item.asset_id,
      fineDate: item.fine_date,
      fineAmount: item.fine_amount,
      fineAmountLate: item.fine_amount_late,
      country: item.country,
      enforcementCompany: item.enforcement_company,
      isPaid: item.is_paid,
      ownerPaidDate: item.owner_paid_date,
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
      total: fines.length,
      paid: fines.filter(f => f.isPaid).length,
      unpaid: fines.filter(f => !f.isPaid).length,
      totalAmount: fines.reduce((sum, f) => sum + Number(f.fineAmount), 0),
      unpaidAmount: fines.filter(f => !f.isPaid).reduce((sum, f) => sum + Number(f.fineAmount), 0),
    };

    return NextResponse.json({ data: fines, stats });
  } catch (error) {
    console.error('GET /api/fines error:', error);
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
    const validatedInput = fineSchema.parse(body);

    const dbData = {
      household_id: validatedInput.householdId,
      asset_id: validatedInput.assetId || null,
      fine_date: validatedInput.fineDate,
      fine_amount: validatedInput.fineAmount,
      fine_amount_late: validatedInput.fineAmountLate || null,
      country: validatedInput.country || null,
      enforcement_company: validatedInput.enforcementCompany || null,
      is_paid: validatedInput.isPaid,
      owner_paid_date: validatedInput.ownerPaidDate || null,
      description: validatedInput.description || null,
      notes: validatedInput.notes || null,
      file_paths: validatedInput.filePaths,
    };

    const { data, error } = await supabase
      .from('fines')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      console.error('Error creating fine:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      householdId: validatedInput.householdId,
      userId: user.id,
      action: 'create',
      entityType: 'fine',
      entityId: data.id,
      changes: { new_value: validatedInput },
      request,
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/fines error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
