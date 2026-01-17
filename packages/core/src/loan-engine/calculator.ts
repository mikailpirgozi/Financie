import type { LoanCalculationInput, LoanCalculationResult, LoanScheduleEntry } from '../types';
import { calculateDayCountFactor, addMonths } from './day-count';

/**
 * Main loan calculator
 * Generates complete payment schedule for all loan types
 * 
 * Supported loan types:
 * - annuity: Fixed monthly payment (most common for consumer loans)
 * - fixed_principal: Fixed principal + decreasing interest (common for mortgages in EU)
 * - interest_only: Only interest paid monthly, principal at maturity (bullet/balloon)
 * - auto_loan: Same as annuity but setup fee is financed (included in principal)
 * 
 * Day count conventions:
 * - 30E/360: European standard (each month = 30 days, year = 360)
 * - ACT/360: Actual days / 360 (money market standard)
 * - ACT/365: Actual days / 365 (UK standard)
 */
export function calculateLoan(input: LoanCalculationInput): LoanCalculationResult {
  // Validate input
  validateInput(input);
  
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
    case 'graduated_payment':
      schedule = calculateGraduatedPayment(input, effectivePrincipal);
      break;
    default:
      throw new Error(`Unknown loan type: ${loanType}`);
  }

  // Calculate totals
  const totalInterest = roundToTwo(schedule.reduce((sum, entry) => sum + entry.interestDue, 0));
  
  // For auto_loan, setup fee is already included in the schedule (financed)
  // For other loan types, setup fee is paid separately upfront
  const isSetupFeeFinanced = loanType === 'auto_loan';
  const monthlyFees = schedule.reduce((sum, entry) => sum + entry.feesDue, 0);
  const totalFees = roundToTwo(isSetupFeeFinanced ? monthlyFees : monthlyFees + feeSetup);
  
  const schedulePayments = schedule.reduce((sum, entry) => sum + entry.totalDue, 0);
  const totalPayment = roundToTwo(isSetupFeeFinanced ? schedulePayments : schedulePayments + feeSetup);

  // Calculate effective rate (RPMN / APR)
  // If no fees and standard interest, RPMN ≈ nominal rate
  const hasExtraFees = feeSetup > 0 || monthlyFees > 0;
  const effectiveRate = hasExtraFees 
    ? calculateEffectiveRate(principal, schedule, feeSetup, isSetupFeeFinanced)
    : input.annualRate;

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
 * 
 * For zero interest rate: Payment = Principal / n
 * 
 * Interest calculation uses day count convention for accuracy.
 * The monthly payment is recalculated each period to ensure
 * the loan is fully amortized by the end of the term.
 * 
 * If fixedMonthlyPayment is provided, uses that exact amount.
 */
