import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/logger';

export const dynamic = 'force-dynamic';

// Validation schema for creating/updating insurance
const insuranceSchema = z.object({
  householdId: z.string().uuid(),
  assetId: z.string().uuid().optional().nullable(),
  insurerId: z.string().uuid().optional().nullable(),
  type: z.enum(['pzp', 'kasko', 'pzp_kasko', 'leasing', 'property', 'life', 'other']),
  policyNumber: z.string().min(1),
  company: z.string().optional().nullable(),
  brokerCompany: z.string().optional().nullable(),
  validFrom: z.string(),
  validTo: z.string(),
  price: z.number().min(0),
  paymentFrequency: z.enum(['monthly', 'quarterly', 'biannual', 'yearly']).default('yearly'),
  paidDate: z.string().optional().nullable(),
  greenCardValidFrom: z.string().optional().nullable(),
  greenCardValidTo: z.string().optional().nullable(),
  kmState: z.number().optional().nullable(),
  coverageAmount: z.number().optional().nullable(),
  deductibleAmount: z.number().optional().nullable(),
  deductiblePercentage: z.number().optional().nullable(),
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
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    if (!householdId) {
      return NextResponse.json({ error: 'householdId is required' }, { status: 400 });
    }

    let query = supabase
      .from('insurances')
      .select(`
        *,
        asset:assets(id, kind, name, license_plate)
      `)
      .eq('household_id', householdId)
      .order('valid_to', { ascending: true });

    // Apply filters
    if (assetId) {
      query = query.eq('asset_id', assetId);
    }

    if (type) {
      query = query.eq('type', type);
    }

    // Status filter
    if (status && status !== 'all') {
      const now = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      if (status === 'active') {
        query = query.gt('valid_to', thirtyDaysFromNow);
      } else if (status === 'expiring') {
        query = query.lte('valid_to', thirtyDaysFromNow).gte('valid_to', now);
      } else if (status === 'expired') {
        query = query.lt('valid_to', now);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching insurances:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform snake_case to camelCase
    const insurances = data?.map(item => ({
      id: item.id,
      householdId: item.household_id,
      assetId: item.asset_id,
      insurerId: item.insurer_id,
      type: item.type,
      policyNumber: item.policy_number,
      company: item.company,
      brokerCompany: item.broker_company,
      validFrom: item.valid_from,
      validTo: item.valid_to,
      price: item.price,
      paymentFrequency: item.payment_frequency,
      paidDate: item.paid_date,
      greenCardValidFrom: item.green_card_valid_from,
      greenCardValidTo: item.green_card_valid_to,
      kmState: item.km_state,
      coverageAmount: item.coverage_amount,
      deductibleAmount: item.deductible_amount,
      deductiblePercentage: item.deductible_percentage,
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
      total: insurances.length,
      active: insurances.filter(i => new Date(i.validTo) > thirtyDaysFromNow).length,
      expiringSoon: insurances.filter(i => {
        const validTo = new Date(i.validTo);
        return validTo >= now && validTo <= thirtyDaysFromNow;
      }).length,
      expired: insurances.filter(i => new Date(i.validTo) < now).length,
      totalAnnualCost: insurances.reduce((sum, i) => {
        const multiplier = i.paymentFrequency === 'monthly' ? 12 
          : i.paymentFrequency === 'quarterly' ? 4 
          : i.paymentFrequency === 'biannual' ? 2 
          : 1;
        return sum + (Number(i.price) * multiplier);
      }, 0),
    };

    return NextResponse.json({ data: insurances, stats });
  } catch (error) {
    console.error('GET /api/insurances error:', error);
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
    const validatedInput = insuranceSchema.parse(body);

    // Convert camelCase to snake_case for database
    const dbData = {
      household_id: validatedInput.householdId,
      asset_id: validatedInput.assetId || null,
      insurer_id: validatedInput.insurerId || null,
      type: validatedInput.type,
      policy_number: validatedInput.policyNumber,
      company: validatedInput.company || null,
      broker_company: validatedInput.brokerCompany || null,
      valid_from: validatedInput.validFrom,
      valid_to: validatedInput.validTo,
      price: validatedInput.price,
      payment_frequency: validatedInput.paymentFrequency,
      paid_date: validatedInput.paidDate || null,
      green_card_valid_from: validatedInput.greenCardValidFrom || null,
      green_card_valid_to: validatedInput.greenCardValidTo || null,
      km_state: validatedInput.kmState || null,
      coverage_amount: validatedInput.coverageAmount || null,
      deductible_amount: validatedInput.deductibleAmount || null,
      deductible_percentage: validatedInput.deductiblePercentage || null,
      file_paths: validatedInput.filePaths,
      notes: validatedInput.notes || null,
    };

    const { data, error } = await supabase
      .from('insurances')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      console.error('Error creating insurance:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log audit
    await logAudit({
      householdId: validatedInput.householdId,
      userId: user.id,
      action: 'create',
      entityType: 'insurance',
      entityId: data.id,
      changes: {
        new_value: validatedInput,
      },
      request,
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/insurances error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
