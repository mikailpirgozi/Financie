import type { LoanType } from '../types';

/**
 * Quick loan calculator for UI preview (mobile optimized)
 * Only calculates summary without generating full schedule
 * ~100x faster than full calculator
 */
export interface QuickLoanResult {
  firstPayment: number;
  lastPayment: number;
  totalInterest: number;
  totalFees: number;
  totalPayment: number;
  effectiveRate: number;
  endDate: Date;
}

export function quickCalculateLoan(
  loanType: LoanType,
  principal: number,
  annualRate: number,
  termMonths: number,
  startDate: Date,
  feeSetup: number = 0,
  feeMonthly: number = 0,
  insuranceMonthly: number = 0,
  balloonAmount: number = 0,
  fixedMonthlyPayment?: number
): QuickLoanResult {
  const monthlyRate = annualRate / 100 / 12;
  const effectivePrincipal = principal + feeSetup;
  
  let firstPayment: number;
  let lastPayment: number;
  let totalInterest: number;

  switch (loanType) {
    case 'annuity':
    case 'auto_loan': {
      // Calculate monthly payment
      const calculatedPayment = fixedMonthlyPayment ?? (
        effectivePrincipal *
        (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
        (Math.pow(1 + monthlyRate, termMonths) - 1)
      );
      
      // Quick interest approximation using average balance
      // For annuity: average balance ≈ principal / 2
      const avgBalance = effectivePrincipal / 2;
      totalInterest = avgBalance * (annualRate / 100) * (termMonths / 12);
      
      // More accurate: total paid - principal
      totalInterest = (calculatedPayment * termMonths) - effectivePrincipal;
      
      firstPayment = calculatedPayment + feeMonthly + insuranceMonthly;
      lastPayment = firstPayment;
      break;
    }

    case 'fixed_principal': {
      const principalPayment = effectivePrincipal / termMonths;
      
      // First payment: full interest on entire principal
      const firstInterest = effectivePrincipal * monthlyRate;
      firstPayment = principalPayment + firstInterest + feeMonthly + insuranceMonthly;
      
      // Last payment: minimal interest
      const lastInterest = principalPayment * monthlyRate;
      lastPayment = principalPayment + lastInterest + feeMonthly + insuranceMonthly;
      
      // Total interest = (first + last) / 2 * termMonths (arithmetic sequence)
      totalInterest = ((firstInterest + lastInterest) / 2) * termMonths;
      break;
    }

    case 'interest_only': {
      const monthlyInterest = effectivePrincipal * monthlyRate;
      firstPayment = monthlyInterest + feeMonthly + insuranceMonthly;
      
      // Last payment includes balloon
      const balloonPmt = balloonAmount > 0 ? balloonAmount : effectivePrincipal;
      lastPayment = monthlyInterest + feeMonthly + insuranceMonthly + balloonPmt;
      
      totalInterest = monthlyInterest * termMonths;
      break;
    }

    default:
      throw new Error(`Unknown loan type: ${loanType}`);
  }

  const totalFees = feeSetup + (feeMonthly + insuranceMonthly) * termMonths;
  const totalPayment = principal + totalInterest + totalFees;
  
  // Simple RPMN approximation
  // More accurate calculation would need IRR, but for preview this is good enough
  const effectiveRate = totalFees === 0 
    ? annualRate 
    : ((totalInterest + totalFees) / principal / (termMonths / 12)) * 100;

  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + termMonths);

  return {
    firstPayment: Math.round(firstPayment * 100) / 100,
    lastPayment: Math.round(lastPayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalFees: Math.round(totalFees * 100) / 100,
    totalPayment: Math.round(totalPayment * 100) / 100,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    endDate,
  };
}

