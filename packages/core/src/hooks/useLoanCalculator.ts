import { calculateLoan, calculateRateFromPayment, calculateTermFromPayment, quickCalculateLoan } from '../loan-engine';
import type { LoanType, LoanCalculationInput } from '../types';
import type { LoanCalculationMode } from '../loan-defaults';

export interface LoanCalculatorInput {
  loanType: LoanType;
  principal: number;
  annualRate?: number;
  monthlyPayment?: number;
  termMonths?: number;
  startDate: Date;
  feeSetup?: number;
  feeMonthly?: number;
  insuranceMonthly?: number;
  balloonAmount?: number;
  calculationMode: LoanCalculationMode;
}

export interface LoanCalculatorResult {
  // Calculated values
  calculatedRate: number | null;
  calculatedPayment: number | null;
  calculatedTerm: number | null;
  
  // Loan details
  effectiveRate: number;
  totalInterest: number;
  totalFees: number;
  totalPayment: number;
  firstPayment: number;
  lastPayment: number;
  endDate: Date;
  
  // Validation
  isValid: boolean;
  error: string | null;
}

/**
 * Quick loan calculator for mobile preview (no schedule generation)
 * ~100x faster than calculateLoanData, perfect for real-time form updates
 * Use this for preview/form validation, use calculateLoanData for final submission
 */
export function quickCalculateLoanData(input: LoanCalculatorInput): LoanCalculatorResult | null {
    const {
      loanType,
      principal,
      annualRate = 0,
      monthlyPayment = 0,
      termMonths = 0,
      startDate,
      feeSetup = 0,
      feeMonthly = 0,
      insuranceMonthly = 0,
      balloonAmount = 0,
      calculationMode,
    } = input;

    // Validate minimum requirements
    if (!principal || principal <= 0) {
      return null;
    }

    try {
      let finalRate = annualRate;
      let finalTerm = termMonths;
      let finalPayment = monthlyPayment;
      let calculatedRate: number | null = null;
      let calculatedTerm: number | null = null;
      let calculatedPayment: number | null = null;

      // Calculate missing parameter based on mode
      switch (calculationMode) {
        case 'payment_term':
          // Have: payment + term → Calculate: rate
          if (monthlyPayment > 0 && termMonths > 0) {
            finalRate = calculateRateFromPayment(
              principal,
              monthlyPayment,
              termMonths,
              loanType,
              feeSetup,
              feeMonthly,
              insuranceMonthly
            );
            calculatedRate = finalRate;
          } else {
            return null;
          }
          break;

        case 'rate_payment':
          // Have: rate + payment → Calculate: term
          if (annualRate > 0 && monthlyPayment > 0) {
            finalTerm = calculateTermFromPayment(
              principal,
              annualRate,
              monthlyPayment,
              loanType,
              feeSetup,
              feeMonthly,
              insuranceMonthly
            );
            calculatedTerm = finalTerm;
          } else {
            return null;
          }
          break;

        case 'rate_term':
          // Have: rate + term → Calculate: payment (will be calculated from quick calc)
          if (annualRate > 0 && termMonths > 0) {
            calculatedPayment = 0; // Will be set below
            finalPayment = 0; // Not provided, will be calculated
          } else {
            return null;
          }
          break;

        default:
          return null;
      }

      // Use quick calculator (no schedule generation)
      const result = quickCalculateLoan(
        loanType,
        principal,
        finalRate,
        finalTerm,
        startDate,
        feeSetup,
        feeMonthly,
        insuranceMonthly,
        balloonAmount,
        finalPayment > 0 ? finalPayment : undefined
      );

      // Set calculated payment if needed
      if (calculatedPayment === 0) {
        calculatedPayment = result.firstPayment;
      }

      return {
        calculatedRate,
        calculatedPayment,
        calculatedTerm,
        effectiveRate: result.effectiveRate,
        totalInterest: result.totalInterest,
        totalFees: result.totalFees,
        totalPayment: result.totalPayment,
        firstPayment: result.firstPayment,
        lastPayment: result.lastPayment,
        endDate: result.endDate,
        isValid: true,
        error: null,
      };
    } catch (err) {
      return {
        calculatedRate: null,
        calculatedPayment: null,
        calculatedTerm: null,
        effectiveRate: 0,
        totalInterest: 0,
        totalFees: 0,
        totalPayment: 0,
        firstPayment: 0,
        lastPayment: 0,
        endDate: new Date(),
        isValid: false,
        error: err instanceof Error ? err.message : 'Chyba pri výpočte',
      };
    }
}

