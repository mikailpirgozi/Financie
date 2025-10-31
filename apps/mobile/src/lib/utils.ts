/**
 * Format a number as currency
 * @param value - The number to format
 * @param currency - The currency code (default: 'EUR')
 * @returns Formatted currency string
 */
export function formatCurrency(value: string | number, currency = 'EUR'): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return `0 ${currency}`;
  }
  
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
}

/**
 * Parse a string that might be a decimal or regular number
 * @param value - The string to parse
 * @returns The parsed number
 */
export function parseAmount(value: string): number {
  return parseFloat(value.replace(',', '.')) || 0;
}

/**
 * Calculate percentage change between two values
 * @param oldValue - The original value
 * @param newValue - The new value
 * @returns The percentage change
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}