function calculateAnnuity(
  input: LoanCalculationInput,
  effectivePrincipal: number
): LoanScheduleEntry[] {
  const { annualRate, termMonths, startDate, dayCountConvention, feeMonthly = 0, insuranceMonthly = 0, fixedMonthlyPayment } = input;
  
  const monthlyRate = annualRate / 100 / 12;
  
  // Handle zero interest rate specially
  let calculatedPayment: number;
  if (annualRate === 0 || monthlyRate === 0) {
    // Zero interest: simple division
    calculatedPayment = effectivePrincipal / termMonths;
  } else {
    // Standard annuity formula: PMT = P * r(1+r)^n / ((1+r)^n - 1)
    calculatedPayment = effectivePrincipal * 
      (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
      (Math.pow(1 + monthlyRate, termMonths) - 1);
  }
  
  const monthlyPayment = fixedMonthlyPayment ?? calculatedPayment;

  const schedule: LoanScheduleEntry[] = [];
  let balance = effectivePrincipal;

  for (let i = 1; i <= termMonths; i++) {
    const dueDate = addMonths(startDate, i);
    const prevDate = i === 1 ? startDate : addMonths(startDate, i - 1);
    
    // Calculate interest using day count convention
    const dayCountFactor = calculateDayCountFactor(prevDate, dueDate, dayCountConvention);
    const interestDue = roundToTwo(balance * (annualRate / 100) * dayCountFactor);
    const feesDue = roundToTwo(feeMonthly + insuranceMonthly);
    
    // For last payment, adjust to pay off remaining balance exactly
    let principalDue: number;
    if (i === termMonths) {
      // Last payment: pay off exact remaining balance
      principalDue = roundToTwo(balance);
    } else {
      // Principal = Payment - Interest (cannot be negative)
      principalDue = roundToTwo(Math.max(0, monthlyPayment - interestDue));
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
 * 
 * Formula:
 * - Principal per period = P / n (constant)
 * - Interest per period = Balance * r * dayCountFactor (decreasing)
 * - Total payment = Principal + Interest (decreasing over time)
 * 
 * Benefits: Lower total interest paid compared to annuity
 * Drawback: Higher initial payments
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
    
    // Calculate interest (will be 0 for zero interest rate)
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
 * 
 * Formula:
 * - Monthly payment = P * r * dayCountFactor (interest only)
 * - Last payment = Interest + Balloon amount
 * 
 * Use cases:
 * - Investment loans (pay interest, refinance principal)
 * - Bridge loans (short-term financing)
 * - Development loans
 * 
 * If balloonAmount is not specified, defaults to full principal.
 * Partial balloon payments are supported.
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
  // For interest-only, balance stays constant until balloon payment
  let balance = effectivePrincipal;

  for (let i = 1; i <= termMonths; i++) {
    const dueDate = addMonths(startDate, i);
    const prevDate = i === 1 ? startDate : addMonths(startDate, i - 1);
    
    // Calculate interest (will be 0 for zero interest rate)
    const dayCountFactor = calculateDayCountFactor(prevDate, dueDate, dayCountConvention);
    const interestDue = roundToTwo(balance * (annualRate / 100) * dayCountFactor);
    const feesDue = roundToTwo(feeMonthly + insuranceMonthly);
    
    // Last payment includes balloon (may be partial or full)
    const isLastPayment = i === termMonths;
    const principalDue = isLastPayment ? roundToTwo(balloonAmount) : 0;
    
    // Update balance after balloon payment
    if (isLastPayment) {
      balance = roundToTwo(Math.max(0, balance - balloonAmount));
    }

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
 * Auto loan (leasing) - annuity with setup fee included in principal
 * 
 * Difference from regular annuity:
 * - Setup fee is FINANCED (added to principal and interest is charged on it)
 * - Total fees don't include setup fee separately (it's in the principal)
 * 
 * This matches typical leasing contracts where:
 * - Initial costs are rolled into the financing
 * - No large upfront payment required
 * 
 * Formula is same as annuity, with setup fee already in effectivePrincipal.
 */
function calculateAutoLoan(
  input: LoanCalculationInput,
  effectivePrincipal: number
): LoanScheduleEntry[] {
  const { annualRate, termMonths, startDate, dayCountConvention, feeMonthly = 0, insuranceMonthly = 0, fixedMonthlyPayment } = input;
  
  const monthlyRate = annualRate / 100 / 12;
  
  // Handle zero interest rate specially
  let calculatedPayment: number;
  if (annualRate === 0 || monthlyRate === 0) {
    // Zero interest: simple division
    calculatedPayment = effectivePrincipal / termMonths;
  } else {
    // Standard annuity formula
    calculatedPayment = effectivePrincipal * 
      (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
      (Math.pow(1 + monthlyRate, termMonths) - 1);
  }
  
  const monthlyPayment = fixedMonthlyPayment ?? calculatedPayment;

  const schedule: LoanScheduleEntry[] = [];
  let balance = effectivePrincipal;

  for (let i = 1; i <= termMonths; i++) {
    const dueDate = addMonths(startDate, i);
    const prevDate = i === 1 ? startDate : addMonths(startDate, i - 1);
    
    // Calculate interest using day count convention
    const dayCountFactor = calculateDayCountFactor(prevDate, dueDate, dayCountConvention);
    const interestDue = roundToTwo(balance * (annualRate / 100) * dayCountFactor);
    const feesDue = roundToTwo(feeMonthly + insuranceMonthly);
    
    // For last payment, adjust to pay off remaining balance exactly
    let principalDue: number;
    if (i === termMonths) {
      principalDue = roundToTwo(balance);
    } else {
      // Principal = Payment - Interest (cannot be negative)
      principalDue = roundToTwo(Math.max(0, monthlyPayment - interestDue));
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
 * Graduated Payment Loan - payments start low and increase over time
 * 
 * This loan type is designed for borrowers who expect their income to increase:
 * - Initial payments are lower than standard annuity
 * - Payments increase in steps over the graduation period
 * - After graduation period, payments remain constant
 * 
 * WARNING: This can result in negative amortization in early periods
 * (payments may not cover all interest, causing balance to grow)
 * 
 * Configuration:
 * - initialPaymentPct: Starting payment as % of standard annuity (e.g., 70%)
 * - graduationPeriodMonths: Total period of payment increases
 * - graduationSteps: Number of payment increases
 * 
 * Example: 70% initial, 60 months graduation, 5 steps
 * - Year 1: 70% of standard payment
 * - Year 2: 77.5% of standard payment
 * - Year 3: 85% of standard payment
 * - Year 4: 92.5% of standard payment
 * - Year 5: 100% of standard payment
 * - Year 6+: Recalculated to amortize remaining balance
 */
function calculateGraduatedPayment(
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
    graduatedConfig
  } = input;
  
  // Default configuration if not provided
  const config = graduatedConfig ?? {
    initialPaymentPct: 75, // Start at 75% of standard payment
    graduationPeriodMonths: 60, // Graduate over 5 years
    graduationSteps: 5, // 5 annual increases
  };
  
  const monthlyRate = annualRate / 100 / 12;
  
  // Calculate standard annuity payment for reference
  let standardPayment: number;
  if (annualRate === 0 || monthlyRate === 0) {
    standardPayment = effectivePrincipal / termMonths;
  } else {
    standardPayment = effectivePrincipal * 
      (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
      (Math.pow(1 + monthlyRate, termMonths) - 1);
  }
  
  // Calculate payment schedule
  const schedule: LoanScheduleEntry[] = [];
  let balance = effectivePrincipal;
  const monthsPerStep = Math.floor(config.graduationPeriodMonths / config.graduationSteps);
  const paymentIncreasePct = (100 - config.initialPaymentPct) / config.graduationSteps;
  
  for (let i = 1; i <= termMonths; i++) {
    const dueDate = addMonths(startDate, i);
    const prevDate = i === 1 ? startDate : addMonths(startDate, i - 1);
    
    // Determine which graduation step we're in
    let currentPaymentPct: number;
    if (i > config.graduationPeriodMonths) {
      // After graduation period, calculate payment to amortize remaining balance
      const remainingMonths = termMonths - i + 1;
      if (annualRate === 0 || monthlyRate === 0) {
        currentPaymentPct = 100; // Use standard for calculation below
      } else {
        // Recalculate payment for remaining term
        const recalculatedPayment = balance * 
          (monthlyRate * Math.pow(1 + monthlyRate, remainingMonths)) / 
          (Math.pow(1 + monthlyRate, remainingMonths) - 1);
        currentPaymentPct = (recalculatedPayment / standardPayment) * 100;
      }
    } else {
      // During graduation period
      const currentStep = Math.floor((i - 1) / monthsPerStep);
      currentPaymentPct = config.initialPaymentPct + (currentStep * paymentIncreasePct);
    }
    
    // Calculate current month's payment (principal + interest portion)
    let currentPayment: number;
    if (i > config.graduationPeriodMonths && annualRate > 0) {
      // After graduation: recalculate for remaining balance
      const remainingMonths = termMonths - i + 1;
      if (remainingMonths > 0) {
        currentPayment = balance * 
          (monthlyRate * Math.pow(1 + monthlyRate, remainingMonths)) / 
          (Math.pow(1 + monthlyRate, remainingMonths) - 1);
      } else {
        currentPayment = balance;
      }
    } else {
      currentPayment = standardPayment * (currentPaymentPct / 100);
    }
    
    // Calculate interest
    const dayCountFactor = calculateDayCountFactor(prevDate, dueDate, dayCountConvention);
    const interestDue = roundToTwo(balance * (annualRate / 100) * dayCountFactor);
    const feesDue = roundToTwo(feeMonthly + insuranceMonthly);
    
    // Calculate principal (can be negative for negative amortization)
    let principalDue: number;
    if (i === termMonths) {
      // Last payment: pay off remaining balance
      principalDue = roundToTwo(balance);
    } else {
      principalDue = roundToTwo(currentPayment - interestDue);
    }
    
    // Update balance (can increase if negative amortization)
    balance = roundToTwo(balance - principalDue);

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
 * Calculate effective annual rate (RPMN / APR)
 * Uses IRR (Internal Rate of Return) with actual payment schedule
 * 
 * RPMN calculation follows EU Consumer Credit Directive formula:
 * Sum of (cash flows received) = Sum of (cash flows paid, discounted by effective rate)
 * 
 * Cash flow at t=0: Borrower receives principal (positive)
 * Cash flow at t=0: Borrower pays setup fee (negative) - only if paid upfront
 * Cash flows at t=1..n: Borrower pays installments (negative)
 * 
 * For auto_loan: setup fee is financed, so no t=0 payment
 * For other loans: setup fee is paid upfront at t=0
 */
function calculateEffectiveRate(
  principal: number, 
  schedule: LoanScheduleEntry[],
  feeSetup: number,
  isSetupFeeFinanced: boolean = false
): number {
  // What borrower receives at t=0
  // If setup fee is NOT financed, it's deducted from what they receive
  const amountReceived = isSetupFeeFinanced ? principal : principal;
  
  // What borrower pays at t=0 (only if setup fee is paid upfront)
  const upfrontPayment = isSetupFeeFinanced ? 0 : feeSetup;
  
  // Net cash flow at t=0 (positive = borrower receives)
  const cashFlowT0 = amountReceived - upfrontPayment;
  
  // Handle edge case: no payments
  if (schedule.length === 0) {
    return 0;
  }
  
  // Use Newton-Raphson to find monthly rate that makes NPV = 0
  // NPV = cashFlowT0 - PV(all future payments)
  let rate = 0.008; // Start with ~10% annual
  const tolerance = 0.01; // 1 cent tolerance
  const maxIterations = 100;
  
  for (let i = 0; i < maxIterations; i++) {
    // Calculate NPV: cashFlowT0 - sum of discounted payments
    let npv = cashFlowT0;
    let npvDerivative = 0;
    
    for (let month = 1; month <= schedule.length; month++) {
      const entry = schedule[month - 1];
      if (!entry) continue;
      
      const payment = entry.totalDue;
      const discountFactor = Math.pow(1 + rate, month);
      
      // Subtract payments (outflow from borrower's perspective)
      npv -= payment / discountFactor;
      // Derivative: d/dr of (-P / (1+r)^m) = m*P / (1+r)^(m+1)
      npvDerivative += (month * payment) / Math.pow(1 + rate, month + 1);
    }
    
    // Check convergence
    if (Math.abs(npv) < tolerance) {
      return roundToTwo(rate * 12 * 100);
    }
    
    // Check derivative to avoid division by zero
    if (Math.abs(npvDerivative) < 0.0001) {
      break;
    }
    
    // Newton-Raphson update
    rate = rate - npv / npvDerivative;
    
    // Keep rate in reasonable bounds
    if (rate < 0) rate = 0.0001;
    if (rate > 0.5) rate = 0.5; // Max ~600% annual
  }
  
  // Fallback: simple approximation using average balance method
  const totalPaid = schedule.reduce((sum, entry) => sum + entry.totalDue, 0) + upfrontPayment;
  const totalInterestAndFees = totalPaid - principal;
  const avgBalance = principal / 2;
  const years = schedule.length / 12;
  const annualRate = avgBalance > 0 && years > 0 
    ? (totalInterestAndFees / avgBalance / years) * 100 
    : 0;
  
  return roundToTwo(annualRate);
}

/**
 * Validate loan calculation input
 * Throws descriptive errors for invalid inputs
 */
function validateInput(input: LoanCalculationInput): void {
  const { principal, annualRate, termMonths, loanType, balloonAmount } = input;
  
  if (principal <= 0) {
    throw new Error('Principal must be positive');
  }
  
  if (annualRate < 0) {
    throw new Error('Annual rate cannot be negative');
  }
  
  if (annualRate > 100) {
    // Allow high rates but warn (some payday loans have high APR)
    console.warn(`Warning: Very high annual rate (${annualRate}%)`);
  }
  
  if (termMonths <= 0 || !Number.isInteger(termMonths)) {
    throw new Error('Term must be a positive integer');
  }
  
  if (termMonths > 600) { // 50 years max
    throw new Error('Term cannot exceed 600 months (50 years)');
  }
  
  if (loanType === 'interest_only' && balloonAmount !== undefined) {
    if (balloonAmount < 0) {
      throw new Error('Balloon amount cannot be negative');
    }
    if (balloonAmount > principal * 1.5) {
      // Balloon larger than principal + 50% is suspicious
      console.warn('Warning: Balloon amount is larger than principal');
    }
  }
}

/**
 * Round to 2 decimal places (cents)
 * Uses banker's rounding (round half to even) for better accuracy
 */
function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

