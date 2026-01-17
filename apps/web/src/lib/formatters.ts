/**
 * Centralized formatting utilities for money and numbers.
 * Uses Intl.NumberFormat for proper locale-aware formatting.
 * 
 * Money values are kept as strings throughout the API to avoid
 * JavaScript floating-point precision issues.
 */

const DEFAULT_LOCALE = 'sk-SK';
const DEFAULT_CURRENCY = 'EUR';

/**
 * Format a monetary value with full precision (2 decimal places).
 * 
 * @param value - String or number representing the monetary value
 * @param options - Optional Intl.NumberFormat options
 * @returns Formatted string like "1 234,56 €"
 */
export function formatCurrency(
  value: string | number,
  options?: Partial<Intl.NumberFormatOptions>
): string {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numericValue)) {
    return '0,00 €';
  }

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'currency',
    currency: DEFAULT_CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(numericValue);
}

/**
 * Format a monetary value in compact form (no decimals for display).
 * Useful for summary cards and compact displays.
 * 
 * @param value - String or number representing the monetary value
 * @returns Formatted string like "1 235 €"
 */
export function formatCurrencyCompact(
  value: string | number
): string {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numericValue)) {
    return '0 €';
  }

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'currency',
    currency: DEFAULT_CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericValue);
}

/**
 * Format a number with locale-aware thousand separators.
 * 
 * @param value - String or number
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string like "1 234,56"
 */
export function formatNumber(
  value: string | number,
  decimals: number = 2
): string {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numericValue)) {
    return '0';
  }

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numericValue);
}

/**
 * Format a percentage value.
 * 
 * @param value - The percentage value (e.g., 5.5 for 5.5%)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string like "5,50 %"
 */
export function formatPercent(
  value: string | number,
  decimals: number = 2
): string {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numericValue)) {
    return '0 %';
  }

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numericValue / 100);
}

/**
 * Format a date in Slovak locale.
 * 
 * @param date - Date string or Date object
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  }).format(dateObj);
}

/**
 * Format a date in short form.
 * 
 * @param date - Date string or Date object
 * @returns Formatted date string like "15. jan."
 */
export function formatDateShort(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: 'numeric',
    month: 'short',
  }).format(dateObj);
}

/**
 * Safe string to number conversion for calculations.
 * Returns 0 for invalid values instead of NaN.
 * 
 * @param value - String value from API
 * @returns Number value
 */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? 0 : num;
}
