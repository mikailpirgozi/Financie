import { describe, it, expect } from 'vitest';
import { 
  processPayment, 
  calculateEarlyRepaymentPenalty, 
  processEarlyRepayment,
  splitPayment 
} from '../payment-processor';
import type { LoanScheduleEntry } from '../../types';

describe('Payment Processor', () => {
  const mockSchedule: LoanScheduleEntry[] = [
    {
      installmentNo: 1,
      dueDate: new Date('2024-02-01'),
      principalDue: 800,
      interestDue: 50,
      feesDue: 10,
      totalDue: 860,
      principalBalanceAfter: 9200,
      status: 'pending',
    },
    {
      installmentNo: 2,
      dueDate: new Date('2024-03-01'),
      principalDue: 810,
      interestDue: 45,
      feesDue: 10,
      totalDue: 865,
      principalBalanceAfter: 8390,
      status: 'pending',
    },
  ];

  describe('processPayment', () => {
    it('should mark installment as paid when full amount is paid', () => {
      const result = processPayment(mockSchedule, 860, new Date('2024-02-01'));

      expect(result.updatedSchedule[0]?.status).toBe('paid');
      expect(result.appliedAmount).toBe(860);
      expect(result.remainingAmount).toBe(0);
    });

    it('should handle overpayment', () => {
      const result = processPayment(mockSchedule, 1000, new Date('2024-02-01'));

      expect(result.updatedSchedule[0]?.status).toBe('paid');
      expect(result.appliedAmount).toBe(860);
      expect(result.remainingAmount).toBe(140);
    });

    it('should not mark as paid for partial payment', () => {
      const result = processPayment(mockSchedule, 500, new Date('2024-02-01'));

      expect(result.updatedSchedule[0]?.status).toBe('pending');
      expect(result.appliedAmount).toBe(0);
      expect(result.remainingAmount).toBe(500);
    });

    it('should handle payment when all installments are paid', () => {
      const paidSchedule = mockSchedule.map(entry => ({
        ...entry,
        status: 'paid' as const,
      }));

      const result = processPayment(paidSchedule, 1000, new Date('2024-04-01'));

      expect(result.appliedAmount).toBe(0);
      expect(result.remainingAmount).toBe(1000);
    });
  });

  describe('calculateEarlyRepaymentPenalty', () => {
    it('should calculate correct penalty', () => {
      const penalty = calculateEarlyRepaymentPenalty(10000, 2);
      expect(penalty).toBe(200);
    });

    it('should handle zero penalty', () => {
      const penalty = calculateEarlyRepaymentPenalty(10000, 0);
      expect(penalty).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      const penalty = calculateEarlyRepaymentPenalty(10000, 2.555);
      expect(penalty).toBe(255.5);
    });
  });

  describe('processEarlyRepayment', () => {
    it('should calculate new balance after early repayment', () => {
      const result = processEarlyRepayment(10000, 3000, 2);

      expect(result.newBalance).toBe(7000);
      expect(result.penalty).toBe(60);
      expect(result.appliedToPrincipal).toBe(3000);
    });

    it('should handle full repayment', () => {
      const result = processEarlyRepayment(10000, 10000, 2);

      expect(result.newBalance).toBe(0);
      expect(result.penalty).toBe(200);
      expect(result.appliedToPrincipal).toBe(10000);
    });

    it('should handle zero penalty', () => {
      const result = processEarlyRepayment(10000, 5000, 0);

      expect(result.newBalance).toBe(5000);
      expect(result.penalty).toBe(0);
      expect(result.appliedToPrincipal).toBe(5000);
    });

    it('should not allow negative balance', () => {
      const result = processEarlyRepayment(5000, 10000, 0);

      expect(result.newBalance).toBe(0);
    });
  });

  describe('splitPayment', () => {
    it('should correctly split payment components', () => {
      const installment = mockSchedule[0];
      if (!installment) throw new Error('No installment');

      const split = splitPayment(installment);

      expect(split.principal).toBe(800);
      expect(split.interest).toBe(50);
      expect(split.fees).toBe(10);
    });
  });
});

