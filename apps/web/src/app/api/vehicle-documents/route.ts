import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/logger';

export const dynamic = 'force-dynamic';

// Validation schema
const vehicleDocumentSchema = z.object({
  householdId: z.string().uuid(),
  assetId: z.string().uuid(),
  documentType: z.enum(['stk', 'ek', 'vignette', 'technical_certificate']),
  validFrom: z.string().optional().nullable(),
  validTo: z.string(),
  documentNumber: z.string().optional().nullable(),
  price: z.number().optional().nullable(),
  brokerCompany: z.string().optional().nullable(),
  country: z.enum(['SK', 'CZ', 'AT', 'HU', 'SI', 'PL', 'DE', 'CH']).optional().nullable(),
  isRequired: z.boolean().optional().default(true),
  kmState: z.number().optional().nullable(),
  paidDate: z.string().optional().nullable(),
  filePaths: z.array(z.string()).optional().default([]),
  notes: z.string().optional().nullable(),
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
    const documentType = searchParams.get('documentType');
    const status = searchParams.get('status');
    const country = searchParams.get('country');

    if (!householdId) {
      return NextResponse.json({ error: 'householdId is required' }, { status: 400 });
    }

    let query = supabase
      .from('vehicle_documents')
      .select(`
        *,
        asset:assets(id, kind, name, license_plate)
      `)
      .eq('household_id', householdId)
      .order('valid_to', { ascending: true });

    if (assetId) {
      query = query.eq('asset_id', assetId);
    }

    if (documentType) {
      query = query.eq('document_type', documentType);
    }

    if (country) {
      query = query.eq('country', country);
    }

    // Status filter
    if (status && status !== 'all') {
      const now = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      if (status === 'valid') {
        query = query.gt('valid_to', thirtyDaysFromNow);
      } else if (status === 'expiring') {
        query = query.lte('valid_to', thirtyDaysFromNow).gte('valid_to', now);
      } else if (status === 'expired') {
        query = query.lt('valid_to', now);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching vehicle documents:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to camelCase
    const documents = data?.map(item => ({
      id: item.id,
      householdId: item.household_id,
      assetId: item.asset_id,
      documentType: item.document_type,
      validFrom: item.valid_from,
      validTo: item.valid_to,
      documentNumber: item.document_number,
      price: item.price,
      brokerCompany: item.broker_company,
      country: item.country,
      isRequired: item.is_required,
      kmState: item.km_state,
      paidDate: item.paid_date,
      lastExtendedDate: item.last_extended_date,
      extensionCount: item.extension_count,
      filePaths: item.file_paths || [],
      notes: item.notes,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      asset: item.asset ? {
        id: item.asset.id,
        kind: item.asset.kind,
        name: item.asset.name,
        licensePlate: item.asset.license_plate,
      } : undefined,
    })) || [];

    // Calculate stats
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const stats = {
      total: documents.length,
      valid: documents.filter(d => new Date(d.validTo) > thirtyDaysFromNow).length,
      expiringSoon: documents.filter(d => {
        const validTo = new Date(d.validTo);
        return validTo >= now && validTo <= thirtyDaysFromNow;
      }).length,
      expired: documents.filter(d => new Date(d.validTo) < now).length,
      totalCost: documents.reduce((sum, d) => sum + (Number(d.price) || 0), 0),
    };

    return NextResponse.json({ data: documents, stats });
  } catch (error) {
    console.error('GET /api/vehicle-documents error:', error);
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
    const validatedInput = vehicleDocumentSchema.parse(body);

    const dbData = {
      household_id: validatedInput.householdId,
      asset_id: validatedInput.assetId,
      document_type: validatedInput.documentType,
      valid_from: validatedInput.validFrom || null,
      valid_to: validatedInput.validTo,
      document_number: validatedInput.documentNumber || null,
      price: validatedInput.price || null,
      broker_company: validatedInput.brokerCompany || null,
      country: validatedInput.country || null,
      is_required: validatedInput.isRequired,
      km_state: validatedInput.kmState || null,
      paid_date: validatedInput.paidDate || null,
      file_paths: validatedInput.filePaths,
      notes: validatedInput.notes || null,
    };

    const { data, error } = await supabase
      .from('vehicle_documents')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      console.error('Error creating vehicle document:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      householdId: validatedInput.householdId,
      userId: user.id,
      action: 'create',
      entityType: 'vehicle_document',
      entityId: data.id,
      changes: { new_value: validatedInput },
      request,
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/vehicle-documents error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
