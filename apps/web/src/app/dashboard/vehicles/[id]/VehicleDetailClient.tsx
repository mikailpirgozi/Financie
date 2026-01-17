'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Gauge,
  CreditCard,
  Shield,
  FileCheck,
  Wrench,
  AlertTriangle,
  Edit,
  Trash2,
  Plus,
  ExternalLink,
  Fuel,
  Settings,
  DoorOpen,
  Users,
  Palette,
  Hash,
} from 'lucide-react';
import { Button } from '@finapp/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@finapp/ui';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeleteDialog } from '@/components/DeleteDialog';
import { formatCurrency } from '@/lib/formatters';

interface LinkedLoan {
  id: string;
  name?: string;
  lender: string;
  principal: number;
  currentBalance: number;
  monthlyPayment: number;
  status: string;
}

interface LinkedInsurance {
  id: string;
  type: string;
  policyNumber: string;
  company?: string;
  validTo: string;
  price: number;
  isActive: boolean;
}

interface LinkedDocument {
  id: string;
  documentType: string;
  validTo: string;
  price?: number;
  isValid: boolean;
}

interface LinkedServiceRecord {
  id: string;
  serviceDate: string;
  serviceType?: string;
  price?: number;
  kmState?: number;
  description?: string;
}

interface LinkedFine {
  id: string;
  fineDate: string;
  fineAmount: number;
  isPaid: boolean;
  description?: string;
}

interface VehicleData {
  id: string;
  householdId: string;
  name: string;
  make?: string;
  model?: string;
  year?: number;
  licensePlate?: string;
  vin?: string;
  registeredCompany?: string;
  color?: string;
  bodyType?: string;
  fuelType?: string;
  engineCapacity?: number;
  enginePower?: number;
  transmission?: string;
  driveType?: string;
  mileage?: number;
  seats?: number;
  doors?: number;
  acquisitionValue: number;
  currentValue: number;
  acquisitionDate: string;
  // Summaries
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
  // Alerts
  stkExpiringSoon: boolean;
  ekExpiringSoon: boolean;
  insuranceExpiringSoon: boolean;
  // Linked items
  linkedItems: {
    loans: LinkedLoan[];
    insurances: LinkedInsurance[];
    documents: LinkedDocument[];
    serviceRecords: LinkedServiceRecord[];
    fines: LinkedFine[];
  };
}

interface VehicleDetailClientProps {
  vehicle: VehicleData;
}

const FUEL_TYPE_LABELS: Record<string, string> = {
  petrol: 'Benzín',
  diesel: 'Diesel',
  electric: 'Elektro',
  hybrid: 'Hybrid',
  lpg: 'LPG',
  cng: 'CNG',
};

const BODY_TYPE_LABELS: Record<string, string> = {
  sedan: 'Sedan',
  suv: 'SUV',
  hatchback: 'Hatchback',
  wagon: 'Kombi',
  coupe: 'Kupé',
  van: 'Van',
  pickup: 'Pickup',
  other: 'Iné',
};

const TRANSMISSION_LABELS: Record<string, string> = {
  manual: 'Manuál',
  automatic: 'Automat',
};

const DRIVE_TYPE_LABELS: Record<string, string> = {
  fwd: 'Predný pohon',
  rwd: 'Zadný pohon',
  awd: '4x4',
};

const INSURANCE_TYPE_LABELS: Record<string, string> = {
  pzp: 'PZP',
  kasko: 'Kasko',
  pzp_kasko: 'PZP + Kasko',
  leasing: 'Leasing',
  property: 'Majetková',
  life: 'Životná',
  other: 'Iná',
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  stk: 'STK',
  ek: 'Emisná kontrola',
  vignette: 'Diaľničná známka',
  technical_certificate: 'Technický preukaz',
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  regular: 'Pravidelný servis',
  repair: 'Oprava',
  tire_change: 'Prezutie',
  inspection: 'Kontrola',
  other: 'Iné',
};

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('sk-SK');
}

