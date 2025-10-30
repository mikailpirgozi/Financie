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
    case 'auto_loan':
      schedule = calculateAutoLoan(input, effectivePrincipal);
      break;
  }

  // Calculate totals
  const totalInterest = schedule.reduce((sum, entry) => sum + entry.interestDue, 0);
  
  // For auto_loan, setup fee is already included in the schedule (financed)
  // For other loan types, setup fee is paid separately upfront
  const totalFees = loanType === 'auto_loan' 
    ? schedule.reduce((sum, entry) => sum + entry.feesDue, 0)
    : schedule.reduce((sum, entry) => sum + entry.feesDue, 0) + feeSetup;
  
  const totalPayment = loanType === 'auto_loan'
    ? schedule.reduce((sum, entry) => sum + entry.totalDue, 0)
    : schedule.reduce((sum, entry) => sum + entry.totalDue, 0) + feeSetup;

  // Calculate effective rate (RPMN)
  // If no fees, RPMN = nominal rate
  const effectiveRate = totalFees === 0 
    ? input.annualRate 
    : calculateEffectiveRate(principal, schedule, feeSetup);

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
 * If fixedMonthlyPayment is provided, uses that exact amount
 */
function calculateAnnuity(
  input: LoanCalculationInput,
  effectivePrincipal: number
): LoanScheduleEntry[] {
  const { annualRate, termMonths, startDate, dayCountConvention, feeMonthly = 0, insuranceMonthly = 0, fixedMonthlyPayment } = input;
  
  const monthlyRate = annualRate / 100 / 12;
  
  // Use fixed payment if provided, otherwise calculate
  const calculatedPayment = effectivePrincipal * 
    (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
    (Math.pow(1 + monthlyRate, termMonths) - 1);
  
  const monthlyPayment = fixedMonthlyPayment ?? calculatedPayment;

  const schedule: LoanScheduleEntry[] = [];
  let balance = effectivePrincipal;

  for (let i = 1; i <= termMonths; i++) {
    const dueDate = addMonths(startDate, i);
    const prevDate = i === 1 ? startDate : addMonths(startDate, i - 1);
    
    const dayCountFactor = calculateDayCountFactor(prevDate, dueDate, dayCountConvention);
    const interestDue = roundToTwo(balance * (annualRate / 100) * dayCountFactor);
    const feesDue = roundToTwo(feeMonthly + insuranceMonthly);
    
    // For last payment, adjust to pay off remaining balance exactly
    let principalDue: number;
    if (i === termMonths) {
      // Last payment: pay off exact remaining balance
      principalDue = roundToTwo(balance);
    } else {
      principalDue = roundToTwo(monthlyPayment - interestDue);
    }
    
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
  const { annualRate, termMonths, startDate, dayCountConvention, feeMonthly = 0, insuranceMonthly = 0, fixedPrincipalPayment } = input;
  
  // Use fixed principal payment if provided, otherwise calculate
  const calculatedPrincipalPayment = effectivePrincipal / termMonths;
  const principalPayment = fixedPrincipalPayment ?? calculatedPrincipalPayment;
  
  const schedule: LoanScheduleEntry[] = [];
  let balance = effectivePrincipal;

  for (let i = 1; i <= termMonths; i++) {
    const dueDate = addMonths(startDate, i);
    const prevDate = i === 1 ? startDate : addMonths(startDate, i - 1);
    
    const dayCountFactor = calculateDayCountFactor(prevDate, dueDate, dayCountConvention);
    const interestDue = roundToTwo(balance * (annualRate / 100) * dayCountFactor);
    const feesDue = roundToTwo(feeMonthly + insuranceMonthly);
    
    // For last payment, adjust to pay off remaining balance exactly
    let principalDue: number;
    if (i === termMonths) {
      // Last payment: pay off exact remaining balance
      principalDue = roundToTwo(balance);
    } else {
      principalDue = roundToTwo(principalPayment);
    }
    
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
 * Auto loan (leasing) - annuity with setup fee included in principal
 * Setup fee is added to principal for interest calculation
 * This matches typical leasing contracts where setup fee is financed
 */
function calculateAutoLoan(
  input: LoanCalculationInput,
  effectivePrincipal: number
): LoanScheduleEntry[] {
  const { annualRate, termMonths, startDate, dayCountConvention, feeMonthly = 0, insuranceMonthly = 0, fixedMonthlyPayment } = input;
  
  const monthlyRate = annualRate / 100 / 12;
  
  // Use fixed payment if provided, otherwise calculate from effective principal
  const calculatedPayment = effectivePrincipal * 
    (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
    (Math.pow(1 + monthlyRate, termMonths) - 1);
  
  const monthlyPayment = fixedMonthlyPayment ?? calculatedPayment;

  const schedule: LoanScheduleEntry[] = [];
  let balance = effectivePrincipal;

  for (let i = 1; i <= termMonths; i++) {
    const dueDate = addMonths(startDate, i);
    const prevDate = i === 1 ? startDate : addMonths(startDate, i - 1);
    
    const dayCountFactor = calculateDayCountFactor(prevDate, dueDate, dayCountConvention);
    const interestDue = roundToTwo(balance * (annualRate / 100) * dayCountFactor);
    const feesDue = roundToTwo(feeMonthly + insuranceMonthly);
    
    // For last payment, adjust to pay off remaining balance exactly
    let principalDue: number;
    if (i === termMonths) {
      principalDue = roundToTwo(balance);
    } else {
      principalDue = roundToTwo(monthlyPayment - interestDue);
    }
    
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
 * Calculate effective annual rate (RPMN)
 * Uses IRR (Internal Rate of Return) with actual payment schedule
 */
function calculateEffectiveRate(
  principal: number, 
  schedule: LoanScheduleEntry[],
  feeSetup: number
): number {
  // Amount received (principal minus setup fee)
  const amountReceived = principal - feeSetup;
  
  // Use Newton-Raphson to find monthly rate that makes NPV = 0
  let rate = 0.008; // Start with ~10% annual
  const tolerance = 0.01; // 1 cent tolerance
  const maxIterations = 100;
  
  for (let i = 0; i < maxIterations; i++) {
    // Calculate NPV: -amountReceived + sum of discounted payments
    let npv = -amountReceived;
    let npvDerivative = 0;
    
    for (let month = 1; month <= schedule.length; month++) {
      const entry = schedule[month - 1];
      if (!entry) continue;
      
      const payment = entry.totalDue;
      const discountFactor = Math.pow(1 + rate, month);
      
      npv += payment / discountFactor;
      npvDerivative -= (month * payment) / Math.pow(1 + rate, month + 1);
    }
    
    // Add setup fee payment at month 0
    if (feeSetup > 0) {
      npv += feeSetup;
    }
    
    // Check convergence
    if (Math.abs(npv) < tolerance) {
      return roundToTwo(rate * 12 * 100);
    }
    
    // Check derivative
    if (Math.abs(npvDerivative) < 0.0001) {
      break;
    }
    
    // Newton-Raphson update
    rate = rate - npv / npvDerivative;
    
    // Keep rate in reasonable bounds
    if (rate < 0) rate = 0.0001;
    if (rate > 0.5) rate = 0.5;
  }
  
  // Fallback: simple approximation
  const totalPaid = schedule.reduce((sum, entry) => sum + entry.totalDue, 0) + feeSetup;
  const totalInterestAndFees = totalPaid - principal;
  const avgMonthlyInterest = totalInterestAndFees / schedule.length;
  const avgBalance = amountReceived / 2;
  const monthlyRate = avgBalance > 0 ? avgMonthlyInterest / avgBalance : 0;
  
  return roundToTwo(monthlyRate * 12 * 100);
}

/**
 * Round to 2 decimal places (cents)
 */
function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

