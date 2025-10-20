import type {
  EarlyRepaymentInput,
  EarlyRepaymentResult,
  LoanSimulationInput,
  SimulationResult,
  LoanComparisonResult,
  LoanScheduleEntry,
  LoanCalculationInput,
} from '../types';
import { calculateLoan } from './calculator';
import { addMonths, calculateDayCountFactor } from './day-count';

/**
 * Calculate early repayment scenario
 * Shows penalty, new schedule, and savings
 */
export function calculateEarlyRepayment(input: EarlyRepaymentInput): EarlyRepaymentResult {
  const {
    loanType,
    principal,
    annualRate,
    termMonths,
    startDate,
    dayCountConvention,
    feeSetup = 0,
    feeMonthly = 0,
    insuranceMonthly = 0,
    balloonAmount,
    currentInstallment,
    repaymentAmount,
    penaltyPct,
  } = input;

  // Calculate original schedule
  const originalResult = calculateLoan({
    loanType,
    principal,
    annualRate,
    termMonths,
    startDate,
    dayCountConvention,
    feeSetup,
    feeMonthly,
    insuranceMonthly,
    balloonAmount,
  });

  // Get remaining balance at current installment
  const currentEntry = originalResult.schedule[currentInstallment - 1];
  if (!currentEntry) {
    throw new Error('Invalid installment number');
  }

  const remainingBalance = currentEntry.principalBalanceAfter;

  // Calculate penalty
  const penaltyAmount = roundToTwo(remainingBalance * (penaltyPct / 100));

  // Calculate new balance after early repayment
  const newBalance = roundToTwo(remainingBalance - repaymentAmount + penaltyAmount);

  // If fully paid off
  if (newBalance <= 0) {
    return {
      penaltyAmount,
      remainingBalance: 0,
      newSchedule: [],
      totalSaved: calculateSavings(originalResult.schedule, currentInstallment, termMonths),
      effectiveRate: 0,
    };
  }

  // Recalculate schedule with new balance
  const remainingMonths = termMonths - currentInstallment;
  const newStartDate = addMonths(startDate, currentInstallment);

  const newResult = calculateLoan({
    loanType,
    principal: newBalance,
    annualRate,
    termMonths: remainingMonths,
    startDate: newStartDate,
    dayCountConvention,
    feeSetup: 0, // No setup fee for recalculation
    feeMonthly,
    insuranceMonthly,
    balloonAmount: loanType === 'interest_only' ? newBalance : undefined,
  });

  // Calculate total saved
  const originalRemaining = originalResult.schedule.slice(currentInstallment);
  const originalTotal = originalRemaining.reduce(
    (sum, entry) => sum + entry.interestDue + entry.feesDue,
    0
  );
  const newTotal = newResult.totalInterest + newResult.totalFees;
  const totalSaved = roundToTwo(originalTotal - newTotal - penaltyAmount);

  return {
    penaltyAmount,
    remainingBalance: newBalance,
    newSchedule: newResult.schedule,
    totalSaved,
    effectiveRate: newResult.effectiveRate,
  };
}

/**
 * Simulate multiple loan scenarios
 * Compare different repayment strategies
 */
