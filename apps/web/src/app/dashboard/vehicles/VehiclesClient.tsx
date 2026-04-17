'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Car,
  AlertTriangle,
  FileCheck,
  Shield,
  CreditCard,
  Building2,
  Calendar,
  Gauge,
  Search,
  ChevronRight,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
} from 'lucide-react';
import { Button } from '@finapp/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@finapp/ui';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@finapp/ui';
import { DeleteDialog } from '@/components/DeleteDialog';
import type { VehicleStats } from '@finapp/core';
import { formatCurrency, formatCurrencyCompact } from '@/lib/formatters';

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
  fuelType?: string;
  mileage?: number;
  acquisitionValue: number;
  currentValue: number;
  acquisitionDate: string;
  // Loans
  loanCount: number;
  activeLoanCount?: number;
  historicalLoanCount?: number;
  totalLoanPaid: number;
  totalLoanBalance: number;
  // Insurance
  insuranceCount: number;
  activeInsuranceCount: number;
  totalInsuranceCost: number;
  nearestInsuranceExpiry?: string | null;
  latestInsuranceExpiry?: string | null;
  // Documents
  documentCount: number;
  validDocumentCount: number;
  totalDocumentCost: number;
  stkExpiry?: string | null;
  ekExpiry?: string | null;
  vignetteExpiry?: string | null;
  latestStkExpiry?: string | null;
  latestEkExpiry?: string | null;
  latestVignetteExpiry?: string | null;
  // Service
  serviceCount: number;
  totalServiceCost: number;
  lastServiceDate?: string;
  lastServiceKm?: number;
  // Fines
  fineCount: number;
  unpaidFineCount: number;
  totalFineAmount: number;
  unpaidFineAmount: number;
  // TCO
  totalCostOfOwnership: number;
  // Alerts (expiring soon)
  stkExpiringSoon: boolean;
  ekExpiringSoon: boolean;
  vignetteExpiringSoon?: boolean;
  insuranceExpiringSoon: boolean;
  // Alerts (expired)
  stkExpired?: boolean;
  ekExpired?: boolean;
  vignetteExpired?: boolean;
  insuranceExpired?: boolean;
  createdAt: string;
  updatedAt: string;
}

type ExpiryStatus = 'ok' | 'expiring' | 'expired' | 'missing';

function classifyExpiry(
  latestDate: string | null | undefined,
  expiringSoon?: boolean,
  expired?: boolean
): ExpiryStatus {
  if (!latestDate) return 'missing';
  if (expired) return 'expired';
  const date = new Date(latestDate);
  if (Number.isNaN(date.getTime())) return 'missing';
  if (date.getTime() < Date.now()) return 'expired';
  if (expiringSoon) return 'expiring';
  return 'ok';
}

interface VehiclesClientProps {
  vehicles: VehicleData[];
  stats: VehicleStats;
  filters: {
    companies: string[];
    makes: string[];
    years: number[];
  };
  householdId: string;
}

const FUEL_TYPE_LABELS: Record<string, string> = {
  petrol: 'Benzín',
  diesel: 'Diesel',
  electric: 'Elektro',
  hybrid: 'Hybrid',
  lpg: 'LPG',
  cng: 'CNG',
};

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('sk-SK');
}

