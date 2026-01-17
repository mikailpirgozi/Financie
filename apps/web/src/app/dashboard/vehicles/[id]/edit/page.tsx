import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VehicleForm } from '@/components/vehicles';

export default async function EditVehiclePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}): Promise<React.ReactNode> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get vehicle
  const { data: vehicle, error } = await supabase
    .from('assets')
    .select('*')
    .eq('id', id)
    .eq('kind', 'vehicle')
    .single();

  if (error || !vehicle) {
    notFound();
  }

  // Verify user has access
  const { data: membership } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', vehicle.household_id)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    notFound();
  }

  // Transform to form data
  const initialData = {
    id: vehicle.id,
    name: vehicle.name,
    make: vehicle.make || '',
    model: vehicle.model || '',
    year: vehicle.year || '',
    bodyType: vehicle.body_type || '',
    fuelType: vehicle.fuel_type || '',
    engineCapacity: vehicle.engine_capacity || '',
    enginePower: vehicle.engine_power || '',
    transmission: vehicle.transmission || '',
    driveType: vehicle.drive_type || '',
    color: vehicle.color || '',
    doors: vehicle.doors || '',
    seats: vehicle.seats || '',
    mileage: vehicle.mileage || '',
    acquisitionValue: Number(vehicle.acquisition_value),
    currentValue: Number(vehicle.current_value),
    acquisitionDate: vehicle.acquisition_date,
    licensePlate: vehicle.license_plate || '',
    vin: vehicle.vin || '',
    registeredCompany: vehicle.registered_company || '',
  };

  const vehicleTitle = vehicle.make && vehicle.model 
    ? `${vehicle.make} ${vehicle.model}`
    : vehicle.name;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/dashboard/vehicles/${id}`} className="text-sm text-muted-foreground hover:underline">
          ← Späť na detail
        </Link>
        <h1 className="text-3xl font-bold mt-2">Upraviť vozidlo</h1>
        <p className="text-muted-foreground">
          {vehicleTitle}
        </p>
      </div>

      <VehicleForm 
        householdId={vehicle.household_id} 
        initialData={initialData}
        mode="edit" 
      />
    </div>
  );
}
