/**
 * Asset Management Types
 * Typy pre poistky, STK, EK, servis, pokuty a poistne udalosti
 */

// ============================================
// INSURANCE TYPES
// ============================================

export type InsuranceType = 'pzp' | 'kasko' | 'pzp_kasko' | 'leasing' | 'property' | 'life' | 'other';
export type PaymentFrequency = 'monthly' | 'quarterly' | 'biannual' | 'yearly';

export interface AssetInfo {
  id: string;
  kind: string;
  name: string;
  licensePlate?: string;
}

export interface Insurance {
  id: string;
  householdId: string;
  assetId?: string;
  insurerId?: string;
  type: InsuranceType;
  policyNumber: string;
  company?: string;
  brokerCompany?: string;
  validFrom: string;
  validTo: string;
  price: number;
  paymentFrequency: PaymentFrequency;
  paidDate?: string;
  greenCardValidFrom?: string;
  greenCardValidTo?: string;
  kmState?: number;
  coverageAmount?: number;
  deductibleAmount?: number;
  deductiblePercentage?: number;
  lastExtendedDate?: string;
  extensionCount?: number;
  filePaths?: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  // Extended info from joins
  asset?: AssetInfo;
}

export interface InsuranceWithAsset extends Insurance {
  asset?: AssetInfo;
}

// ============================================
// VEHICLE DOCUMENT TYPES (STK, EK, Vignettes)
// ============================================

export type DocumentType = 'stk' | 'ek' | 'vignette' | 'technical_certificate';
export type VignetteCountry = 'SK' | 'CZ' | 'AT' | 'HU' | 'SI' | 'PL' | 'DE' | 'CH';

export interface VehicleDocument {
  id: string;
  householdId: string;
  assetId: string;
  documentType: DocumentType;
  validFrom?: string;
  validTo: string;
  documentNumber?: string;
  price?: number;
  brokerCompany?: string;
  country?: VignetteCountry;
  isRequired?: boolean;
  kmState?: number;
  paidDate?: string;
  lastExtendedDate?: string;
  extensionCount?: number;
  filePaths?: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  // Extended info
  asset?: AssetInfo;
}

export interface VehicleDocumentWithAsset extends VehicleDocument {
  asset?: AssetInfo;
}

// Extended Document Type for universal form
export type ExtendedDocumentType = 
  | 'insurance_pzp'
  | 'insurance_kasko'
  | 'insurance_pzp_kasko'
  | 'insurance_leasing'
  | 'insurance_property'
  | 'insurance_life'
  | 'stk'
  | 'ek'
  | 'vignette'
  | 'service_book'
  | 'fines_record';

// ============================================
// SERVICE RECORDS (Servisna knizka)
// ============================================

export type ServiceType = 'regular' | 'repair' | 'tire_change' | 'inspection' | 'other';

export interface ServiceRecord {
  id: string;
  householdId: string;
  assetId: string;
  serviceDate: string;
  serviceProvider?: string;
  serviceType?: ServiceType;
  kmState?: number;
  price?: number;
  description?: string;
  notes?: string;
  filePaths?: string[];
  createdAt?: string;
  updatedAt?: string;
  // Extended info
  asset?: AssetInfo;
}

// ============================================
// FINES (Pokuty)
// ============================================

export interface Fine {
  id: string;
  householdId: string;
  assetId?: string;
  fineDate: string;
  fineAmount: number;
  fineAmountLate?: number;
  country?: string;
  enforcementCompany?: string;
  isPaid: boolean;
  ownerPaidDate?: string;
  description?: string;
  notes?: string;
  filePaths?: string[];
  createdAt?: string;
  updatedAt?: string;
  // Extended info
  asset?: AssetInfo;
}

// ============================================
// INSURANCE CLAIMS (Poistne udalosti)
// ============================================

export type ClaimStatus = 'reported' | 'investigating' | 'approved' | 'rejected' | 'closed';
export type IncidentType = 'accident' | 'theft' | 'vandalism' | 'weather' | 'other';

export interface InsuranceClaim {
  id: string;
  householdId: string;
  insuranceId?: string;
  assetId?: string;
  incidentDate: string;
  reportedDate: string;
  claimNumber?: string;
  incidentType: IncidentType;
  description: string;
  location?: string;
  estimatedDamage?: number;
  deductible?: number;
  payoutAmount?: number;
  status: ClaimStatus;
  policeReportNumber?: string;
  otherPartyInfo?: string;
  notes?: string;
  filePaths?: string[];
  createdAt?: string;
  updatedAt?: string;
  // Extended info
  asset?: AssetInfo;
  insurance?: {
    id: string;
    company?: string;
    policyNumber: string;
  };
}

// ============================================
// INSURERS (Poistovne)
// ============================================

export interface Insurer {
  id: string;
  householdId: string;
  name: string;
  isDefault: boolean;
  createdAt?: string;
}

// ============================================
// LOAN DOCUMENTS (Dokumenty k úverom)
// ============================================

export type LoanDocumentType = 'contract' | 'payment_schedule' | 'amendment' | 'other';

