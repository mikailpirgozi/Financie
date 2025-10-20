import type { DayCountConvention } from '../types';

/**
 * Calculate day count factor for interest calculation
 * Based on banking standards (30E/360, ACT/360, ACT/365)
 */
export function calculateDayCountFactor(
  startDate: Date,
  endDate: Date,
  convention: DayCountConvention
): number {
  switch (convention) {
    case '30E/360':
      return calculate30E360(startDate, endDate);
    case 'ACT/360':
      return calculateActual(startDate, endDate) / 360;
    case 'ACT/365':
      return calculateActual(startDate, endDate) / 365;
  }
}

/**
 * 30E/360 European convention
 * Used by most European banks
 */
function calculate30E360(startDate: Date, endDate: Date): number {
  let d1 = startDate.getDate();
  let d2 = endDate.getDate();
  const m1 = startDate.getMonth() + 1;
  const m2 = endDate.getMonth() + 1;
  const y1 = startDate.getFullYear();
  const y2 = endDate.getFullYear();

  // Adjust day 31 to 30
  if (d1 === 31) d1 = 30;
  if (d2 === 31) d2 = 30;

  const days = 360 * (y2 - y1) + 30 * (m2 - m1) + (d2 - d1);
  return days / 360;
}

/**
 * Actual day count
 */
function calculateActual(startDate: Date, endDate: Date): number {
  const diffTime = endDate.getTime() - startDate.getTime();
  return Math.abs(Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

/**
 * Get days in month for a specific date
 */
export function getDaysInMonth(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Add months to a date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