export function simulateLoanScenarios(input: LoanSimulationInput): LoanComparisonResult {
  const {
    loanType,
    principal,
    annualRate,
    termMonths,
    startDate,
    dayCountConvention,
    feeSetup = 0,
    feeMonthly = 0,
    insuranceMonthly = 0,
    balloonAmount,
    scenarios,
  } = input;

  // Calculate baseline (no changes)
  const baselineResult = calculateLoan({
    loanType,
    principal,
    annualRate,
    termMonths,
    startDate,
    dayCountConvention,
    feeSetup,
    feeMonthly,
    insuranceMonthly,
    balloonAmount,
  });

  const results: SimulationResult[] = scenarios.map((scenario) => {
    let schedule: LoanScheduleEntry[] = [...baselineResult.schedule];
    let currentBalance = principal + feeSetup;
    let totalInterest = 0;
    let totalFees = feeSetup;
    let totalPayment = feeSetup;
    let actualTermMonths = termMonths;

    // Apply extra monthly payments
    if (scenario.extraPaymentMonthly && scenario.extraPaymentMonthly > 0) {
      schedule = applyExtraMonthlyPayments(
        {
          loanType,
          principal,
          annualRate,
          termMonths,
          startDate,
          dayCountConvention,
          feeSetup,
          feeMonthly,
          insuranceMonthly,
          balloonAmount,
        },
        scenario.extraPaymentMonthly
      );
      actualTermMonths = schedule.length;
    }

    // Apply one-time extra payments
    if (scenario.extraPaymentOneTime && scenario.extraPaymentOneTime.length > 0) {
      schedule = applyOneTimePayments(schedule, scenario.extraPaymentOneTime, {
        loanType,
        annualRate,
        dayCountConvention,
        feeMonthly,
        insuranceMonthly,
      });
      actualTermMonths = schedule.length;
    }

    // Apply rate change
    if (scenario.rateChange) {
      schedule = applyRateChange(schedule, scenario.rateChange, {
        loanType,
        dayCountConvention,
        feeMonthly,
        insuranceMonthly,
      });
    }

    // Calculate totals
    totalInterest = schedule.reduce((sum, entry) => sum + entry.interestDue, 0);
    totalFees = schedule.reduce((sum, entry) => sum + entry.feesDue, 0) + feeSetup;
    totalPayment = schedule.reduce((sum, entry) => sum + entry.totalDue, 0) + feeSetup;

    const monthsSaved = termMonths - actualTermMonths;
    const totalSaved = baselineResult.totalPayment - totalPayment;

    return {
      scenario: scenario.name,
      schedule,
      totalInterest,
      totalFees,
      totalPayment,
      effectiveRate: calculateEffectiveRate(principal, totalPayment, actualTermMonths),
      monthsSaved,
      totalSaved,
    };
  });

  // Find best scenario (lowest total payment)
  const bestScenario = results.reduce((best, current) =>
    current.totalPayment < best.totalPayment ? current : best
  );

  // Calculate comparison ranges
  const totalInterestValues = results.map((r) => r.totalInterest);
  const totalPaymentValues = results.map((r) => r.totalPayment);
  const monthsSavedValues = results.map((r) => r.monthsSaved);

  return {
    scenarios: results,
    bestScenario: bestScenario.scenario,
    comparison: {
      totalInterestRange: {
        min: Math.min(...totalInterestValues),
        max: Math.max(...totalInterestValues),
      },
      totalPaymentRange: {
        min: Math.min(...totalPaymentValues),
        max: Math.max(...totalPaymentValues),
      },
      monthsSavedRange: {
        min: Math.min(...monthsSavedValues),
        max: Math.max(...monthsSavedValues),
      },
    },
  };
}

/**
 * Apply extra monthly payments to schedule
 */
function applyExtraMonthlyPayments(
  input: LoanCalculationInput,
  extraPayment: number
): LoanScheduleEntry[] {
  const {
    loanType,
    principal,
    annualRate,
    termMonths,
    startDate,
    dayCountConvention,
    feeSetup = 0,
    feeMonthly = 0,
    insuranceMonthly = 0,
  } = input;

  const schedule: LoanScheduleEntry[] = [];
  let balance = principal + feeSetup;
  let installmentNo = 1;

  while (balance > 0 && installmentNo <= termMonths) {
    const dueDate = addMonths(startDate, installmentNo);
    const prevDate = installmentNo === 1 ? startDate : addMonths(startDate, installmentNo - 1);

    const dayCountFactor = calculateDayCountFactor(prevDate, dueDate, dayCountConvention);
    const interestDue = roundToTwo(balance * (annualRate / 100) * dayCountFactor);
    const feesDue = roundToTwo(feeMonthly + insuranceMonthly);

    // Calculate principal payment based on loan type
    let principalDue: number;
    if (loanType === 'annuity') {
      const monthlyRate = annualRate / 100 / 12;
      const remainingMonths = termMonths - installmentNo + 1;
      const monthlyPayment =
        balance *
        ((monthlyRate * Math.pow(1 + monthlyRate, remainingMonths)) /
          (Math.pow(1 + monthlyRate, remainingMonths) - 1));
      principalDue = roundToTwo(monthlyPayment - interestDue);
    } else if (loanType === 'fixed_principal') {
      principalDue = roundToTwo(balance / (termMonths - installmentNo + 1));
    } else {
      // interest_only
      principalDue = installmentNo === termMonths ? balance : 0;
    }

    // Add extra payment to principal
    principalDue = roundToTwo(Math.min(balance, principalDue + extraPayment));
    balance = roundToTwo(Math.max(0, balance - principalDue));

    schedule.push({
      installmentNo,
      dueDate,
      principalDue,
      interestDue,
      feesDue,
      totalDue: roundToTwo(principalDue + interestDue + feesDue),
      principalBalanceAfter: balance,
      status: 'pending',
    });

    if (balance === 0) break;
    installmentNo++;
  }

  return schedule;
}