export interface LoanDocument {
  id: string;
  householdId: string;
  loanId: string;
  documentType: LoanDocumentType;
  name: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// FILTER TYPES
// ============================================

export interface InsuranceFilters {
  assetId?: string;
  type?: InsuranceType;
  status?: 'active' | 'expired' | 'expiring' | 'all';
  search?: string;
  company?: string;
}

export interface DocumentFilters {
  assetId?: string;
  documentType?: DocumentType;
  status?: 'valid' | 'expired' | 'expiring' | 'all';
  country?: VignetteCountry;
  search?: string;
}

export interface ClaimFilters {
  assetId?: string;
  status?: ClaimStatus;
  incidentType?: IncidentType;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface FineFilters {
  assetId?: string;
  isPaid?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// ============================================
// STATS TYPES
// ============================================

export interface InsuranceStats {
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
  totalAnnualCost: number;
}

export interface DocumentStats {
  total: number;
  valid: number;
  expiringSoon: number;
  expired: number;
  totalCost: number;
}

export interface ClaimStats {
  total: number;
  reported: number;
  investigating: number;
  approved: number;
  rejected: number;
  closed: number;
  totalPayout: number;
}

export interface FineStats {
  total: number;
  paid: number;
  unpaid: number;
  totalAmount: number;
  unpaidAmount: number;
}

// ============================================
// LABELS (pre UI)
// ============================================

export const INSURANCE_TYPE_LABELS: Record<InsuranceType, string> = {
  pzp: 'PZP',
  kasko: 'Kasko',
  pzp_kasko: 'PZP + Kasko',
  leasing: 'Leasingová',
  property: 'Majetková',
  life: 'Životná',
  other: 'Iná',
};

export const PAYMENT_FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  monthly: 'Mesačne',
  quarterly: 'Štvrťročne',
  biannual: 'Polročne',
  yearly: 'Ročne',
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  stk: 'STK',
  ek: 'Emisná kontrola',
  vignette: 'Dialničná známka',
  technical_certificate: 'Technický preukaz',
};

export const LOAN_DOCUMENT_TYPE_LABELS: Record<LoanDocumentType, string> = {
  contract: 'Zmluva',
  payment_schedule: 'Splátkový kalendár',
  amendment: 'Dodatok',
  other: 'Iný dokument',
};

export const EXTENDED_DOCUMENT_TYPE_LABELS: Record<ExtendedDocumentType, string> = {
  insurance_pzp: 'PZP poistenie',
  insurance_kasko: 'Kasko poistenie',
  insurance_pzp_kasko: 'PZP + Kasko poistenie',
  insurance_leasing: 'Leasingová poistka',
  insurance_property: 'Majetková poistka',
  insurance_life: 'Životná poistka',
  stk: 'STK',
  ek: 'Emisná kontrola',
  vignette: 'Dialničná známka',
  service_book: 'Servisná knižka',
  fines_record: 'Evidencia pokút',
};

export const VIGNETTE_COUNTRY_LABELS: Record<VignetteCountry, string> = {
  SK: 'Slovensko',
  CZ: 'Česko',
  AT: 'Rakúsko',
  HU: 'Maďarsko',
  SI: 'Slovinsko',
  PL: 'Poľsko',
  DE: 'Nemecko',
  CH: 'Švajčiarsko',
};

export const VIGNETTE_COUNTRY_FLAGS: Record<VignetteCountry, string> = {
  SK: '🇸🇰',
  CZ: '🇨🇿',
  AT: '🇦🇹',
  HU: '🇭🇺',
  SI: '🇸🇮',
  PL: '🇵🇱',
  DE: '🇩🇪',
  CH: '🇨🇭',
};

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  reported: 'Nahlásená',
  investigating: 'Vyšetruje sa',
  approved: 'Schválená',
  rejected: 'Zamietnutá',
  closed: 'Uzavretá',
};

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  accident: 'Nehoda',
  theft: 'Krádež',
  vandalism: 'Vandalizmus',
  weather: 'Počasie',
  other: 'Iné',
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  regular: 'Pravidelný servis',
  repair: 'Oprava',
  tire_change: 'Prezutie pneumatík',
  inspection: 'Kontrola',
  other: 'Iné',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate days until expiration
 */
export function getDaysUntilExpiry(validTo: string): number {
  const date = new Date(validTo);
  const now = new Date();
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get expiration status
 */
export function getExpirationStatus(validTo: string): 'expired' | 'expiring' | 'valid' {
  const daysUntil = getDaysUntilExpiry(validTo);
  if (daysUntil < 0) return 'expired';
  if (daysUntil <= 30) return 'expiring';
  return 'valid';
}

/**
 * Calculate validity to date based on frequency
 */
export function calculateValidToDate(validFrom: string, frequency: PaymentFrequency): string {
  if (!validFrom) return '';
  
  const fromDate = new Date(validFrom);
  const toDate = new Date(fromDate);
  
  switch (frequency) {
    case 'monthly':
      toDate.setMonth(toDate.getMonth() + 1);
      break;
    case 'quarterly':
      toDate.setMonth(toDate.getMonth() + 3);
      break;
    case 'biannual':
      toDate.setMonth(toDate.getMonth() + 6);
      break;
    case 'yearly':
      toDate.setFullYear(toDate.getFullYear() + 1);
      break;
    default:
      toDate.setFullYear(toDate.getFullYear() + 1);
  }
  
  return toDate.toISOString().split('T')[0] ?? '';
}

/**
 * Get status priority for sorting (lower = higher priority)
 */
export function getStatusPriority(validTo: string): number {
  const status = getExpirationStatus(validTo);
  switch (status) {
    case 'expired': return 0;
    case 'expiring': return 1;
    case 'valid': return 2;
    default: return 3;
  }
}
