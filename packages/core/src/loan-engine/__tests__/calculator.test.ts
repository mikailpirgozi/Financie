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
      
      expect(lastEntry?.principalBalanceAfter).toBe(0);
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
  });

  describe('Fixed Principal Loan', () => {
    it('should calculate correct schedule for fixed principal loan', () => {
      const result = calculateLoan({
        ...baseInput,
        loanType: 'fixed_principal',
      });

      expect(result.schedule).toHaveLength(12);
      
      // Principal should be constant
      const principalPayment = baseInput.principal / baseInput.termMonths;
      result.schedule.forEach(entry => {
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
      result.schedule.slice(0, -1).forEach(entry => {
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
      expect(result.schedule[359]?.principalBalanceAfter).toBe(0);
    });

    it('should handle high interest rate', () => {
      const result = calculateLoan({
        ...baseInput,
        annualRate: 20,
      });

      expect(result.totalInterest).toBeGreaterThan(baseInput.principal);
      expect(result.effectiveRate).toBeGreaterThan(20);
    });

    it('should handle zero interest rate', () => {
      const result = calculateLoan({
        ...baseInput,
        annualRate: 0,
      });

      expect(result.totalInterest).toBe(0);
      result.schedule.forEach(entry => {
        expect(entry.interestDue).toBe(0);
      });
    });
  });
});

