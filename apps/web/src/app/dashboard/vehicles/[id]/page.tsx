import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VehicleDetailClient } from './VehicleDetailClient';

export default async function VehicleDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}): Promise<React.ReactNode> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get vehicle from assets table
  const { data: vehicleData, error: vehicleError } = await supabase
    .from('assets')
    .select('*')
    .eq('id', id)
    .eq('kind', 'vehicle')
    .single();

  if (vehicleError || !vehicleData) {
    notFound();
  }

  // Verify user has access to this household
  const { data: membership } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', vehicleData.household_id)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    notFound();
  }

  // Get linked loans
  const { data: loans } = await supabase
    .from('loans')
    .select(`
      id, name, lender, principal, status,
      loan_schedules(
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
    .select('id, type, policy_number, company, valid_to, price')
    .eq('asset_id', id)
    .order('valid_to', { ascending: true });

  // Get vehicle documents (STK, EK, vignettes)
  const { data: documents } = await supabase
    .from('vehicle_documents')
    .select('id, document_type, valid_to, price')
    .eq('asset_id', id)
    .order('valid_to', { ascending: true });

  // Get service records
  const { data: serviceRecords } = await supabase
    .from('service_records')
    .select('id, service_date, service_type, price, km_state, description')
    .eq('asset_id', id)
    .order('service_date', { ascending: false });

  // Get fines
  const { data: fines } = await supabase
    .from('fines')
    .select('id, fine_date, fine_amount, is_paid, description')
    .eq('asset_id', id)
    .order('fine_date', { ascending: false });

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Transform linked loans
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
    isActive: new Date(ins.valid_to) >= now,
  }));

  const linkedDocuments = (documents || []).map(doc => ({
    id: doc.id,
    documentType: doc.document_type,
    validTo: doc.valid_to,
    price: doc.price ? Number(doc.price) : undefined,
    isValid: new Date(doc.valid_to) >= now,
  }));

  const linkedServiceRecords = (serviceRecords || []).map(sr => ({
    id: sr.id,
    serviceDate: sr.service_date,
    serviceType: sr.service_type,
    price: sr.price ? Number(sr.price) : undefined,
    kmState: sr.km_state,
    description: sr.description,
  }));

  const linkedFines = (fines || []).map(f => ({
    id: f.id,
    fineDate: f.fine_date,
    fineAmount: Number(f.fine_amount),
    isPaid: f.is_paid,
    description: f.description,
  }));

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

  const vehicle = {
    id: vehicleData.id,
    householdId: vehicleData.household_id,
    name: vehicleData.name,
    make: vehicleData.make,
    model: vehicleData.model,
    year: vehicleData.year,
    licensePlate: vehicleData.license_plate,
    vin: vehicleData.vin,
    registeredCompany: vehicleData.registered_company,
    color: vehicleData.color,
    bodyType: vehicleData.body_type,
    fuelType: vehicleData.fuel_type,
    engineCapacity: vehicleData.engine_capacity,
    enginePower: vehicleData.engine_power,
    transmission: vehicleData.transmission,
    driveType: vehicleData.drive_type,
    mileage: vehicleData.mileage,
    seats: vehicleData.seats,
    doors: vehicleData.doors,
    acquisitionValue: Number(vehicleData.acquisition_value),
    currentValue: Number(vehicleData.current_value),
    acquisitionDate: vehicleData.acquisition_date,
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
    },
  };

  return <VehicleDetailClient vehicle={vehicle} />;
}
