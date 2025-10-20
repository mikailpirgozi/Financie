import type { LoanCalculationInput, LoanCalculationResult, LoanScheduleEntry } from '../types';
import { calculateDayCountFactor, addMonths } from './day-count';

/**
 * Main loan calculator
 * Generates complete payment schedule for all loan types
 */
export function calculateLoan(input: LoanCalculationInput): LoanCalculationResult {
  const { loanType, principal, feeSetup = 0 } = input;

  // Add setup fee to principal (increases effective rate)
  const effectivePrincipal = principal + feeSetup;

  let schedule: LoanScheduleEntry[];

  switch (loanType) {
    case 'annuity':
      schedule = calculateAnnuity(input, effectivePrincipal);
      break;
    case 'fixed_principal':
      schedule = calculateFixedPrincipal(input, effectivePrincipal);
      break;
    case 'interest_only':
      schedule = calculateInterestOnly(input, effectivePrincipal);
      break;
  }

  // Calculate totals
  const totalInterest = schedule.reduce((sum, entry) => sum + entry.interestDue, 0);
  const totalFees = schedule.reduce((sum, entry) => sum + entry.feesDue, 0) + feeSetup;
  const totalPayment = schedule.reduce((sum, entry) => sum + entry.totalDue, 0) + feeSetup;

  // Calculate effective rate (RPMN)
  const effectiveRate = calculateEffectiveRate(principal, totalPayment, input.termMonths);

  return {
    schedule,
    totalInterest,
    totalFees,
    totalPayment,
    effectiveRate,
  };
}

/**
 * Annuity loan - fixed monthly payment
 * Payment = Principal * (r * (1+r)^n) / ((1+r)^n - 1)
 */
function calculateAnnuity(
  input: LoanCalculationInput,
  effectivePrincipal: number
): LoanScheduleEntry[] {
  const { annualRate, termMonths, startDate, dayCountConvention, feeMonthly = 0, insuranceMonthly = 0 } = input;
  
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment = effectivePrincipal * 
    (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
    (Math.pow(1 + monthlyRate, termMonths) - 1);

  const schedule: LoanScheduleEntry[] = [];
  let balance = effectivePrincipal;

  for (let i = 1; i <= termMonths; i++) {
    const dueDate = addMonths(startDate, i);
    const prevDate = i === 1 ? startDate : addMonths(startDate, i - 1);
    
    const dayCountFactor = calculateDayCountFactor(prevDate, dueDate, dayCountConvention);
    const interestDue = roundToTwo(balance * (annualRate / 100) * dayCountFactor);
    const feesDue = roundToTwo(feeMonthly + insuranceMonthly);
    const principalDue = roundToTwo(monthlyPayment - interestDue);
    
    balance = roundToTwo(Math.max(0, balance - principalDue));

    schedule.push({
      installmentNo: i,
      dueDate,
      principalDue,
      interestDue,
      feesDue,
      totalDue: roundToTwo(principalDue + interestDue + feesDue),
      principalBalanceAfter: balance,
      status: 'pending',
    });
  }

  return schedule;
}

/**
 * Fixed principal loan - decreasing payments
 * Principal payment is fixed, interest decreases over time
 */
function calculateFixedPrincipal(
  input: LoanCalculationInput,
  effectivePrincipal: number
): LoanScheduleEntry[] {
  const { annualRate, termMonths, startDate, dayCountConvention, feeMonthly = 0, insuranceMonthly = 0 } = input;
  
  const principalPayment = effectivePrincipal / termMonths;
  const schedule: LoanScheduleEntry[] = [];
  let balance = effectivePrincipal;

  for (let i = 1; i <= termMonths; i++) {
    const dueDate = addMonths(startDate, i);
    const prevDate = i === 1 ? startDate : addMonths(startDate, i - 1);
    
    const dayCountFactor = calculateDayCountFactor(prevDate, dueDate, dayCountConvention);
    const interestDue = roundToTwo(balance * (annualRate / 100) * dayCountFactor);
    const feesDue = roundToTwo(feeMonthly + insuranceMonthly);
    const principalDue = roundToTwo(principalPayment);
    
    balance = roundToTwo(Math.max(0, balance - principalDue));

    schedule.push({
      installmentNo: i,
      dueDate,
      principalDue,
      interestDue,
      feesDue,
      totalDue: roundToTwo(principalDue + interestDue + feesDue),
      principalBalanceAfter: balance,
      status: 'pending',
    });
  }

  return schedule;
}

/**
 * Interest-only loan with balloon payment
 * Monthly: only interest + fees
 * Last payment: interest + fees + balloon amount
 */
function calculateInterestOnly(
  input: LoanCalculationInput,
  effectivePrincipal: number
): LoanScheduleEntry[] {
  const { 
    annualRate, 
    termMonths, 
    startDate, 
    dayCountConvention, 
    feeMonthly = 0, 
    insuranceMonthly = 0,
    balloonAmount = effectivePrincipal 
  } = input;
  
  const schedule: LoanScheduleEntry[] = [];
  const balance = effectivePrincipal;

  for (let i = 1; i <= termMonths; i++) {
    const dueDate = addMonths(startDate, i);
    const prevDate = i === 1 ? startDate : addMonths(startDate, i - 1);
    
    const dayCountFactor = calculateDayCountFactor(prevDate, dueDate, dayCountConvention);
    const interestDue = roundToTwo(balance * (annualRate / 100) * dayCountFactor);
    const feesDue = roundToTwo(feeMonthly + insuranceMonthly);
    
    // Last payment includes balloon
    const principalDue = i === termMonths ? roundToTwo(balloonAmount) : 0;
    const principalBalanceAfter = i === termMonths ? 0 : balance;

    schedule.push({
      installmentNo: i,
      dueDate,
      principalDue,
      interestDue,
      feesDue,
      totalDue: roundToTwo(principalDue + interestDue + feesDue),
      principalBalanceAfter,
      status: 'pending',
    });
  }

  return schedule;
}

/**
 * Calculate effective annual rate (RPMN)
 * Using simple approximation formula
 */
function calculateEffectiveRate(principal: number, totalPayment: number, termMonths: number): number {
  const totalInterest = totalPayment - principal;
  const avgMonthlyInterest = totalInterest / termMonths;
  const avgBalance = principal / 2;
  const monthlyRate = avgMonthlyInterest / avgBalance;
  const annualRate = monthlyRate * 12 * 100;
  
  return roundToTwo(annualRate);
}

/**
 * Round to 2 decimal places (cents)
 */
function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

