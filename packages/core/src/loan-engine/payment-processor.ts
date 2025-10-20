import type { LoanScheduleEntry } from '../types';

/**
 * Process payment and update schedule
 * Returns updated schedule with payment applied
 */
export function processPayment(
  schedule: LoanScheduleEntry[],
  paymentAmount: number,
  paymentDate: Date
): {
  updatedSchedule: LoanScheduleEntry[];
  appliedAmount: number;
  remainingAmount: number;
} {
  let remainingAmount = paymentAmount;
  const updatedSchedule = [...schedule];

  // Find first unpaid installment
  const unpaidIndex = updatedSchedule.findIndex(
    entry => entry.status === 'pending' || entry.status === 'overdue'
  );

  if (unpaidIndex === -1) {
    return {
      updatedSchedule,
      appliedAmount: 0,
      remainingAmount: paymentAmount,
    };
  }

  const installment = updatedSchedule[unpaidIndex];
  if (!installment) {
    return {
      updatedSchedule,
      appliedAmount: 0,
      remainingAmount: paymentAmount,
    };
  }

  // Check if payment covers the installment
  if (remainingAmount >= installment.totalDue) {
    updatedSchedule[unpaidIndex] = {
      ...installment,
      status: 'paid',
    };
    remainingAmount -= installment.totalDue;
    
    return {
      updatedSchedule,
      appliedAmount: installment.totalDue,
      remainingAmount,
    };
  }

  // Partial payment - mark as still pending/overdue
  return {
    updatedSchedule,
    appliedAmount: 0,
    remainingAmount: paymentAmount,
  };
}

/**
 * Calculate early repayment penalty
 */
export function calculateEarlyRepaymentPenalty(
  principalAmount: number,
  penaltyPercentage: number
): number {
  return Math.round(principalAmount * (penaltyPercentage / 100) * 100) / 100;
}

/**
 * Process early repayment
 * Returns new balance after early repayment and penalty
 */
export function processEarlyRepayment(
  currentBalance: number,
  repaymentAmount: number,
  penaltyPercentage: number = 0
): {
  newBalance: number;
  penalty: number;
  appliedToPrincipal: number;
} {
  const penalty = calculateEarlyRepaymentPenalty(repaymentAmount, penaltyPercentage);
  const appliedToPrincipal = repaymentAmount;
  const newBalance = Math.max(0, currentBalance - appliedToPrincipal);

  return {
    newBalance: Math.round(newBalance * 100) / 100,
    penalty: Math.round(penalty * 100) / 100,
    appliedToPrincipal: Math.round(appliedToPrincipal * 100) / 100,
  };
}

/**
 * Split payment into principal, interest, and fees
 */
export function splitPayment(
  installment: LoanScheduleEntry
): {
  principal: number;
  interest: number;
  fees: number;
} {
  return {
    principal: installment.principalDue,
    interest: installment.interestDue,
    fees: installment.feesDue,
  };
}

