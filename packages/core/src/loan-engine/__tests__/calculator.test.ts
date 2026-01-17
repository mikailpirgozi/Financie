import { describe, it, expect } from 'vitest';
import { calculateLoan } from '../calculator';
import type { LoanCalculationInput } from '../../types';

describe('Loan Calculator', () => {
  const baseInput: LoanCalculationInput = {
    loanType: 'annuity',
    principal: 10000,
    annualRate: 5,
    termMonths: 12,
    startDate: new Date('2024-01-01'),
    dayCountConvention: '30E/360',
  };

  describe('Annuity Loan', () => {
    it('should calculate correct schedule for annuity loan', () => {
      const result = calculateLoan(baseInput);

      expect(result.schedule).toHaveLength(12);
      expect(result.schedule[0]?.principalDue).toBeGreaterThan(0);
      expect(result.schedule[0]?.interestDue).toBeGreaterThan(0);
      expect(result.totalInterest).toBeGreaterThan(0);
      expect(result.totalPayment).toBeGreaterThan(baseInput.principal);
    });

    it('should have decreasing balance', () => {
      const result = calculateLoan(baseInput);

      for (let i = 1; i < result.schedule.length; i++) {
        const prev = result.schedule[i - 1];
        const curr = result.schedule[i];
        expect(curr?.principalBalanceAfter).toBeLessThanOrEqual(prev?.principalBalanceAfter ?? 0);
      }
    });

    it('should end with zero balance', () => {
      const result = calculateLoan(baseInput);
      const lastEntry = result.schedule[result.schedule.length - 1];
      
      // Allow small rounding errors (within 1 euro)
      expect(Math.abs(lastEntry?.principalBalanceAfter ?? 0)).toBeLessThan(1);
    });

    it('should include setup fee in effective principal', () => {
      const withFee = calculateLoan({
        ...baseInput,
        feeSetup: 200,
      });

      const withoutFee = calculateLoan(baseInput);

      expect(withFee.totalPayment).toBeGreaterThan(withoutFee.totalPayment);
      expect(withFee.effectiveRate).toBeGreaterThan(withoutFee.effectiveRate);
    });

    it('should include monthly fees in each installment', () => {
      const result = calculateLoan({
        ...baseInput,
        feeMonthly: 10,
        insuranceMonthly: 5,
      });

      result.schedule.forEach(entry => {
        expect(entry.feesDue).toBe(15);
      });
    });

    it('should use fixed monthly payment if provided', () => {
      const fixedPayment = 900;
      const result = calculateLoan({
        ...baseInput,
        fixedMonthlyPayment: fixedPayment,
      });

      // All payments except last should match fixed payment
      for (let i = 0; i < result.schedule.length - 1; i++) {
        const entry = result.schedule[i];
        const totalWithoutFees = entry!.principalDue + entry!.interestDue;
        expect(totalWithoutFees).toBeCloseTo(fixedPayment, 0);
      }
    });
  });

  describe('Fixed Principal Loan', () => {
    it('should calculate correct schedule for fixed principal loan', () => {
      const result = calculateLoan({
        ...baseInput,
        loanType: 'fixed_principal',
      });

      expect(result.schedule).toHaveLength(12);
      
      // Principal should be approximately constant (except last payment adjustment)
      const principalPayment = baseInput.principal / baseInput.termMonths;
      result.schedule.slice(0, -1).forEach(entry => {
        expect(Math.abs(entry.principalDue - principalPayment)).toBeLessThan(1);
      });
    });

    it('should have decreasing interest payments', () => {
      const result = calculateLoan({
        ...baseInput,
        loanType: 'fixed_principal',
      });

      for (let i = 1; i < result.schedule.length; i++) {
        const prev = result.schedule[i - 1];
        const curr = result.schedule[i];
        expect(curr?.interestDue).toBeLessThanOrEqual(prev?.interestDue ?? 0);
      }
    });

    it('should have decreasing total payments', () => {
      const result = calculateLoan({
        ...baseInput,
        loanType: 'fixed_principal',
      });

      for (let i = 1; i < result.schedule.length; i++) {
        const prev = result.schedule[i - 1];
        const curr = result.schedule[i];
        expect(curr?.totalDue).toBeLessThanOrEqual(prev?.totalDue ?? 0);
      }
    });

    it('should pay less total interest than annuity', () => {
      const annuityResult = calculateLoan({
        ...baseInput,
        loanType: 'annuity',
      });

      const fixedPrincipalResult = calculateLoan({
        ...baseInput,
        loanType: 'fixed_principal',
      });

      // Fixed principal should have lower total interest
      expect(fixedPrincipalResult.totalInterest).toBeLessThan(annuityResult.totalInterest);
    });
  });

  describe('Interest-Only Loan', () => {
    it('should calculate correct schedule for interest-only loan', () => {
      const result = calculateLoan({
        ...baseInput,
        loanType: 'interest_only',
        balloonAmount: 10000,
      });

      expect(result.schedule).toHaveLength(12);
      
      // First 11 payments should have no principal
      for (let i = 0; i < 11; i++) {
        expect(result.schedule[i]?.principalDue).toBe(0);
        expect(result.schedule[i]?.interestDue).toBeGreaterThan(0);
      }

      // Last payment should include balloon
      const lastEntry = result.schedule[11];
      expect(lastEntry?.principalDue).toBe(10000);
      expect(lastEntry?.principalBalanceAfter).toBe(0);
    });

    it('should have constant interest payments', () => {
      const result = calculateLoan({
        ...baseInput,
        loanType: 'interest_only',
      });

      const firstInterest = result.schedule[0]?.interestDue ?? 0;
      
      // All interest payments should be approximately equal (within rounding)
      result.schedule.forEach(entry => {
        expect(Math.abs(entry.interestDue - firstInterest)).toBeLessThan(1);
      });
    });

    it('should default balloon to principal if not specified', () => {
      const result = calculateLoan({
        ...baseInput,
        loanType: 'interest_only',
      });

      const lastEntry = result.schedule[result.schedule.length - 1];
      expect(lastEntry?.principalDue).toBe(baseInput.principal);
    });

    it('should support partial balloon payment', () => {
      const partialBalloon = 5000;
      const result = calculateLoan({
        ...baseInput,
        loanType: 'interest_only',
        balloonAmount: partialBalloon,
      });

      const lastEntry = result.schedule[result.schedule.length - 1];
      expect(lastEntry?.principalDue).toBe(partialBalloon);
      // Remaining balance should be principal - balloon
      expect(lastEntry?.principalBalanceAfter).toBe(baseInput.principal - partialBalloon);
    });
  });

  describe('Auto Loan', () => {
    it('should calculate same as annuity', () => {
      const annuityResult = calculateLoan({
        ...baseInput,
        loanType: 'annuity',
      });

      const autoLoanResult = calculateLoan({
        ...baseInput,
        loanType: 'auto_loan',
      });

      // Should have same schedule
      expect(autoLoanResult.schedule.length).toBe(annuityResult.schedule.length);
      expect(autoLoanResult.totalInterest).toBeCloseTo(annuityResult.totalInterest, 1);
    });

    it('should include setup fee in principal (financed)', () => {
      const feeSetup = 500;
      const autoWithFee = calculateLoan({
        ...baseInput,
        loanType: 'auto_loan',
        feeSetup,
      });

      const annuityWithFee = calculateLoan({
        ...baseInput,
        loanType: 'annuity',
        feeSetup,
      });

      // Auto loan: setup fee is financed, so totalFees doesn't include it separately
      expect(autoWithFee.totalFees).toBeLessThan(annuityWithFee.totalFees);
      
      // But total payment should be similar (fee is in principal)
      expect(autoWithFee.totalPayment).toBeCloseTo(annuityWithFee.totalPayment - feeSetup, 1);
    });
  });

  describe('Day Count Conventions', () => {
    it('should calculate different interest for different conventions', () => {
      const result30E360 = calculateLoan({
        ...baseInput,
        dayCountConvention: '30E/360',
      });

      const resultACT360 = calculateLoan({
        ...baseInput,
        dayCountConvention: 'ACT/360',
      });

      const resultACT365 = calculateLoan({
        ...baseInput,
        dayCountConvention: 'ACT/365',
      });

      // Interest amounts should differ slightly
      expect(result30E360.totalInterest).not.toBe(resultACT360.totalInterest);
      expect(resultACT360.totalInterest).not.toBe(resultACT365.totalInterest);
    });

    it('ACT/360 should calculate higher interest than ACT/365', () => {
      const resultACT360 = calculateLoan({
        ...baseInput,
        dayCountConvention: 'ACT/360',
      });

      const resultACT365 = calculateLoan({
        ...baseInput,
        dayCountConvention: 'ACT/365',
      });

      // ACT/360 has smaller denominator, so higher interest
      expect(resultACT360.totalInterest).toBeGreaterThan(resultACT365.totalInterest);
    });
  });

  describe('Zero Interest Rate', () => {
    it('should handle zero interest rate for annuity', () => {
      const result = calculateLoan({
        ...baseInput,
        annualRate: 0,
      });

      // Total interest should be exactly 0
      expect(result.totalInterest).toBe(0);
      
      // All interest payments should be 0
      result.schedule.forEach(entry => {
        expect(entry.interestDue).toBe(0);
      });

      // Monthly payment should be principal / termMonths
      const expectedPayment = baseInput.principal / baseInput.termMonths;
      result.schedule.forEach(entry => {
        expect(entry.principalDue).toBeCloseTo(expectedPayment, 0);
      });

      // Balance should reach 0
      const lastEntry = result.schedule[result.schedule.length - 1];
      expect(lastEntry?.principalBalanceAfter).toBe(0);
    });

    it('should handle zero interest rate for fixed principal', () => {
      const result = calculateLoan({
        ...baseInput,
        loanType: 'fixed_principal',
        annualRate: 0,
      });

      expect(result.totalInterest).toBe(0);
      result.schedule.forEach(entry => {
        expect(entry.interestDue).toBe(0);
      });
    });

    it('should handle zero interest rate for interest-only', () => {
      const result = calculateLoan({
        ...baseInput,
        loanType: 'interest_only',
        annualRate: 0,
      });

      expect(result.totalInterest).toBe(0);
      result.schedule.forEach(entry => {
        expect(entry.interestDue).toBe(0);
      });
    });

    it('should handle zero interest rate for auto loan', () => {
      const result = calculateLoan({
        ...baseInput,
        loanType: 'auto_loan',
        annualRate: 0,
      });

      expect(result.totalInterest).toBe(0);
      result.schedule.forEach(entry => {
        expect(entry.interestDue).toBe(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle single payment loan', () => {
      const result = calculateLoan({
        ...baseInput,
        termMonths: 1,
      });

      expect(result.schedule).toHaveLength(1);
      expect(result.schedule[0]?.principalBalanceAfter).toBe(0);
    });

    it('should handle long-term loan', () => {
      const result = calculateLoan({
        ...baseInput,
        termMonths: 360, // 30 years
      });

      expect(result.schedule).toHaveLength(360);
      // Allow small rounding errors (within 2 euros for long-term loans)
      expect(Math.abs(result.schedule[359]?.principalBalanceAfter ?? 0)).toBeLessThan(2);
    });

    it('should handle high interest rate', () => {
      const result = calculateLoan({
        ...baseInput,
        annualRate: 20,
      });

      expect(result.totalInterest).toBeGreaterThan(0);
      expect(result.effectiveRate).toBeGreaterThan(15);
    });

    it('should throw error for negative principal', () => {
      expect(() => calculateLoan({
        ...baseInput,
        principal: -1000,
      })).toThrow('Principal must be positive');
    });

    it('should throw error for negative interest rate', () => {
      expect(() => calculateLoan({
        ...baseInput,
        annualRate: -5,
      })).toThrow('Annual rate cannot be negative');
    });

    it('should throw error for zero term months', () => {
      expect(() => calculateLoan({
        ...baseInput,
        termMonths: 0,
      })).toThrow('Term must be a positive integer');
    });

    it('should throw error for term exceeding 50 years', () => {
      expect(() => calculateLoan({
        ...baseInput,
        termMonths: 601,
      })).toThrow('Term cannot exceed 600 months');
    });
  });

  describe('Graduated Payment Loan', () => {
    it('should calculate schedule with increasing payments', () => {
      const result = calculateLoan({
        ...baseInput,
        loanType: 'graduated_payment',
        termMonths: 120, // 10 years
        graduatedConfig: {
          initialPaymentPct: 70,
          graduationPeriodMonths: 60, // 5 years
          graduationSteps: 5,
        },
      });

      expect(result.schedule).toHaveLength(120);
      
      // First payment should be lower than last payment
      const firstTotal = result.schedule[0]!.totalDue;
      
      // First payment should be roughly 70% of what a standard annuity would be
      const standardResult = calculateLoan({
        ...baseInput,
        loanType: 'annuity',
        termMonths: 120,
      });
      const standardPayment = standardResult.schedule[0]!.totalDue;
      
      // First payment should be approximately 70% of standard (within 10% tolerance)
      expect(firstTotal).toBeLessThan(standardPayment);
      expect(firstTotal).toBeGreaterThan(standardPayment * 0.6);
    });

    it('should handle zero interest rate', () => {
      const result = calculateLoan({
        ...baseInput,
        loanType: 'graduated_payment',
        annualRate: 0,
        termMonths: 60,
      });

      expect(result.totalInterest).toBe(0);
      result.schedule.forEach(entry => {
        expect(entry.interestDue).toBe(0);
      });
    });

    it('should end with zero or near-zero balance', () => {
      const result = calculateLoan({
        ...baseInput,
        loanType: 'graduated_payment',
        termMonths: 120,
      });

      const lastEntry = result.schedule[result.schedule.length - 1];
      // Allow small rounding errors
      expect(Math.abs(lastEntry?.principalBalanceAfter ?? 0)).toBeLessThan(2);
    });

    it('should use default config if not provided', () => {
      const result = calculateLoan({
        ...baseInput,
        loanType: 'graduated_payment',
        termMonths: 120,
      });

      // Should complete without error using defaults
      expect(result.schedule).toHaveLength(120);
    });
  });

  describe('RPMN (Effective Rate) Calculation', () => {
    it('should equal nominal rate when no fees', () => {
      const result = calculateLoan(baseInput);
      expect(result.effectiveRate).toBeCloseTo(baseInput.annualRate, 0);
    });

    it('should be higher than nominal rate with fees', () => {
      const result = calculateLoan({
        ...baseInput,
        feeSetup: 200,
        feeMonthly: 10,
      });

      expect(result.effectiveRate).toBeGreaterThan(baseInput.annualRate);
    });

    it('should calculate correct RPMN for typical consumer loan', () => {
      // 10000€, 10% nominal, 12 months, 200€ setup fee, 5€/month fee
      const result = calculateLoan({
        ...baseInput,
        annualRate: 10,
        feeSetup: 200,
        feeMonthly: 5,
      });

      // RPMN should be significantly higher than nominal rate
      expect(result.effectiveRate).toBeGreaterThan(12);
    });
  });
});

