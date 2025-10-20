/**
 * Convert optional value to nullable
 * Used for DTO to DB transformation
 */
export function toNullable<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

/**
 * Format date to YYYY-MM
 */
export function formatMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Parse month string (YYYY-MM) to Date
 */
export function parseMonth(monthStr: string): Date {
  const [year, month] = monthStr.split('-').map(Number);
  if (!year || !month) {
    throw new Error(`Invalid month format: ${monthStr}`);
  }
  return new Date(year, month - 1, 1);
}

/**
 * Get current month string (YYYY-MM)
 */
export function getCurrentMonth(): string {
  return formatMonth(new Date());
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * 100) / 100;
}

/**
 * Round to 2 decimal places
 */
export function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Check if date is in the past
 */
export function isPast(date: Date): boolean {
  return date < new Date();
}

/**
 * Check if date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Get days difference between two dates
 */
export function getDaysDifference(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

