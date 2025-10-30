import type { LoanType } from '../types';

/**
 * Calculate annual interest rate from known monthly payment
 * Uses Newton-Raphson method for numerical approximation
 */
export function calculateRateFromPayment(
  principal: number,
  monthlyPayment: number,
  termMonths: number,
  loanType: LoanType = 'annuity',
  feeSetup: number = 0,
  feeMonthly: number = 0,
  insuranceMonthly: number = 0
): number {
  // Adjust for setup fee - add because we repay principal + fee
  const effectivePrincipal = principal + feeSetup;
  
  // Adjust monthly payment for fees
  const netPayment = monthlyPayment - feeMonthly - insuranceMonthly;

  if (netPayment <= 0) {
    throw new Error('Mesačná splátka musí byť väčšia ako poplatky');
  }

  if (loanType === 'annuity' || loanType === 'auto_loan') {
    // For auto_loan, effectivePrincipal already includes setup fee
    return calculateRateAnnuity(effectivePrincipal, netPayment, termMonths);
  } else if (loanType === 'fixed_principal') {
    return calculateRateFixedPrincipal(effectivePrincipal, netPayment, termMonths);
  } else {
    // Interest-only - simple calculation
    const monthlyInterest = netPayment;
    const monthlyRate = monthlyInterest / effectivePrincipal;
    return roundToTwo(monthlyRate * 12 * 100);
  }
}

/**
 * Calculate term (months) from known monthly payment and rate
 */
export function calculateTermFromPayment(
  principal: number,
  annualRate: number,
  monthlyPayment: number,
  loanType: LoanType = 'annuity',
  feeSetup: number = 0,
  feeMonthly: number = 0,
  insuranceMonthly: number = 0
): number {
  // Adjust for setup fee - add because we repay principal + fee
  const effectivePrincipal = principal + feeSetup;
  const netPayment = monthlyPayment - feeMonthly - insuranceMonthly;
  const monthlyRate = annualRate / 100 / 12;

  if (netPayment <= 0) {
    throw new Error('Mesačná splátka musí byť väčšia ako poplatky');
  }

  if (loanType === 'annuity' || loanType === 'auto_loan') {
    // n = -log(1 - (P * r) / M) / log(1 + r)
    // where P = principal, r = monthly rate, M = monthly payment
    
    if (monthlyRate === 0) {
      return Math.ceil(effectivePrincipal / netPayment);
    }

    const numerator = Math.log(1 - (effectivePrincipal * monthlyRate) / netPayment);
    const denominator = Math.log(1 + monthlyRate);
    
    if (numerator >= 0) {
      throw new Error('Splátka je príliš nízka na splatenie úveru');
    }

    const termMonths = -numerator / denominator;
    return Math.ceil(termMonths);
  } else if (loanType === 'fixed_principal') {
    // For fixed principal, use approximation based on average interest
    const avgInterest = (effectivePrincipal * monthlyRate) / 2;
    
    // Rough approximation
    return Math.ceil(effectivePrincipal / (netPayment - avgInterest));
  } else {
    // Interest-only
    throw new Error('Pre interest-only úver musíte zadať dobu splácania');
  }
}

/**
 * Newton-Raphson method to find interest rate for annuity loan
 * With improved convergence for low rates and long terms
 */
