import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createVehicleSchema } from '@finapp/core';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/vehicles
 * List all vehicles for a household with optional filters
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
    const registeredCompany = searchParams.get('registeredCompany');
    const make = searchParams.get('make');
    const year = searchParams.get('year');
    const search = searchParams.get('search');

    if (!householdId) {
      return NextResponse.json({ error: 'householdId is required' }, { status: 400 });
    }

    // Use the vehicle_tco_summary view for comprehensive data
    let query = supabase
      .from('vehicle_tco_summary')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (registeredCompany) {
      query = query.eq('registered_company', registeredCompany);
    }

    if (make) {
      query = query.ilike('make', `%${make}%`);
    }

    if (year) {
      query = query.eq('year', parseInt(year));
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,license_plate.ilike.%${search}%,make.ilike.%${search}%,model.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to camelCase
    const vehicles = data?.map(item => ({
      id: item.id,
      householdId: item.household_id,
      name: item.name,
      make: item.make,
      model: item.model,
      year: item.year,
      licensePlate: item.license_plate,
      vin: item.vin,
      registeredCompany: item.registered_company,
      fuelType: item.fuel_type,
      mileage: item.mileage,
      acquisitionValue: Number(item.acquisition_value),
      currentValue: Number(item.current_value),
      acquisitionDate: item.acquisition_date,
      // Loan summary
      loanCount: item.loan_count,
      totalLoanPaid: Number(item.total_loan_paid),
      totalLoanBalance: Number(item.total_loan_balance),
      // Insurance summary
      insuranceCount: item.insurance_count,
      activeInsuranceCount: item.active_insurance_count,
      totalInsuranceCost: Number(item.total_insurance_cost),
      nearestInsuranceExpiry: item.nearest_insurance_expiry,
      // Document summary
      documentCount: item.document_count,
      validDocumentCount: item.valid_document_count,
      totalDocumentCost: Number(item.total_document_cost),
      stkExpiry: item.stk_expiry,
      ekExpiry: item.ek_expiry,
      // Service summary
      serviceCount: item.service_count,
      totalServiceCost: Number(item.total_service_cost),
      lastServiceDate: item.last_service_date,
      lastServiceKm: item.last_service_km,
      // Fines summary
      fineCount: item.fine_count,
      unpaidFineCount: item.unpaid_fine_count,
      totalFineAmount: Number(item.total_fine_amount),
      unpaidFineAmount: Number(item.unpaid_fine_amount),
      // TCO
      totalCostOfOwnership: Number(item.total_cost_of_ownership),
      // Alerts
      stkExpiringSoon: item.stk_expiring_soon,
      ekExpiringSoon: item.ek_expiring_soon,
      insuranceExpiringSoon: item.insurance_expiring_soon,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    })) || [];

    // Calculate stats
    const stats = {
      totalCount: vehicles.length,
      totalValue: vehicles.reduce((sum, v) => sum + v.currentValue, 0),
      totalAcquisitionValue: vehicles.reduce((sum, v) => sum + v.acquisitionValue, 0),
      expiringSoonCount: vehicles.filter(v => 
        v.stkExpiringSoon || v.ekExpiringSoon || v.insuranceExpiringSoon
      ).length,
      withActiveLoansCount: vehicles.filter(v => v.totalLoanBalance > 0).length,
      totalLoanBalance: vehicles.reduce((sum, v) => sum + v.totalLoanBalance, 0),
      totalTco: vehicles.reduce((sum, v) => sum + v.totalCostOfOwnership, 0),
    };

    // Get unique companies for filter dropdown
    const uniqueCompanies = [...new Set(vehicles.map(v => v.registeredCompany).filter(Boolean))];
    const uniqueMakes = [...new Set(vehicles.map(v => v.make).filter(Boolean))];
    const uniqueYears = [...new Set(vehicles.map(v => v.year).filter(Boolean))].sort((a, b) => (b ?? 0) - (a ?? 0));

    return NextResponse.json({ 
      data: vehicles, 
      stats,
      filters: {
        companies: uniqueCompanies,
        makes: uniqueMakes,
        years: uniqueYears,
      }
    });
  } catch (error) {
    console.error('GET /api/vehicles error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vehicles
 * Create a new vehicle
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate input
    const validatedInput = createVehicleSchema.parse({
      ...body,
      acquisitionDate: new Date(body.acquisitionDate),
    });

    // Convert to snake_case for database
    const dbData = {
      household_id: validatedInput.householdId,
      kind: 'vehicle' as const,
      name: validatedInput.name,
      acquisition_value: validatedInput.acquisitionValue,
      current_value: validatedInput.currentValue,
      acquisition_date: validatedInput.acquisitionDate.toISOString().split('T')[0],
      // Vehicle-specific fields
      license_plate: validatedInput.licensePlate || null,
      vin: validatedInput.vin || null,
      registered_company: validatedInput.registeredCompany || null,
      make: validatedInput.make || null,
      model: validatedInput.model || null,
      year: validatedInput.year || null,
      color: validatedInput.color || null,
      body_type: validatedInput.bodyType || null,
      fuel_type: validatedInput.fuelType || null,
      engine_capacity: validatedInput.engineCapacity || null,
      engine_power: validatedInput.enginePower || null,
      transmission: validatedInput.transmission || null,
      drive_type: validatedInput.driveType || null,
      mileage: validatedInput.mileage || null,
      seats: validatedInput.seats || null,
      doors: validatedInput.doors || null,
      // Portfolio fields
      is_income_generating: validatedInput.isIncomeGenerating,
      monthly_income: validatedInput.monthlyIncome,
      monthly_expenses: validatedInput.monthlyExpenses,
      asset_status: validatedInput.assetStatus,
    };

    const { data, error } = await supabase
      .from('assets')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      console.error('Error creating vehicle:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log audit
    await logAudit({
      householdId: validatedInput.householdId,
      userId: user.id,
      action: 'create',
      entityType: 'vehicle',
      entityId: data.id,
      changes: {
        new_value: validatedInput,
      },
      request,
    });

    // Transform to camelCase
    const vehicle = {
      id: data.id,
      householdId: data.household_id,
      kind: data.kind,
      name: data.name,
      acquisitionValue: Number(data.acquisition_value),
      currentValue: Number(data.current_value),
      acquisitionDate: data.acquisition_date,
      licensePlate: data.license_plate,
      vin: data.vin,
      registeredCompany: data.registered_company,
      make: data.make,
      model: data.model,
      year: data.year,
      color: data.color,
      bodyType: data.body_type,
      fuelType: data.fuel_type,
      engineCapacity: data.engine_capacity,
      enginePower: data.engine_power,
      transmission: data.transmission,
      driveType: data.drive_type,
      mileage: data.mileage,
      seats: data.seats,
      doors: data.doors,
      isIncomeGenerating: data.is_income_generating,
      monthlyIncome: Number(data.monthly_income),
      monthlyExpenses: Number(data.monthly_expenses),
      assetStatus: data.asset_status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ data: vehicle }, { status: 201 });
  } catch (error) {
    console.error('POST /api/vehicles error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
