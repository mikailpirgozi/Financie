/**
 * Slovak labels for insurance, document, service, and fine types.
 * Centralised so that mobile and web use identical wording.
 */

import type {
  InsuranceType,
  DocumentType,
  ServiceType,
  VignetteCountry,
} from '../asset-management-types';

export const INSURANCE_TYPE_SK: Record<InsuranceType, string> = {
  pzp: 'PZP',
  kasko: 'Havarijné poistenie',
  pzp_kasko: 'PZP + Havarijné',
  leasing: 'Leasingové',
  property: 'Majetkové',
  life: 'Životné',
  other: 'Iné',
};

export const INSURANCE_TYPE_SHORT_SK: Record<InsuranceType, string> = {
  pzp: 'PZP',
  kasko: 'Havarijka',
  pzp_kasko: 'PZP + KASKO',
  leasing: 'Leasing',
  property: 'Majetok',
  life: 'Život',
  other: 'Iné',
};

export const DOCUMENT_TYPE_SK: Record<DocumentType, string> = {
  stk: 'STK (Technická kontrola)',
  ek: 'EK (Emisná kontrola)',
  vignette: 'Diaľničná známka',
  technical_certificate: 'Technický preukaz',
};

export const DOCUMENT_TYPE_SHORT_SK: Record<DocumentType, string> = {
  stk: 'STK',
  ek: 'EK',
  vignette: 'Známka',
  technical_certificate: 'TP',
};

export const SERVICE_TYPE_SK: Record<ServiceType, string> = {
  regular: 'Pravidelný servis',
  repair: 'Oprava',
  tire_change: 'Prezutie',
  inspection: 'Kontrola',
  other: 'Iné',
};

export const VIGNETTE_COUNTRY_SK: Record<VignetteCountry, string> = {
  SK: 'Slovensko',
  CZ: 'Česko',
  AT: 'Rakúsko',
  HU: 'Maďarsko',
  SI: 'Slovinsko',
  PL: 'Poľsko',
  DE: 'Nemecko',
  CH: 'Švajčiarsko',
};

export const PAYMENT_FREQUENCY_SK: Record<string, string> = {
  monthly: 'Mesačne',
  quarterly: 'Štvrťročne',
  biannual: 'Polročne',
  yearly: 'Ročne',
};

/**
 * Helper: format an insurance type using Slovak labels (long form).
 * Falls back to the raw value if the type is unknown.
 */
export function formatInsuranceType(type: string | null | undefined): string {
  if (!type) return '';
  return INSURANCE_TYPE_SK[type as InsuranceType] ?? type;
}

export function formatInsuranceTypeShort(type: string | null | undefined): string {
  if (!type) return '';
  return INSURANCE_TYPE_SHORT_SK[type as InsuranceType] ?? type;
}

export function formatDocumentType(type: string | null | undefined): string {
  if (!type) return '';
  return DOCUMENT_TYPE_SK[type as DocumentType] ?? type;
}

export function formatDocumentTypeShort(type: string | null | undefined): string {
  if (!type) return '';
  return DOCUMENT_TYPE_SHORT_SK[type as DocumentType] ?? type;
}

export function formatServiceType(type: string | null | undefined): string {
  if (!type) return '';
  return SERVICE_TYPE_SK[type as ServiceType] ?? type;
}

export function formatVignetteCountry(country: string | null | undefined): string {
  if (!country) return '';
  return VIGNETTE_COUNTRY_SK[country as VignetteCountry] ?? country;
}