function calculateRateAnnuity(
  principal: number,
  monthlyPayment: number,
  termMonths: number
): number {
  // Better initial guess based on simple interest approximation
  const totalPayment = monthlyPayment * termMonths;
  const totalInterest = totalPayment - principal;
  const avgMonthlyInterest = totalInterest / termMonths;
  const avgBalance = principal / 2;
  let rate = avgBalance > 0 ? (avgMonthlyInterest / avgBalance) : 0.004; // ~5% annual as fallback
  
  const tolerance = 0.00001;
  const maxIterations = 200;
  let lastDiff = Infinity;

  for (let i = 0; i < maxIterations; i++) {
    // Handle zero or very low rate case
    if (rate < 0.000001) {
      rate = 0.000001;
    }

    // Calculate payment with current rate
    const rateFactorPow = Math.pow(1 + rate, termMonths);
    const payment = principal * (rate * rateFactorPow) / (rateFactorPow - 1);
    
    // Check for convergence
    const diff = payment - monthlyPayment;
    
    if (Math.abs(diff) < tolerance) {
      return roundToTwo(rate * 12 * 100);
    }

    // Detect oscillation or divergence
    if (Math.abs(diff) > Math.abs(lastDiff) * 1.5) {
      // Use bisection method instead
      return calculateRateBisection(principal, monthlyPayment, termMonths);
    }
    lastDiff = diff;
    
    // Calculate derivative
    const derivative = calculateAnnuityDerivative(principal, rate, termMonths);
    
    if (Math.abs(derivative) < 0.0001) {
      // Derivative too small, switch to bisection
      return calculateRateBisection(principal, monthlyPayment, termMonths);
    }
    
    // Newton-Raphson update with damping for stability
    const dampingFactor = 0.5; // Slower convergence but more stable
    rate = rate - (diff / derivative) * dampingFactor;
    
    // Ensure rate stays in reasonable bounds
    if (rate < 0) rate = 0.00001;
    if (rate > 0.5) rate = 0.5; // Max 600% annual rate
  }

  // If Newton-Raphson failed, try bisection as fallback
  return calculateRateBisection(principal, monthlyPayment, termMonths);
}

/**
 * Bisection method as fallback - slower but more reliable
 */
function calculateRateBisection(
  principal: number,
  monthlyPayment: number,
  termMonths: number
): number {
  let rateLow = 0;
  let rateHigh = 0.5; // Max 600% annual (monthly rate)
  const tolerance = 0.01; // Tolerance in payment amount (cents)
  const maxIterations = 100;

  for (let i = 0; i < maxIterations; i++) {
    const rateMid = (rateLow + rateHigh) / 2;
    
    // Calculate payment at midpoint
    let payment: number;
    if (rateMid < 0.000001) {
      // For very low rates, use simple division
      payment = principal / termMonths;
    } else {
      const rateFactorPow = Math.pow(1 + rateMid, termMonths);
      if (!isFinite(rateFactorPow)) {
        // Overflow, rate is too high
        rateHigh = rateMid;
        continue;
      }
      payment = principal * (rateMid * rateFactorPow) / (rateFactorPow - 1);
    }
    
    const diff = payment - monthlyPayment;
    
    // Check convergence based on payment difference
    if (Math.abs(diff) < tolerance) {
      return roundToTwo(rateMid * 12 * 100);
    }
    
    // Adjust bounds based on whether payment is too high or too low
    if (payment > monthlyPayment) {
      // Payment too high, rate is too high
      rateHigh = rateMid;
    } else {
      // Payment too low, rate is too low
      rateLow = rateMid;
    }
    
    // Check if bounds are too close
    if (Math.abs(rateHigh - rateLow) < 0.0000001) {
      break;
    }
  }

  // Return best estimate
  const rateMid = (rateLow + rateHigh) / 2;
  return roundToTwo(rateMid * 12 * 100);
}

/**
 * Calculate derivative for Newton-Raphson method
 */
function calculateAnnuityDerivative(
  principal: number,
  rate: number,
  termMonths: number
): number {
  const epsilon = 0.0001;
  const payment1 = principal * (rate * Math.pow(1 + rate, termMonths)) / 
                   (Math.pow(1 + rate, termMonths) - 1);
  const payment2 = principal * ((rate + epsilon) * Math.pow(1 + rate + epsilon, termMonths)) / 
                   (Math.pow(1 + rate + epsilon, termMonths) - 1);
  return (payment2 - payment1) / epsilon;
}

/**
 * Calculate rate for fixed principal loan
 */
function calculateRateFixedPrincipal(
  principal: number,
  avgPayment: number,
  termMonths: number
): number {
  const principalPayment = principal / termMonths;
  const avgInterest = avgPayment - principalPayment;
  
  // Average balance is half of principal
  const avgBalance = principal / 2;
  const monthlyRate = avgInterest / avgBalance;
  
  return roundToTwo(monthlyRate * 12 * 100);
}

function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

