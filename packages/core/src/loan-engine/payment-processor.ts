import type { LoanScheduleEntry } from '../types';

/**
 * Process payment and update schedule
 * Returns updated schedule with payment applied
 */
export function processPayment(
  schedule: LoanScheduleEntry[],
  paymentAmount: number
): {
  updatedSchedule: LoanScheduleEntry[];
  appliedAmount: number;
  remainingAmount: number;
} {
  let remainingAmount = paymentAmount;
  const updatedSchedule = [...schedule];

  // Find first unpaid installment
  const unpaidIndex = updatedSchedule.findIndex(
    (entry) => entry.status === 'pending' || entry.status === 'overdue'
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
 * Calculate early repayment penalty.
 *
 * Canonical convention (shared with `simulator.calculateEarlyRepayment`):
 *   penalty = prepaidAmount × penaltyPct / 100
 *
 * The first argument is ALWAYS the *prepaid* amount, never the remaining
 * principal — that matches Slovak Consumer Credit Act (§ 16) and the EU
 * Mortgage Credit Directive. Callers must pass `min(repaymentAmount,
 * currentBalance)` if they want to cap over-payments.
 */
export function calculateEarlyRepaymentPenalty(
  prepaidAmount: number,
  penaltyPercentage: number
): number {
  return Math.round(prepaidAmount * (penaltyPercentage / 100) * 100) / 100;
}

/**
 * Process early repayment.
 *
 * Returns the new balance after the prepayment and the cash penalty owed.
 * Consistent with `simulator.calculateEarlyRepayment` — the penalty is settled
 * in cash and NOT capitalised back into the principal.
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
  const appliedToPrincipal = Math.min(repaymentAmount, currentBalance);
  const penalty = calculateEarlyRepaymentPenalty(appliedToPrincipal, penaltyPercentage);
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
export function splitPayment(installment: LoanScheduleEntry): {
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