/**
 * Smart loan calculator (with full schedule generation)
 * Automatically calculates missing loan parameters based on what user provides
 * This is a pure function, wrap with useMemo in React components
 * Note: Use quickCalculateLoanData for mobile preview (much faster)
 */
export function calculateLoanData(input: LoanCalculatorInput): LoanCalculatorResult | null {
    const {
      loanType,
      principal,
      annualRate = 0,
      monthlyPayment = 0,
      termMonths = 0,
      startDate,
      feeSetup = 0,
      feeMonthly = 0,
      insuranceMonthly = 0,
      balloonAmount,
      calculationMode,
    } = input;

    // Validate minimum requirements
    if (!principal || principal <= 0) {
      return null;
    }

    try {
      let finalRate = annualRate;
      let finalTerm = termMonths;
      let calculatedRate: number | null = null;
      let calculatedTerm: number | null = null;
      let calculatedPayment: number | null = null;

      // Calculate missing parameter based on mode
      switch (calculationMode) {
        case 'payment_term':
          // Have: payment + term → Calculate: rate
          if (monthlyPayment > 0 && termMonths > 0) {
            finalRate = calculateRateFromPayment(
              principal,
              monthlyPayment,
              termMonths,
              loanType,
              feeSetup,
              feeMonthly,
              insuranceMonthly
            );
            calculatedRate = finalRate;
          } else {
            return null;
          }
          break;

        case 'rate_payment':
          // Have: rate + payment → Calculate: term
          if (annualRate > 0 && monthlyPayment > 0) {
            finalTerm = calculateTermFromPayment(
              principal,
              annualRate,
              monthlyPayment,
              loanType,
              feeSetup,
              feeMonthly,
              insuranceMonthly
            );
            calculatedTerm = finalTerm;
          } else {
            return null;
          }
          break;

        case 'rate_term':
          // Have: rate + term → Calculate: payment
          if (annualRate > 0 && termMonths > 0) {
            // Payment will be calculated from standard calculation
            // Mark it as calculated
            calculatedPayment = 0; // Will be set below
          } else {
            return null;
          }
          break;

        default:
          return null;
      }

      // Now run standard calculation
      const calculationInput: LoanCalculationInput = {
        loanType,
        principal,
        annualRate: finalRate,
        termMonths: finalTerm,
        startDate,
        dayCountConvention: '30E/360',
        feeSetup,
        feeMonthly,
        insuranceMonthly,
        balloonAmount:
          loanType === 'interest_only' && balloonAmount
            ? balloonAmount
            : undefined,
        fixedMonthlyPayment:
          loanType !== 'fixed_principal' && monthlyPayment > 0
            ? monthlyPayment
            : undefined,
        fixedPrincipalPayment:
          loanType === 'fixed_principal' && monthlyPayment > 0
            ? monthlyPayment / finalTerm * principal
            : undefined,
      };

      const result = calculateLoan(calculationInput);

      // Set calculated payment if needed
      if (calculatedPayment === 0) {
        calculatedPayment = result.schedule[0]?.totalDue ?? 0;
      }

      // Calculate end date
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + finalTerm);

      return {
        calculatedRate,
        calculatedPayment,
        calculatedTerm,
        effectiveRate: result.effectiveRate,
        totalInterest: result.totalInterest,
        totalFees: result.totalFees,
        totalPayment: result.totalPayment,
        firstPayment: result.schedule[0]?.totalDue ?? 0,
        lastPayment: result.schedule[result.schedule.length - 1]?.totalDue ?? 0,
        endDate,
        isValid: true,
        error: null,
      };
    } catch (err) {
      return {
        calculatedRate: null,
        calculatedPayment: null,
        calculatedTerm: null,
        effectiveRate: 0,
        totalInterest: 0,
        totalFees: 0,
        totalPayment: 0,
        firstPayment: 0,
        lastPayment: 0,
        endDate: new Date(),
        isValid: false,
        error: err instanceof Error ? err.message : 'Chyba pri výpočte',
      };
    }
}

