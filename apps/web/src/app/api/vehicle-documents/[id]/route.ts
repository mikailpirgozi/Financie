import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/logger';

export const dynamic = 'force-dynamic';

const updateVehicleDocumentSchema = z.object({
  assetId: z.string().uuid().optional(),
  documentType: z.enum(['stk', 'ek', 'vignette', 'technical_certificate']).optional(),
  validFrom: z.string().optional().nullable(),
  validTo: z.string().optional(),
  documentNumber: z.string().optional().nullable(),
  price: z.number().optional().nullable(),
  brokerCompany: z.string().optional().nullable(),
  country: z.enum(['SK', 'CZ', 'AT', 'HU', 'SI', 'PL', 'DE', 'CH']).optional().nullable(),
  isRequired: z.boolean().optional(),
  kmState: z.number().optional().nullable(),
  paidDate: z.string().optional().nullable(),
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
      .from('vehicle_documents')
      .select(`*, asset:assets(id, kind, name, license_plate)`)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const document = {
      id: data.id,
      householdId: data.household_id,
      assetId: data.asset_id,
      documentType: data.document_type,
      validFrom: data.valid_from,
      validTo: data.valid_to,
      documentNumber: data.document_number,
      price: data.price,
      brokerCompany: data.broker_company,
      country: data.country,
      isRequired: data.is_required,
      kmState: data.km_state,
      paidDate: data.paid_date,
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

    return NextResponse.json({ data: document });
  } catch (error) {
    console.error('GET /api/vehicle-documents/[id] error:', error);
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
      .from('vehicle_documents')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const body = await request.json();
    const validatedInput = updateVehicleDocumentSchema.parse(body);

    const updateData: Record<string, unknown> = {};

    if (validatedInput.assetId !== undefined) updateData.asset_id = validatedInput.assetId;
    if (validatedInput.documentType !== undefined) updateData.document_type = validatedInput.documentType;
    if (validatedInput.validFrom !== undefined) updateData.valid_from = validatedInput.validFrom;
    if (validatedInput.validTo !== undefined) updateData.valid_to = validatedInput.validTo;
    if (validatedInput.documentNumber !== undefined) updateData.document_number = validatedInput.documentNumber;
    if (validatedInput.price !== undefined) updateData.price = validatedInput.price;
    if (validatedInput.brokerCompany !== undefined) updateData.broker_company = validatedInput.brokerCompany;
    if (validatedInput.country !== undefined) updateData.country = validatedInput.country;
    if (validatedInput.isRequired !== undefined) updateData.is_required = validatedInput.isRequired;
    if (validatedInput.kmState !== undefined) updateData.km_state = validatedInput.kmState;
    if (validatedInput.paidDate !== undefined) updateData.paid_date = validatedInput.paidDate;
    if (validatedInput.lastExtendedDate !== undefined) updateData.last_extended_date = validatedInput.lastExtendedDate;
    if (validatedInput.extensionCount !== undefined) updateData.extension_count = validatedInput.extensionCount;
    if (validatedInput.filePaths !== undefined) updateData.file_paths = validatedInput.filePaths;
    if (validatedInput.notes !== undefined) updateData.notes = validatedInput.notes;

    const { data, error } = await supabase
      .from('vehicle_documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating vehicle document:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      householdId: existing.household_id,
      userId: user.id,
      action: 'update',
      entityType: 'vehicle_document',
      entityId: id,
      changes: { old_value: existing, new_value: validatedInput },
      request,
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PUT /api/vehicle-documents/[id] error:', error);
    
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
      .from('vehicle_documents')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const { error } = await supabase
      .from('vehicle_documents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting vehicle document:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAudit({
      householdId: existing.household_id,
      userId: user.id,
      action: 'delete',
      entityType: 'vehicle_document',
      entityId: id,
      changes: { old_value: existing },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/vehicle-documents/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
