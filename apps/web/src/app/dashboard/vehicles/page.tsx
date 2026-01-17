import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@finapp/ui';
import { Card, CardContent } from '@finapp/ui';
import { VehiclesClient } from './VehiclesClient';
import type { VehicleStats } from '@finapp/core';

interface VehicleResponse {
  id: string;
  householdId: string;
  name: string;
  make?: string;
  model?: string;
  year?: number;
  licensePlate?: string;
  vin?: string;
  registeredCompany?: string;
  fuelType?: string;
  mileage?: number;
  acquisitionValue: number;
  currentValue: number;
  acquisitionDate: string;
  loanCount: number;
  totalLoanPaid: number;
  totalLoanBalance: number;
  insuranceCount: number;
  activeInsuranceCount: number;
  totalInsuranceCost: number;
  nearestInsuranceExpiry?: string;
  documentCount: number;
  validDocumentCount: number;
  totalDocumentCost: number;
  stkExpiry?: string;
  ekExpiry?: string;
  serviceCount: number;
  totalServiceCost: number;
  lastServiceDate?: string;
  lastServiceKm?: number;
  fineCount: number;
  unpaidFineCount: number;
  totalFineAmount: number;
  unpaidFineAmount: number;
  totalCostOfOwnership: number;
  stkExpiringSoon: boolean;
  ekExpiringSoon: boolean;
  insuranceExpiringSoon: boolean;
  createdAt: string;
  updatedAt: string;
}

async function getVehiclesData(userId: string): Promise<{
  householdId: string;
  vehicles: VehicleResponse[];
  stats: VehicleStats;
  filters: { companies: string[]; makes: string[]; years: number[] };
} | null> {
  const supabase = await createClient();
  
  // Get user's household
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .single();

  if (!membership) {
    return null;
  }

  // Use the vehicle_tco_summary view
  const { data, error } = await supabase
    .from('vehicle_tco_summary')
    .select('*')
    .eq('household_id', membership.household_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching vehicles:', error);
    return null;
  }

  const vehicles: VehicleResponse[] = (data || []).map(item => ({
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
    loanCount: item.loan_count,
    totalLoanPaid: Number(item.total_loan_paid),
    totalLoanBalance: Number(item.total_loan_balance),
    insuranceCount: item.insurance_count,
    activeInsuranceCount: item.active_insurance_count,
    totalInsuranceCost: Number(item.total_insurance_cost),
    nearestInsuranceExpiry: item.nearest_insurance_expiry,
    documentCount: item.document_count,
    validDocumentCount: item.valid_document_count,
    totalDocumentCost: Number(item.total_document_cost),
    stkExpiry: item.stk_expiry,
    ekExpiry: item.ek_expiry,
    serviceCount: item.service_count,
    totalServiceCost: Number(item.total_service_cost),
    lastServiceDate: item.last_service_date,
    lastServiceKm: item.last_service_km,
    fineCount: item.fine_count,
    unpaidFineCount: item.unpaid_fine_count,
    totalFineAmount: Number(item.total_fine_amount),
    unpaidFineAmount: Number(item.unpaid_fine_amount),
    totalCostOfOwnership: Number(item.total_cost_of_ownership),
    stkExpiringSoon: item.stk_expiring_soon,
    ekExpiringSoon: item.ek_expiring_soon,
    insuranceExpiringSoon: item.insurance_expiring_soon,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));

  // Calculate stats
  const stats: VehicleStats = {
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

  // Get unique filter values
  const filters = {
    companies: [...new Set(vehicles.map(v => v.registeredCompany).filter((c): c is string => !!c))],
    makes: [...new Set(vehicles.map(v => v.make).filter((m): m is string => !!m))],
    years: [...new Set(vehicles.map(v => v.year).filter((y): y is number => !!y))].sort((a, b) => b - a),
  };

  return { householdId: membership.household_id, vehicles, stats, filters };
}

export default async function VehiclesPage(): Promise<React.ReactNode> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const vehiclesData = await getVehiclesData(user.id);
  
  if (!vehiclesData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Vozidlá</h1>
          <p className="text-muted-foreground">Správa vašich vozidiel</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🚫</div>
            <h3 className="text-lg font-semibold mb-2">Žiadna domácnosť</h3>
            <p className="text-muted-foreground text-center mb-4">
              Nemáte priradenú žiadnu domácnosť.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { householdId, vehicles, stats, filters } = vehiclesData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vozidlá</h1>
          <p className="text-muted-foreground">
            Správa vašich vozidiel a súvisiacich nákladov
          </p>
        </div>
        <Link href="/dashboard/vehicles/new">
          <Button>+ Nové vozidlo</Button>
        </Link>
      </div>

      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🚗</div>
            <h3 className="text-lg font-semibold mb-2">Žiadne vozidlá</h3>
            <p className="text-muted-foreground text-center mb-4">
              Zatiaľ nemáte pridané žiadne vozidlo. Začnite pridaním nového vozidla.
            </p>
            <Link href="/dashboard/vehicles/new">
              <Button>Pridať prvé vozidlo</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <VehiclesClient 
          vehicles={vehicles} 
          stats={stats} 
          filters={filters}
          householdId={householdId}
        />
      )}
    </div>
  );
}
