import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { linkToVehicleSchema } from '@finapp/core';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/vehicles/[id]/link
 * Link existing loans, insurances, documents, etc. to a vehicle
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get vehicle and verify it exists
    const { data: vehicle, error: vehicleError } = await supabase
      .from('assets')
      .select('household_id')
      .eq('id', vehicleId)
      .eq('kind', 'vehicle')
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Verify user has access
    const { data: membership } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', vehicle.household_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const validatedInput = linkToVehicleSchema.parse({
      ...body,
      vehicleId,
    });

    const results = {
      loans: { linked: 0, errors: [] as string[] },
      insurances: { linked: 0, errors: [] as string[] },
      documents: { linked: 0, errors: [] as string[] },
      serviceRecords: { linked: 0, errors: [] as string[] },
      fines: { linked: 0, errors: [] as string[] },
    };

    // Link loans
    if (validatedInput.loanIds && validatedInput.loanIds.length > 0) {
      for (const loanId of validatedInput.loanIds) {
        // Verify loan exists and belongs to same household
        const { data: loan, error: loanError } = await supabase
          .from('loans')
          .select('household_id')
          .eq('id', loanId)
          .single();

        if (loanError || !loan) {
          results.loans.errors.push(`Loan ${loanId} not found`);
          continue;
        }

        if (loan.household_id !== vehicle.household_id) {
          results.loans.errors.push(`Loan ${loanId} belongs to different household`);
          continue;
        }

        const { error: updateError } = await supabase
          .from('loans')
          .update({ linked_asset_id: vehicleId })
          .eq('id', loanId);

        if (updateError) {
          results.loans.errors.push(`Failed to link loan ${loanId}: ${updateError.message}`);
        } else {
          results.loans.linked++;
        }
      }
    }

    // Link insurances
    if (validatedInput.insuranceIds && validatedInput.insuranceIds.length > 0) {
      for (const insuranceId of validatedInput.insuranceIds) {
        const { data: insurance, error: insError } = await supabase
          .from('insurances')
          .select('household_id')
          .eq('id', insuranceId)
          .single();

        if (insError || !insurance) {
          results.insurances.errors.push(`Insurance ${insuranceId} not found`);
          continue;
        }

        if (insurance.household_id !== vehicle.household_id) {
          results.insurances.errors.push(`Insurance ${insuranceId} belongs to different household`);
          continue;
        }

        const { error: updateError } = await supabase
          .from('insurances')
          .update({ asset_id: vehicleId })
          .eq('id', insuranceId);

        if (updateError) {
          results.insurances.errors.push(`Failed to link insurance ${insuranceId}: ${updateError.message}`);
        } else {
          results.insurances.linked++;
        }
      }
    }

    // Link vehicle documents (already requires asset_id, but can change it)
    if (validatedInput.documentIds && validatedInput.documentIds.length > 0) {
      for (const docId of validatedInput.documentIds) {
        const { data: doc, error: docError } = await supabase
          .from('vehicle_documents')
          .select('household_id')
          .eq('id', docId)
          .single();

        if (docError || !doc) {
          results.documents.errors.push(`Document ${docId} not found`);
          continue;
        }

        if (doc.household_id !== vehicle.household_id) {
          results.documents.errors.push(`Document ${docId} belongs to different household`);
          continue;
        }

        const { error: updateError } = await supabase
          .from('vehicle_documents')
          .update({ asset_id: vehicleId })
          .eq('id', docId);

        if (updateError) {
          results.documents.errors.push(`Failed to link document ${docId}: ${updateError.message}`);
        } else {
          results.documents.linked++;
        }
      }
    }

    // Link service records
    if (validatedInput.serviceRecordIds && validatedInput.serviceRecordIds.length > 0) {
      for (const recordId of validatedInput.serviceRecordIds) {
        const { data: record, error: recordError } = await supabase
          .from('service_records')
          .select('household_id')
          .eq('id', recordId)
          .single();

        if (recordError || !record) {
          results.serviceRecords.errors.push(`Service record ${recordId} not found`);
          continue;
        }

        if (record.household_id !== vehicle.household_id) {
          results.serviceRecords.errors.push(`Service record ${recordId} belongs to different household`);
          continue;
        }

        const { error: updateError } = await supabase
          .from('service_records')
          .update({ asset_id: vehicleId })
          .eq('id', recordId);

        if (updateError) {
          results.serviceRecords.errors.push(`Failed to link service record ${recordId}: ${updateError.message}`);
        } else {
          results.serviceRecords.linked++;
        }
      }
    }

    // Link fines
    if (validatedInput.fineIds && validatedInput.fineIds.length > 0) {
      for (const fineId of validatedInput.fineIds) {
        const { data: fine, error: fineError } = await supabase
          .from('fines')
          .select('household_id')
          .eq('id', fineId)
          .single();

        if (fineError || !fine) {
          results.fines.errors.push(`Fine ${fineId} not found`);
          continue;
        }

        if (fine.household_id !== vehicle.household_id) {
          results.fines.errors.push(`Fine ${fineId} belongs to different household`);
          continue;
        }

        const { error: updateError } = await supabase
          .from('fines')
          .update({ asset_id: vehicleId })
          .eq('id', fineId);

        if (updateError) {
          results.fines.errors.push(`Failed to link fine ${fineId}: ${updateError.message}`);
        } else {
          results.fines.linked++;
        }
      }
    }

    // Log audit
    await logAudit({
      householdId: vehicle.household_id,
      userId: user.id,
      action: 'update',
      entityType: 'vehicle',
      entityId: vehicleId,
      changes: {
        new_value: {
          action: 'link_records',
          results,
        },
      },
      request,
    });

    // Update asset-loan metrics if loans were linked
    if (results.loans.linked > 0) {
      await supabase.rpc('update_asset_loan_metrics', {
        p_household_id: vehicle.household_id,
      });
    }

    const totalLinked = 
      results.loans.linked + 
      results.insurances.linked + 
      results.documents.linked + 
      results.serviceRecords.linked + 
      results.fines.linked;

    const totalErrors = 
      results.loans.errors.length + 
      results.insurances.errors.length + 
      results.documents.errors.length + 
      results.serviceRecords.errors.length + 
      results.fines.errors.length;

    return NextResponse.json({
      success: true,
      message: `Successfully linked ${totalLinked} records to vehicle${totalErrors > 0 ? `, ${totalErrors} failed` : ''}`,
      results,
    });
  } catch (error) {
    console.error('POST /api/vehicles/[id]/link error:', error);
    
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
 * DELETE /api/vehicles/[id]/link
 * Unlink records from a vehicle
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get vehicle
    const { data: vehicle, error: vehicleError } = await supabase
      .from('assets')
      .select('household_id')
      .eq('id', vehicleId)
      .eq('kind', 'vehicle')
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Verify user has access
    const { data: membership } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', vehicle.household_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { loanIds, insuranceIds, fineIds } = body;

    const results = {
      loans: { unlinked: 0, errors: [] as string[] },
      insurances: { unlinked: 0, errors: [] as string[] },
      fines: { unlinked: 0, errors: [] as string[] },
    };

    // Unlink loans
    if (loanIds && loanIds.length > 0) {
      for (const loanId of loanIds) {
        const { error: updateError } = await supabase
          .from('loans')
          .update({ linked_asset_id: null })
          .eq('id', loanId)
          .eq('linked_asset_id', vehicleId);

        if (updateError) {
          results.loans.errors.push(`Failed to unlink loan ${loanId}`);
        } else {
          results.loans.unlinked++;
        }
      }
    }

    // Unlink insurances
    if (insuranceIds && insuranceIds.length > 0) {
      for (const insuranceId of insuranceIds) {
        const { error: updateError } = await supabase
          .from('insurances')
          .update({ asset_id: null })
          .eq('id', insuranceId)
          .eq('asset_id', vehicleId);

        if (updateError) {
          results.insurances.errors.push(`Failed to unlink insurance ${insuranceId}`);
        } else {
          results.insurances.unlinked++;
        }
      }
    }

    // Unlink fines
    if (fineIds && fineIds.length > 0) {
      for (const fineId of fineIds) {
        const { error: updateError } = await supabase
          .from('fines')
          .update({ asset_id: null })
          .eq('id', fineId)
          .eq('asset_id', vehicleId);

        if (updateError) {
          results.fines.errors.push(`Failed to unlink fine ${fineId}`);
        } else {
          results.fines.unlinked++;
        }
      }
    }

    // Log audit
    await logAudit({
      householdId: vehicle.household_id,
      userId: user.id,
      action: 'update',
      entityType: 'vehicle',
      entityId: vehicleId,
      changes: {
        new_value: {
          action: 'unlink_records',
          results,
        },
      },
      request,
    });

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('DELETE /api/vehicles/[id]/link error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
