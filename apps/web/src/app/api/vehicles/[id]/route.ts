import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateVehicleSchema } from '@finapp/core';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/vehicles/[id]
 * Get a single vehicle with all details
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get vehicle from assets table
    const { data: vehicle, error: vehicleError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', id)
      .eq('kind', 'vehicle')
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Verify user has access to this household
    const { data: membership } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', vehicle.household_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get linked loans
    const { data: loans } = await supabase
      .from('loans')
      .select(`
        id, name, lender, principal, status,
        loan_schedules!inner(
          principal_balance_after,
          total_due,
          status
        )
      `)
      .eq('linked_asset_id', id)
      .order('created_at', { ascending: false });

    // Get linked insurances
    const { data: insurances } = await supabase
      .from('insurances')
      .select('id, type, policy_number, company, valid_to, price, file_paths, notes')
      .eq('asset_id', id)
      .order('valid_to', { ascending: true });

    // Get vehicle documents (STK, EK, vignettes, technical certificates)
    const { data: documents } = await supabase
      .from('vehicle_documents')
      .select('id, document_type, valid_from, valid_to, price, file_paths, notes')
      .eq('asset_id', id)
      .order('valid_to', { ascending: true });

    // Get service records
    const { data: serviceRecords } = await supabase
      .from('service_records')
      .select('id, service_date, service_type, price, km_state, description, file_paths, notes')
      .eq('asset_id', id)
      .order('service_date', { ascending: false });

    // Get fines
    const { data: fines } = await supabase
      .from('fines')
      .select('id, fine_date, fine_amount, is_paid, description, file_paths, notes')
      .eq('asset_id', id)
      .order('fine_date', { ascending: false });

    // Get loan documents for linked loans
    const loanIds = (loans || []).map(l => l.id);
    let loanDocuments: Array<{
      id: string;
      loan_id: string;
      document_type: string;
      name: string;
      file_path: string;
      file_size?: number;
      mime_type?: string;
      notes?: string;
      created_at: string;
    }> = [];
    
    if (loanIds.length > 0) {
      const { data: loanDocs } = await supabase
        .from('loan_documents')
        .select('id, loan_id, document_type, name, file_path, file_size, mime_type, notes, created_at')
        .in('loan_id', loanIds)
        .order('created_at', { ascending: false });
      loanDocuments = loanDocs || [];
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Transform vehicle data
    const vehicleData = {
      id: vehicle.id,
      householdId: vehicle.household_id,
      kind: vehicle.kind,
      name: vehicle.name,
      acquisitionValue: Number(vehicle.acquisition_value),
      currentValue: Number(vehicle.current_value),
      acquisitionDate: vehicle.acquisition_date,
      licensePlate: vehicle.license_plate,
      vin: vehicle.vin,
      registeredCompany: vehicle.registered_company,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      bodyType: vehicle.body_type,
      fuelType: vehicle.fuel_type,
      engineCapacity: vehicle.engine_capacity,
      enginePower: vehicle.engine_power,
      transmission: vehicle.transmission,
      driveType: vehicle.drive_type,
      mileage: vehicle.mileage,
      seats: vehicle.seats,
      doors: vehicle.doors,
      isIncomeGenerating: vehicle.is_income_generating,
      monthlyIncome: Number(vehicle.monthly_income || 0),
      monthlyExpenses: Number(vehicle.monthly_expenses || 0),
      assetStatus: vehicle.asset_status,
      createdAt: vehicle.created_at,
      updatedAt: vehicle.updated_at,
    };

    // Transform linked items
    const linkedLoans = (loans || []).map(loan => {
      const schedules = loan.loan_schedules || [];
      const pendingSchedules = schedules.filter((s: { status: string }) => s.status !== 'paid');
      const currentBalance = pendingSchedules.length > 0 
        ? Math.min(...pendingSchedules.map((s: { principal_balance_after: number }) => s.principal_balance_after))
        : 0;
      const monthlyPayment = schedules.length > 0 ? schedules[0].total_due : 0;

      return {
        id: loan.id,
        name: loan.name,
        lender: loan.lender,
        principal: Number(loan.principal),
        currentBalance: Number(currentBalance),
        monthlyPayment: Number(monthlyPayment),
        status: loan.status,
      };
    });

    const linkedInsurances = (insurances || []).map(ins => ({
      id: ins.id,
      type: ins.type,
      policyNumber: ins.policy_number,
      company: ins.company,
      validTo: ins.valid_to,
      price: Number(ins.price),
      filePaths: ins.file_paths,
      notes: ins.notes,
      isActive: new Date(ins.valid_to) >= now,
    }));

    const linkedDocuments = (documents || []).map(doc => ({
      id: doc.id,
      documentType: doc.document_type,
      validFrom: doc.valid_from,
      validTo: doc.valid_to,
      price: doc.price ? Number(doc.price) : undefined,
      filePaths: doc.file_paths,
      notes: doc.notes,
      isValid: new Date(doc.valid_to) >= now,
    }));

    const linkedServiceRecords = (serviceRecords || []).map(sr => ({
      id: sr.id,
      serviceDate: sr.service_date,
      serviceType: sr.service_type,
      price: sr.price ? Number(sr.price) : undefined,
      kmState: sr.km_state,
      description: sr.description,
      filePaths: sr.file_paths,
      notes: sr.notes,
    }));

    const linkedFines = (fines || []).map(f => ({
      id: f.id,
      fineDate: f.fine_date,
      fineAmount: Number(f.fine_amount),
      isPaid: f.is_paid,
      description: f.description,
      filePaths: f.file_paths,
      notes: f.notes,
    }));

    const linkedLoanDocuments = loanDocuments.map(ld => ({
      id: ld.id,
      loanId: ld.loan_id,
      documentType: ld.document_type,
      name: ld.name,
      filePath: ld.file_path,
      fileSize: ld.file_size,
      mimeType: ld.mime_type,
      notes: ld.notes,
      createdAt: ld.created_at,
    }));

    // Build unified allFiles array from all sources
    interface UnifiedFile {
      id: string;
      source: 'vehicle_document' | 'insurance' | 'service' | 'fine' | 'loan';
      sourceId: string;
      name: string;
      filePath: string;
      category: string;
      date?: string;
    }

    const allFiles: UnifiedFile[] = [];

    // Vehicle documents with files
    linkedDocuments.forEach(doc => {
      if (doc.filePaths && Array.isArray(doc.filePaths)) {
        doc.filePaths.forEach((fp: string, idx: number) => {
          allFiles.push({
            id: `vd-${doc.id}-${idx}`,
            source: 'vehicle_document',
            sourceId: doc.id,
            name: doc.notes || `${doc.documentType} dokument`,
            filePath: fp,
            category: doc.documentType,
            date: doc.validTo,
          });
        });
      }
    });

    // Insurance files
    linkedInsurances.forEach(ins => {
      if (ins.filePaths && Array.isArray(ins.filePaths)) {
        ins.filePaths.forEach((fp: string, idx: number) => {
          allFiles.push({
            id: `ins-${ins.id}-${idx}`,
            source: 'insurance',
            sourceId: ins.id,
            name: ins.notes || `${ins.type} poistka`,
            filePath: fp,
            category: 'insurance',
            date: ins.validTo,
          });
        });
      }
    });

    // Service record files
    linkedServiceRecords.forEach(sr => {
      if (sr.filePaths && Array.isArray(sr.filePaths)) {
        sr.filePaths.forEach((fp: string, idx: number) => {
          allFiles.push({
            id: `sr-${sr.id}-${idx}`,
            source: 'service',
            sourceId: sr.id,
            name: sr.notes || sr.description || 'Servisný záznam',
            filePath: fp,
            category: 'service',
            date: sr.serviceDate,
          });
        });
      }
    });

    // Fine files
    linkedFines.forEach(f => {
      if (f.filePaths && Array.isArray(f.filePaths)) {
        f.filePaths.forEach((fp: string, idx: number) => {
          allFiles.push({
            id: `fine-${f.id}-${idx}`,
            source: 'fine',
            sourceId: f.id,
            name: f.notes || f.description || 'Pokuta',
            filePath: fp,
            category: 'fine',
            date: f.fineDate,
          });
        });
      }
    });

    // Loan document files
    linkedLoanDocuments.forEach(ld => {
      if (ld.filePath) {
        allFiles.push({
          id: `loan-${ld.id}`,
          source: 'loan',
          sourceId: ld.id,
          name: ld.name || `Úverový dokument (${ld.documentType})`,
          filePath: ld.filePath,
          category: 'loan',
          date: ld.createdAt,
        });
      }
    });

    // Calculate summaries
    const totalLoanBalance = linkedLoans.reduce((sum, l) => sum + l.currentBalance, 0);
    const totalLoanPaid = linkedLoans.reduce((sum, l) => sum + (l.principal - l.currentBalance), 0);
    const totalInsuranceCost = linkedInsurances.reduce((sum, i) => sum + i.price, 0);
    const totalDocumentCost = linkedDocuments.reduce((sum, d) => sum + (d.price || 0), 0);
    const totalServiceCost = linkedServiceRecords.reduce((sum, s) => sum + (s.price || 0), 0);
    const totalFineAmount = linkedFines.reduce((sum, f) => sum + f.fineAmount, 0);

    const stkDoc = linkedDocuments.find(d => d.documentType === 'stk' && d.isValid);
    const ekDoc = linkedDocuments.find(d => d.documentType === 'ek' && d.isValid);
    const nearestInsurance = linkedInsurances.find(i => i.isActive);

    const response = {
      ...vehicleData,
      // Summaries
      loanCount: linkedLoans.length,
      totalLoanPaid,
      totalLoanBalance,
      insuranceCount: linkedInsurances.length,
      activeInsuranceCount: linkedInsurances.filter(i => i.isActive).length,
      totalInsuranceCost,
      nearestInsuranceExpiry: nearestInsurance?.validTo,
      documentCount: linkedDocuments.length,
      validDocumentCount: linkedDocuments.filter(d => d.isValid).length,
      totalDocumentCost,
      stkExpiry: stkDoc?.validTo,
      ekExpiry: ekDoc?.validTo,
      serviceCount: linkedServiceRecords.length,
      totalServiceCost,
      lastServiceDate: linkedServiceRecords[0]?.serviceDate,
      lastServiceKm: linkedServiceRecords[0]?.kmState,
      fineCount: linkedFines.length,
      unpaidFineCount: linkedFines.filter(f => !f.isPaid).length,
      totalFineAmount,
      unpaidFineAmount: linkedFines.filter(f => !f.isPaid).reduce((sum, f) => sum + f.fineAmount, 0),
      totalCostOfOwnership: totalLoanPaid + totalInsuranceCost + totalDocumentCost + totalServiceCost + totalFineAmount,
      // Alerts
      stkExpiringSoon: stkDoc ? new Date(stkDoc.validTo) <= thirtyDaysFromNow : false,
      ekExpiringSoon: ekDoc ? new Date(ekDoc.validTo) <= thirtyDaysFromNow : false,
      insuranceExpiringSoon: nearestInsurance ? new Date(nearestInsurance.validTo) <= thirtyDaysFromNow : false,
      // Linked items
      linkedItems: {
        loans: linkedLoans,
        insurances: linkedInsurances,
        documents: linkedDocuments,
        serviceRecords: linkedServiceRecords,
        fines: linkedFines,
        loanDocuments: linkedLoanDocuments,
        allFiles,
      },
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error('GET /api/vehicles/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/vehicles/[id]
 * Update a vehicle
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get existing vehicle
    const { data: existing, error: existingError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', id)
      .eq('kind', 'vehicle')
      .single();

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Verify user has access
    const { data: membership } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', existing.household_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const validatedInput = updateVehicleSchema.parse(body);

    // Build update object (only include fields that were provided)
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (validatedInput.name !== undefined) updateData.name = validatedInput.name;
    if (validatedInput.currentValue !== undefined) updateData.current_value = validatedInput.currentValue;
    if (validatedInput.licensePlate !== undefined) updateData.license_plate = validatedInput.licensePlate;
    if (validatedInput.vin !== undefined) updateData.vin = validatedInput.vin;
    if (validatedInput.registeredCompany !== undefined) updateData.registered_company = validatedInput.registeredCompany;
    if (validatedInput.make !== undefined) updateData.make = validatedInput.make;
    if (validatedInput.model !== undefined) updateData.model = validatedInput.model;
    if (validatedInput.year !== undefined) updateData.year = validatedInput.year;
    if (validatedInput.color !== undefined) updateData.color = validatedInput.color;
    if (validatedInput.bodyType !== undefined) updateData.body_type = validatedInput.bodyType;
    if (validatedInput.fuelType !== undefined) updateData.fuel_type = validatedInput.fuelType;
    if (validatedInput.engineCapacity !== undefined) updateData.engine_capacity = validatedInput.engineCapacity;
    if (validatedInput.enginePower !== undefined) updateData.engine_power = validatedInput.enginePower;
    if (validatedInput.transmission !== undefined) updateData.transmission = validatedInput.transmission;
    if (validatedInput.driveType !== undefined) updateData.drive_type = validatedInput.driveType;
    if (validatedInput.mileage !== undefined) updateData.mileage = validatedInput.mileage;
    if (validatedInput.seats !== undefined) updateData.seats = validatedInput.seats;
    if (validatedInput.doors !== undefined) updateData.doors = validatedInput.doors;
    if (validatedInput.isIncomeGenerating !== undefined) updateData.is_income_generating = validatedInput.isIncomeGenerating;
    if (validatedInput.monthlyIncome !== undefined) updateData.monthly_income = validatedInput.monthlyIncome;
    if (validatedInput.monthlyExpenses !== undefined) updateData.monthly_expenses = validatedInput.monthlyExpenses;
    if (validatedInput.assetStatus !== undefined) updateData.asset_status = validatedInput.assetStatus;

    const { data, error } = await supabase
      .from('assets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating vehicle:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log audit
    await logAudit({
      householdId: existing.household_id,
      userId: user.id,
      action: 'update',
      entityType: 'vehicle',
      entityId: id,
      changes: {
        old_value: existing,
        new_value: data,
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
      monthlyIncome: Number(data.monthly_income || 0),
      monthlyExpenses: Number(data.monthly_expenses || 0),
      assetStatus: data.asset_status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ data: vehicle });
  } catch (error) {
    console.error('PUT /api/vehicles/[id] error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/vehicles/[id]
 * Delete a vehicle
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get existing vehicle
    const { data: existing, error: existingError } = await supabase
      .from('assets')
      .select('household_id')
      .eq('id', id)
      .eq('kind', 'vehicle')
      .single();

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Verify user has access (owner only for delete)
    const { data: membership } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', existing.household_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only household owners can delete vehicles' }, { status: 403 });
    }

    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting vehicle:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log audit
    await logAudit({
      householdId: existing.household_id,
      userId: user.id,
      action: 'delete',
      entityType: 'vehicle',
      entityId: id,
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/vehicles/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
