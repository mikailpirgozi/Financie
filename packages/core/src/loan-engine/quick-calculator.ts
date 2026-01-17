import type { LoanType } from '../types';

/**
 * Quick loan calculator for UI preview (mobile optimized)
 * Only calculates summary without generating full schedule
 * ~100x faster than full calculator
 * 
 * Handles edge cases:
 * - Zero interest rate (0%)
 * - Very long terms (up to 50 years)
 * - All loan types
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
      // Handle zero interest rate
      let calculatedPayment: number;
      if (annualRate === 0 || monthlyRate === 0) {
        calculatedPayment = effectivePrincipal / termMonths;
        totalInterest = 0;
      } else {
        // Calculate monthly payment using annuity formula
        calculatedPayment = fixedMonthlyPayment ?? (
          effectivePrincipal *
          (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
          (Math.pow(1 + monthlyRate, termMonths) - 1)
        );
        // Total interest = total paid - principal
        totalInterest = (calculatedPayment * termMonths) - effectivePrincipal;
      }
      
      firstPayment = calculatedPayment + feeMonthly + insuranceMonthly;
      lastPayment = firstPayment;
      break;
    }

    case 'fixed_principal': {
      const principalPayment = effectivePrincipal / termMonths;
      
      // Handle zero interest rate
      if (annualRate === 0 || monthlyRate === 0) {
        firstPayment = principalPayment + feeMonthly + insuranceMonthly;
        lastPayment = firstPayment;
        totalInterest = 0;
      } else {
        // First payment: full interest on entire principal
        const firstInterest = effectivePrincipal * monthlyRate;
        firstPayment = principalPayment + firstInterest + feeMonthly + insuranceMonthly;
        
        // Last payment: minimal interest
        const lastInterest = principalPayment * monthlyRate;
        lastPayment = principalPayment + lastInterest + feeMonthly + insuranceMonthly;
        
        // Total interest = (first + last) / 2 * termMonths (arithmetic sequence)
        totalInterest = ((firstInterest + lastInterest) / 2) * termMonths;
      }
      break;
    }

    case 'interest_only': {
      // Handle zero interest rate
      if (annualRate === 0 || monthlyRate === 0) {
        firstPayment = feeMonthly + insuranceMonthly;
        const balloonPmt = balloonAmount > 0 ? balloonAmount : effectivePrincipal;
        lastPayment = feeMonthly + insuranceMonthly + balloonPmt;
        totalInterest = 0;
      } else {
        const monthlyInterest = effectivePrincipal * monthlyRate;
        firstPayment = monthlyInterest + feeMonthly + insuranceMonthly;
        
        // Last payment includes balloon
        const balloonPmt = balloonAmount > 0 ? balloonAmount : effectivePrincipal;
        lastPayment = monthlyInterest + feeMonthly + insuranceMonthly + balloonPmt;
        
        totalInterest = monthlyInterest * termMonths;
      }
      break;
    }

    case 'graduated_payment': {
      // For quick calculation, approximate graduated payment
      // First payment is typically 75% of standard annuity
      // Last payment (after graduation) matches standard annuity
      const initialPaymentPct = 75; // Default
      
      if (annualRate === 0 || monthlyRate === 0) {
        const standardPayment = effectivePrincipal / termMonths;
        firstPayment = (standardPayment * initialPaymentPct / 100) + feeMonthly + insuranceMonthly;
        lastPayment = standardPayment + feeMonthly + insuranceMonthly;
        totalInterest = 0;
      } else {
        const standardPayment = effectivePrincipal *
          (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
          (Math.pow(1 + monthlyRate, termMonths) - 1);
        
        firstPayment = (standardPayment * initialPaymentPct / 100) + feeMonthly + insuranceMonthly;
        lastPayment = standardPayment + feeMonthly + insuranceMonthly;
        
        // Approximate total interest (slightly higher than standard annuity due to slower principal reduction)
        const standardTotalInterest = (standardPayment * termMonths) - effectivePrincipal;
        totalInterest = standardTotalInterest * 1.05; // ~5% higher due to negative amortization
      }
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

