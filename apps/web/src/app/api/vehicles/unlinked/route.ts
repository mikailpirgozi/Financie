import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/vehicles/unlinked
 * Get records that are not yet linked to any vehicle
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const householdId = searchParams.get('householdId');

    if (!householdId) {
      return NextResponse.json({ error: 'householdId is required' }, { status: 400 });
    }

    // Get unlinked loans (vehicle-related loans without linked_asset_id)
    const { data: unlinkedLoans } = await supabase
      .from('loans')
      .select('id, name, lender, principal, status, loan_purpose, created_at')
      .eq('household_id', householdId)
      .is('linked_asset_id', null)
      .eq('loan_purpose', 'vehicle_purchase')
      .order('created_at', { ascending: false });

    // Get unlinked insurances (vehicle-related types without asset_id)
    const { data: unlinkedInsurances } = await supabase
      .from('insurances')
      .select('id, type, policy_number, company, valid_to, price, created_at')
      .eq('household_id', householdId)
      .is('asset_id', null)
      .in('type', ['pzp', 'kasko', 'pzp_kasko', 'leasing'])
      .order('created_at', { ascending: false });

    // Get unlinked fines (without asset_id)
    const { data: unlinkedFines } = await supabase
      .from('fines')
      .select('id, fine_date, fine_amount, is_paid, description, created_at')
      .eq('household_id', householdId)
      .is('asset_id', null)
      .order('created_at', { ascending: false });

    const response = {
      loans: (unlinkedLoans || []).map(l => ({
        id: l.id,
        name: l.name,
        lender: l.lender,
        principal: Number(l.principal),
        status: l.status,
        loanPurpose: l.loan_purpose,
        createdAt: l.created_at,
      })),
      insurances: (unlinkedInsurances || []).map(i => ({
        id: i.id,
        type: i.type,
        policyNumber: i.policy_number,
        company: i.company,
        validTo: i.valid_to,
        price: Number(i.price),
        createdAt: i.created_at,
      })),
      fines: (unlinkedFines || []).map(f => ({
        id: f.id,
        fineDate: f.fine_date,
        fineAmount: Number(f.fine_amount),
        isPaid: f.is_paid,
        description: f.description,
        createdAt: f.created_at,
      })),
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error('GET /api/vehicles/unlinked error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