export function VehiclesClient({
  vehicles,
  stats,
  filters,
}: VehiclesClientProps): React.JSX.Element {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [makeFilter, setMakeFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');

  // Filter vehicles
  const filteredVehicles = vehicles.filter((v) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        v.name.toLowerCase().includes(query) ||
        v.licensePlate?.toLowerCase().includes(query) ||
        v.make?.toLowerCase().includes(query) ||
        v.model?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Company filter
    if (companyFilter !== 'all' && v.registeredCompany !== companyFilter) {
      return false;
    }

    // Make filter
    if (makeFilter !== 'all' && v.make !== makeFilter) {
      return false;
    }

    // Year filter
    if (yearFilter !== 'all' && v.year !== parseInt(yearFilter)) {
      return false;
    }

    return true;
  });

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/vehicles/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Nepodarilo sa zmazať vozidlo');
    }

    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Vozidlá:</span>
              <span className="font-bold">{stats.totalCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Hodnota:</span>
              <span className="font-bold">{formatCurrencyCompact(stats.totalValue)}</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-purple-600" />
              <span className="font-medium">Úvery:</span>
              <span className="font-bold">{formatCurrencyCompact(stats.totalLoanBalance)}</span>
            </div>
            {stats.expiringSoonCount > 0 && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">
                  {stats.expiringSoonCount} s končiacou platnosťou
                </span>
              </div>
            )}
            {stats.expiredCount && stats.expiredCount > 0 && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">{stats.expiredCount} s expirovaným dokladom</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Celková hodnota
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">aktuálna trhová hodnota</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Zostatok úverov
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalLoanBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.withActiveLoansCount} vozidiel s úverom
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Čistá hodnota
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalValue - stats.totalLoanBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">hodnota - úvery</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Celkové náklady (TCO)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalTco)}</div>
            <p className="text-xs text-muted-foreground mt-1">úvery + poistky + servis + pokuty</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Hľadať vozidlo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {filters.companies.length > 0 && (
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-[180px]">
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Firma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všetky firmy</SelectItem>
                  {filters.companies.map((company) => (
                    <SelectItem key={company} value={company}>
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {filters.makes.length > 0 && (
              <Select value={makeFilter} onValueChange={setMakeFilter}>
                <SelectTrigger className="w-[150px]">
                  <Car className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Značka" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všetky značky</SelectItem>
                  {filters.makes.map((make) => (
                    <SelectItem key={make} value={make}>
                      {make}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {filters.years.length > 0 && (
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-[120px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Rok" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všetky roky</SelectItem>
                  {filters.years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vehicles List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredVehicles.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} onDelete={handleDelete} />
        ))}
      </div>

      {filteredVehicles.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-muted-foreground">Žiadne vozidlá nezodpovedajú filtrom</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface VehicleCardProps {
  vehicle: VehicleData;
  onDelete: (id: string) => Promise<void>;
}

interface DocumentBadgeProps {
  label: string;
  status: ExpiryStatus;
  latestDate?: string | null;
}

function DocumentBadge({
  label,
  status,
  latestDate,
}: DocumentBadgeProps): React.JSX.Element | null {
  if (status === 'missing') return null;
  const statusText =
    status === 'expired'
      ? `${label} expirované`
      : status === 'expiring'
        ? `${label} končí ${formatDate(latestDate ?? undefined)}`
        : `${label} ${formatDate(latestDate ?? undefined)}`;
  return (
    <Badge variant={status === 'ok' ? 'secondary' : 'destructive'} className="text-xs">
      <FileCheck className="h-3 w-3 mr-1" />
      {statusText}
    </Badge>
  );
}

function VehicleCard({ vehicle, onDelete }: VehicleCardProps): React.JSX.Element {
  const stkStatus = classifyExpiry(
    vehicle.latestStkExpiry ?? vehicle.stkExpiry,
    vehicle.stkExpiringSoon,
    vehicle.stkExpired
  );
  const ekStatus = classifyExpiry(
    vehicle.latestEkExpiry ?? vehicle.ekExpiry,
    vehicle.ekExpiringSoon,
    vehicle.ekExpired
  );
  const vignetteStatus = classifyExpiry(
    vehicle.latestVignetteExpiry ?? vehicle.vignetteExpiry,
    vehicle.vignetteExpiringSoon,
    vehicle.vignetteExpired
  );
  const insuranceStatus =
    vehicle.activeInsuranceCount > 0
      ? classifyExpiry(
          vehicle.nearestInsuranceExpiry ?? vehicle.latestInsuranceExpiry,
          vehicle.insuranceExpiringSoon,
          vehicle.insuranceExpired
        )
      : 'missing';

  const hasAlerts =
    vehicle.stkExpiringSoon ||
    vehicle.ekExpiringSoon ||
    vehicle.vignetteExpiringSoon ||
    vehicle.insuranceExpiringSoon ||
    vehicle.stkExpired ||
    vehicle.ekExpired ||
    vehicle.vignetteExpired ||
    vehicle.insuranceExpired;

  const hasErrors =
    vehicle.stkExpired || vehicle.ekExpired || vehicle.vignetteExpired || vehicle.insuranceExpired;
  const borderClass = hasErrors
    ? 'border-red-300 dark:border-red-700'
    : hasAlerts
      ? 'border-amber-300 dark:border-amber-700'
      : '';

  return (
    <Card className={`hover:shadow-md transition-shadow ${borderClass}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Car className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {vehicle.make && vehicle.model ? `${vehicle.make} ${vehicle.model}` : vehicle.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {vehicle.licensePlate || vehicle.name}
                {vehicle.year && ` • ${vehicle.year}`}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/vehicles/${vehicle.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  Detail
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/vehicles/${vehicle.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Upraviť
                </Link>
              </DropdownMenuItem>
              <DeleteDialog
                title="Zmazať vozidlo"
                description={`Naozaj chcete zmazať vozidlo "${vehicle.name}"? Táto akcia je nevratná.`}
                onConfirm={() => onDelete(vehicle.id)}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                    <span className="text-red-500">Zmazať</span>
                  </DropdownMenuItem>
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Company & Value */}
        <div className="flex items-center justify-between text-sm">
          {vehicle.registeredCompany && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span>{vehicle.registeredCompany}</span>
            </div>
          )}
          <div className="font-semibold text-lg">{formatCurrency(vehicle.currentValue)}</div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          {vehicle.mileage && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Gauge className="h-3 w-3" />
              <span>{vehicle.mileage.toLocaleString('sk-SK')} km</span>
            </div>
          )}
          {vehicle.fuelType && (
            <div className="text-muted-foreground">
              {FUEL_TYPE_LABELS[vehicle.fuelType] || vehicle.fuelType}
            </div>
          )}
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          {vehicle.totalLoanBalance > 0 && (
            <Badge variant="outline" className="text-xs">
              <CreditCard className="h-3 w-3 mr-1" />
              {formatCurrencyCompact(vehicle.totalLoanBalance)}
            </Badge>
          )}

          {insuranceStatus === 'missing' ? (
            <Badge variant="destructive" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Bez poistky
            </Badge>
          ) : (
            <Badge
              variant={insuranceStatus === 'ok' ? 'secondary' : 'destructive'}
              className="text-xs"
            >
              <Shield className="h-3 w-3 mr-1" />
              {insuranceStatus === 'expired'
                ? 'Poistka expirovaná'
                : insuranceStatus === 'expiring'
                  ? 'Poistka končí'
                  : 'Poistené'}
            </Badge>
          )}

          <DocumentBadge
            label="STK"
            status={stkStatus}
            latestDate={vehicle.latestStkExpiry ?? vehicle.stkExpiry}
          />
          <DocumentBadge
            label="EK"
            status={ekStatus}
            latestDate={vehicle.latestEkExpiry ?? vehicle.ekExpiry}
          />
          {(vehicle.vignetteExpiry || vehicle.latestVignetteExpiry) && (
            <DocumentBadge
              label="Známka"
              status={vignetteStatus}
              latestDate={vehicle.latestVignetteExpiry ?? vehicle.vignetteExpiry}
            />
          )}

          {vehicle.unpaidFineCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {vehicle.unpaidFineCount} pokút
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="pt-2 border-t">
          <Link href={`/dashboard/vehicles/${vehicle.id}`}>
            <Button variant="ghost" className="w-full justify-between" size="sm">
              Zobraziť detail
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
