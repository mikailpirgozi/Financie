import type { LoanScheduleEntry } from '../types';
import { addMonths } from './day-count';

/**
 * Regenerate schedule after early repayment
 * Recalculates remaining payments with new balance
 */
export function regenerateScheduleAfterEarlyRepayment(
  originalSchedule: LoanScheduleEntry[],
  paidInstallments: number,
  newBalance: number,
  monthlyRate: number
): LoanScheduleEntry[] {
  const remainingSchedule = originalSchedule.slice(paidInstallments);
  const remainingTerms = remainingSchedule.length;

  if (remainingTerms === 0 || newBalance <= 0) {
    return [];
  }

  // Recalculate monthly payment with new balance
  const newMonthlyPayment = newBalance * 
    (monthlyRate * Math.pow(1 + monthlyRate, remainingTerms)) / 
    (Math.pow(1 + monthlyRate, remainingTerms) - 1);

  const newSchedule: LoanScheduleEntry[] = [];
  let balance = newBalance;

  for (let i = 0; i < remainingTerms; i++) {
    const originalEntry = remainingSchedule[i];
    if (!originalEntry) continue;

    const interestDue = Math.round(balance * monthlyRate * 100) / 100;
    const principalDue = Math.round((newMonthlyPayment - interestDue) * 100) / 100;
    
    balance = Math.round(Math.max(0, balance - principalDue) * 100) / 100;

    newSchedule.push({
      ...originalEntry,
      principalDue,
      interestDue,
      totalDue: Math.round((principalDue + interestDue + originalEntry.feesDue) * 100) / 100,
      principalBalanceAfter: balance,
      status: 'pending',
    });
  }

  return newSchedule;
}

/**
 * Mark installments as overdue based on current date
 */
export function markOverdueInstallments(
  schedule: LoanScheduleEntry[],
  currentDate: Date
): LoanScheduleEntry[] {
  return schedule.map(entry => {
    if (entry.status === 'pending' && entry.dueDate < currentDate) {
      return { ...entry, status: 'overdue' as const };
    }
    return entry;
  });
}

/**
 * Get next due installment
 */
export function getNextDueInstallment(
  schedule: LoanScheduleEntry[]
): LoanScheduleEntry | null {
  const pending = schedule.find(entry => entry.status === 'pending' || entry.status === 'overdue');
  return pending ?? null;
}

/**
 * Get overdue installments
 */
export function getOverdueInstallments(
  schedule: LoanScheduleEntry[]
): LoanScheduleEntry[] {
  return schedule.filter(entry => entry.status === 'overdue');
}

/**
 * Calculate total remaining balance
 */
export function getTotalRemainingBalance(
  schedule: LoanScheduleEntry[]
): number {
  const unpaid = schedule.filter(entry => entry.status !== 'paid');
  return unpaid.reduce((sum, entry) => sum + entry.totalDue, 0);
}

/**
 * Calculate principal remaining balance
 */
export function getPrincipalRemainingBalance(
  schedule: LoanScheduleEntry[]
): number {
  const lastPaidIndex = schedule.findIndex(entry => entry.status === 'pending' || entry.status === 'overdue');
  
  if (lastPaidIndex === -1) {
    return 0; // All paid
  }
  
  if (lastPaidIndex === 0) {
    return schedule[0]?.principalBalanceAfter ?? 0;
  }
  
  const lastPaidEntry = schedule[lastPaidIndex - 1];
  return lastPaidEntry?.principalBalanceAfter ?? 0;
}