/**
 * Apply one-time extra payments to schedule
 */
function applyOneTimePayments(
  schedule: LoanScheduleEntry[],
  payments: { installmentNo: number; amount: number }[],
  config: {
    loanType: string;
    annualRate: number;
    dayCountConvention: string;
    feeMonthly: number;
    insuranceMonthly: number;
  }
): LoanScheduleEntry[] {
  // Sort payments by installment number
  const sortedPayments = [...payments].sort((a, b) => a.installmentNo - b.installmentNo);

  let newSchedule = [...schedule];

  for (const payment of sortedPayments) {
    const entry = newSchedule[payment.installmentNo - 1];
    if (!entry) continue;

    // Apply extra payment to principal
    const newPrincipalDue = roundToTwo(entry.principalDue + payment.amount);
    const newBalance = roundToTwo(
      Math.max(0, entry.principalBalanceAfter - payment.amount)
    );

    // Update current entry
    newSchedule[payment.installmentNo - 1] = {
      ...entry,
      principalDue: newPrincipalDue,
      totalDue: roundToTwo(newPrincipalDue + entry.interestDue + entry.feesDue),
      principalBalanceAfter: newBalance,
    };

    // If fully paid off, remove remaining entries
    if (newBalance === 0) {
      newSchedule = newSchedule.slice(0, payment.installmentNo);
      break;
    }

    // Recalculate remaining entries
    // (simplified - in production would need full recalculation)
  }

  return newSchedule;
}

/**
 * Apply rate change to schedule
 */
function applyRateChange(
  schedule: LoanScheduleEntry[],
  rateChange: { fromInstallment: number; newRate: number },
  config: {
    loanType: string;
    dayCountConvention: string;
    feeMonthly: number;
    insuranceMonthly: number;
  }
): LoanScheduleEntry[] {
  // Simplified implementation
  // In production, would need full recalculation from the rate change point
  return schedule.map((entry, index) => {
    if (index + 1 < rateChange.fromInstallment) {
      return entry;
    }

    // Recalculate interest with new rate
    const newInterestDue = roundToTwo(
      entry.principalBalanceAfter * (rateChange.newRate / 100 / 12)
    );

    return {
      ...entry,
      interestDue: newInterestDue,
      totalDue: roundToTwo(entry.principalDue + newInterestDue + entry.feesDue),
    };
  });
}

/**
 * Calculate savings from early payoff
 */
function calculateSavings(
  schedule: LoanScheduleEntry[],
  currentInstallment: number,
  termMonths: number
): number {
  const remaining = schedule.slice(currentInstallment);
  return remaining.reduce((sum, entry) => sum + entry.interestDue + entry.feesDue, 0);
}

/**
 * Calculate effective annual rate
 */
function calculateEffectiveRate(
  principal: number,
  totalPayment: number,
  termMonths: number
): number {
  const totalInterest = totalPayment - principal;
  const avgMonthlyInterest = totalInterest / termMonths;
  const avgBalance = principal / 2;
  const monthlyRate = avgMonthlyInterest / avgBalance;
  const annualRate = monthlyRate * 12 * 100;

  return roundToTwo(annualRate);
}

/**
 * Round to 2 decimal places
 */
function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