function getDaysUntil(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function VehicleDetailClient({ vehicle }: VehicleDetailClientProps): React.JSX.Element {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  const handleDelete = async () => {
    const response = await fetch(`/api/vehicles/${vehicle.id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Nepodarilo sa zmazať vozidlo');
    }

    router.push('/dashboard/vehicles');
  };

  const hasAlerts = vehicle.stkExpiringSoon || vehicle.ekExpiringSoon || vehicle.insuranceExpiringSoon;
  const equity = vehicle.currentValue - vehicle.totalLoanBalance;
  const ltvRatio = vehicle.currentValue > 0 
    ? (vehicle.totalLoanBalance / vehicle.currentValue) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/vehicles" className="text-sm text-muted-foreground hover:underline">
            ← Späť na vozidlá
          </Link>
          <h1 className="text-3xl font-bold mt-2">
            {vehicle.make && vehicle.model 
              ? `${vehicle.make} ${vehicle.model}`
              : vehicle.name
            }
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            {vehicle.licensePlate && (
              <span className="font-mono bg-muted px-2 py-0.5 rounded">{vehicle.licensePlate}</span>
            )}
            {vehicle.year && <span>• {vehicle.year}</span>}
            {vehicle.registeredCompany && (
              <>
                <span>•</span>
                <Building2 className="h-4 w-4" />
                <span>{vehicle.registeredCompany}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/vehicles/${vehicle.id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Upraviť
            </Button>
          </Link>
          <DeleteDialog
            title="Zmazať vozidlo"
            description={`Naozaj chcete zmazať vozidlo "${vehicle.name}"? Táto akcia je nevratná.`}
            onConfirm={handleDelete}
            trigger={
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Zmazať
              </Button>
            }
          />
        </div>
      </div>

      {/* Alerts */}
      {hasAlerts && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800 dark:text-amber-200">Upozornenia</h3>
                <ul className="text-sm text-amber-700 dark:text-amber-300 mt-1 space-y-1">
                  {vehicle.stkExpiringSoon && (
                    <li>STK končí {formatDate(vehicle.stkExpiry)} ({getDaysUntil(vehicle.stkExpiry)} dní)</li>
                  )}
                  {vehicle.ekExpiringSoon && (
                    <li>Emisná kontrola končí {formatDate(vehicle.ekExpiry)} ({getDaysUntil(vehicle.ekExpiry)} dní)</li>
                  )}
                  {vehicle.insuranceExpiringSoon && (
                    <li>Poistenie končí {formatDate(vehicle.nearestInsuranceExpiry)} ({getDaysUntil(vehicle.nearestInsuranceExpiry)} dní)</li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aktuálna hodnota
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(vehicle.currentValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Nákupná: {formatCurrency(vehicle.acquisitionValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Zostatok úveru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(vehicle.totalLoanBalance)}</div>
            {vehicle.loanCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                LTV: {ltvRatio.toFixed(1)}%
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vlastný kapitál
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${equity < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(equity)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              hodnota - úver
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              TCO (Celkové náklady)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(vehicle.totalCostOfOwnership)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              všetky zaznamenané náklady
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Prehľad</TabsTrigger>
          <TabsTrigger value="loans">
            Úvery ({vehicle.loanCount})
          </TabsTrigger>
          <TabsTrigger value="insurance">
            Poistenie ({vehicle.insuranceCount})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Dokumenty ({vehicle.documentCount})
          </TabsTrigger>
          <TabsTrigger value="service">
            Servis ({vehicle.serviceCount})
          </TabsTrigger>
          <TabsTrigger value="fines">
            Pokuty ({vehicle.fineCount})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Technical Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Technické údaje
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  {vehicle.make && (
                    <div>
                      <dt className="text-muted-foreground">Značka</dt>
                      <dd className="font-medium">{vehicle.make}</dd>
                    </div>
                  )}
                  {vehicle.model && (
                    <div>
                      <dt className="text-muted-foreground">Model</dt>
                      <dd className="font-medium">{vehicle.model}</dd>
                    </div>
                  )}
                  {vehicle.year && (
                    <div>
                      <dt className="text-muted-foreground">Rok výroby</dt>
                      <dd className="font-medium">{vehicle.year}</dd>
                    </div>
                  )}
                  {vehicle.bodyType && (
                    <div>
                      <dt className="text-muted-foreground">Karoséria</dt>
                      <dd className="font-medium">{BODY_TYPE_LABELS[vehicle.bodyType] || vehicle.bodyType}</dd>
                    </div>
                  )}
                  {vehicle.color && (
                    <div>
                      <dt className="text-muted-foreground">Farba</dt>
                      <dd className="font-medium flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        {vehicle.color}
                      </dd>
                    </div>
                  )}
                  {vehicle.fuelType && (
                    <div>
                      <dt className="text-muted-foreground">Palivo</dt>
                      <dd className="font-medium flex items-center gap-2">
                        <Fuel className="h-4 w-4" />
                        {FUEL_TYPE_LABELS[vehicle.fuelType] || vehicle.fuelType}
                      </dd>
                    </div>
                  )}
                  {vehicle.engineCapacity && (
                    <div>
                      <dt className="text-muted-foreground">Objem motora</dt>
                      <dd className="font-medium">{vehicle.engineCapacity.toLocaleString('sk-SK')} cm³</dd>
                    </div>
                  )}
                  {vehicle.enginePower && (
                    <div>
                      <dt className="text-muted-foreground">Výkon</dt>
                      <dd className="font-medium">{vehicle.enginePower} kW ({Math.round(vehicle.enginePower * 1.36)} HP)</dd>
                    </div>
                  )}
                  {vehicle.transmission && (
                    <div>
                      <dt className="text-muted-foreground">Prevodovka</dt>
                      <dd className="font-medium">{TRANSMISSION_LABELS[vehicle.transmission] || vehicle.transmission}</dd>
                    </div>
                  )}
                  {vehicle.driveType && (
                    <div>
                      <dt className="text-muted-foreground">Pohon</dt>
                      <dd className="font-medium">{DRIVE_TYPE_LABELS[vehicle.driveType] || vehicle.driveType}</dd>
                    </div>
                  )}
                  {vehicle.doors && (
                    <div>
                      <dt className="text-muted-foreground">Dvere</dt>
                      <dd className="font-medium flex items-center gap-2">
                        <DoorOpen className="h-4 w-4" />
                        {vehicle.doors}
                      </dd>
                    </div>
                  )}
                  {vehicle.seats && (
                    <div>
                      <dt className="text-muted-foreground">Počet miest</dt>
                      <dd className="font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {vehicle.seats}
                      </dd>
                    </div>
                  )}
                  {vehicle.mileage && (
                    <div>
                      <dt className="text-muted-foreground">Najazdené km</dt>
                      <dd className="font-medium flex items-center gap-2">
                        <Gauge className="h-4 w-4" />
                        {vehicle.mileage.toLocaleString('sk-SK')} km
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* Identification */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  Identifikácia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-4 text-sm">
                  {vehicle.licensePlate && (
                    <div>
                      <dt className="text-muted-foreground">ŠPZ</dt>
                      <dd className="font-mono text-lg font-bold bg-muted px-3 py-1 rounded inline-block">
                        {vehicle.licensePlate}
                      </dd>
                    </div>
                  )}
                  {vehicle.vin && (
                    <div>
                      <dt className="text-muted-foreground">VIN</dt>
                      <dd className="font-mono text-sm break-all">{vehicle.vin}</dd>
                    </div>
                  )}
                  {vehicle.registeredCompany && (
                    <div>
                      <dt className="text-muted-foreground">Registrované na firmu</dt>
                      <dd className="font-medium flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {vehicle.registeredCompany}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground">Dátum nákupu</dt>
                    <dd className="font-medium">{formatDate(vehicle.acquisitionDate)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* TCO Breakdown */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Rozpad nákladov (TCO)</CardTitle>
                <CardDescription>Celkové náklady vlastníctva vozidla</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-purple-600" />
                      <span>Splatené úvery</span>
                    </div>
                    <span className="font-medium">{formatCurrency(vehicle.totalLoanPaid)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span>Poistenie</span>
                    </div>
                    <span className="font-medium">{formatCurrency(vehicle.totalInsuranceCost)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-green-600" />
                      <span>Dokumenty (STK, EK, známky)</span>
                    </div>
                    <span className="font-medium">{formatCurrency(vehicle.totalDocumentCost)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-orange-600" />
                      <span>Servis</span>
                    </div>
                    <span className="font-medium">{formatCurrency(vehicle.totalServiceCost)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span>Pokuty</span>
                    </div>
                    <span className="font-medium">{formatCurrency(vehicle.totalFineAmount)}</span>
                  </div>
                  <div className="border-t pt-4 flex items-center justify-between font-bold text-lg">
                    <span>Celkom</span>
                    <span>{formatCurrency(vehicle.totalCostOfOwnership)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Loans Tab */}
        <TabsContent value="loans" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Prepojené úvery</h3>
            <Link href={`/dashboard/loans/new?linkedAssetId=${vehicle.id}`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Pridať úver
              </Button>
            </Link>
          </div>
          {vehicle.linkedItems.loans.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Žiadne prepojené úvery
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {vehicle.linkedItems.loans.map(loan => {
                const progress = loan.principal > 0 
                  ? ((loan.principal - loan.currentBalance) / loan.principal) * 100 
                  : 0;
                return (
                  <Card key={loan.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{loan.name || loan.lender}</h4>
                          <p className="text-sm text-muted-foreground">{loan.lender}</p>
                        </div>
                        <Link href={`/dashboard/loans/${loan.id}`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Zostatok: {formatCurrency(loan.currentBalance)}</span>
                          <span>z {formatCurrency(loan.principal)}</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Mesačná splátka: {formatCurrency(loan.monthlyPayment)}</span>
                          <span>{progress.toFixed(1)}% splatené</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Insurance Tab */}
        <TabsContent value="insurance" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Poistky</h3>
            <Link href={`/dashboard/documents?tab=insurances&addNew=true&assetId=${vehicle.id}`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Pridať poistku
              </Button>
            </Link>
          </div>
          {vehicle.linkedItems.insurances.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Žiadne prepojené poistky
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {vehicle.linkedItems.insurances.map(ins => {
                const daysUntil = getDaysUntil(ins.validTo);
                const isExpiring = daysUntil !== null && daysUntil <= 30;
                const isExpired = daysUntil !== null && daysUntil < 0;
                
                return (
                  <Card key={ins.id} className={isExpired ? 'border-red-300' : isExpiring ? 'border-amber-300' : ''}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={ins.isActive ? 'default' : 'secondary'}>
                          {INSURANCE_TYPE_LABELS[ins.type] || ins.type}
                        </Badge>
                        {isExpired && <Badge variant="destructive">Expirovaná</Badge>}
                        {isExpiring && !isExpired && <Badge variant="outline" className="border-amber-500 text-amber-600">Končí</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {ins.company} • {ins.policyNumber}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span>Platná do: {formatDate(ins.validTo)}</span>
                        <span className="font-medium">{formatCurrency(ins.price)}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Dokumenty (STK, EK, Známky)</h3>
            <Link href={`/dashboard/documents?tab=stk&addNew=true&assetId=${vehicle.id}`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Pridať dokument
              </Button>
            </Link>
          </div>
          {vehicle.linkedItems.documents.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Žiadne prepojené dokumenty
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {vehicle.linkedItems.documents.map(doc => {
                const daysUntil = getDaysUntil(doc.validTo);
                const isExpiring = daysUntil !== null && daysUntil <= 30;
                const isExpired = daysUntil !== null && daysUntil < 0;
                
                return (
                  <Card key={doc.id} className={isExpired ? 'border-red-300' : isExpiring ? 'border-amber-300' : ''}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={doc.isValid ? 'default' : 'secondary'}>
                          {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
                        </Badge>
                        {isExpired && <Badge variant="destructive">Exp.</Badge>}
                        {isExpiring && !isExpired && <Badge variant="outline" className="border-amber-500 text-amber-600">Končí</Badge>}
                      </div>
                      <p className="text-sm">Platný do: {formatDate(doc.validTo)}</p>
                      {daysUntil !== null && daysUntil >= 0 && (
                        <p className="text-xs text-muted-foreground">{daysUntil} dní</p>
                      )}
                      {doc.price && (
                        <p className="text-sm font-medium mt-1">{formatCurrency(doc.price)}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Service Tab */}
        <TabsContent value="service" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Servisná história</h3>
            <Link href={`/dashboard/documents?tab=service&addNew=true&assetId=${vehicle.id}`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Pridať záznam
              </Button>
            </Link>
          </div>
          {vehicle.linkedItems.serviceRecords.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Žiadne servisné záznamy
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {vehicle.linkedItems.serviceRecords.map(record => (
                <Card key={record.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatDate(record.serviceDate)}</span>
                          {record.serviceType && (
                            <Badge variant="outline">
                              {SERVICE_TYPE_LABELS[record.serviceType] || record.serviceType}
                            </Badge>
                          )}
                        </div>
                        {record.description && (
                          <p className="text-sm text-muted-foreground">{record.description}</p>
                        )}
                        {record.kmState && (
                          <p className="text-xs text-muted-foreground">Pri {record.kmState.toLocaleString('sk-SK')} km</p>
                        )}
                      </div>
                      {record.price && (
                        <span className="font-medium">{formatCurrency(record.price)}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Fines Tab */}
        <TabsContent value="fines" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Pokuty</h3>
            <Link href={`/dashboard/documents?tab=fines&addNew=true&assetId=${vehicle.id}`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Pridať pokutu
              </Button>
            </Link>
          </div>
          {vehicle.unpaidFineCount > 0 && (
            <Card className="border-red-300 bg-red-50 dark:bg-red-950/20">
              <CardContent className="py-3">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">{vehicle.unpaidFineCount} nezaplatených pokút ({formatCurrency(vehicle.unpaidFineAmount)})</span>
                </div>
              </CardContent>
            </Card>
          )}
          {vehicle.linkedItems.fines.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Žiadne pokuty
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {vehicle.linkedItems.fines.map(fine => (
                <Card key={fine.id} className={!fine.isPaid ? 'border-red-300' : ''}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatDate(fine.fineDate)}</span>
                          <Badge variant={fine.isPaid ? 'secondary' : 'destructive'}>
                            {fine.isPaid ? 'Zaplatená' : 'Nezaplatená'}
                          </Badge>
                        </div>
                        {fine.description && (
                          <p className="text-sm text-muted-foreground">{fine.description}</p>
                        )}
                      </div>
                      <span className="font-medium">{formatCurrency(fine.fineAmount)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
