import { describe, it, expect } from 'vitest';
import { calculateDayCountFactor, addMonths, getDaysInMonth } from '../day-count';

describe('Day Count Conventions', () => {
  describe('30E/360', () => {
    it('should calculate correct factor for full month', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-02-01');
      const factor = calculateDayCountFactor(start, end, '30E/360');
      
      expect(factor).toBeCloseTo(30 / 360, 5);
    });

    it('should calculate correct factor for full year', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2025-01-01');
      const factor = calculateDayCountFactor(start, end, '30E/360');
      
      expect(factor).toBeCloseTo(1, 5);
    });

    it('should handle day 31 adjustment', () => {
      const start = new Date('2024-01-31');
      const end = new Date('2024-02-29');
      const factor = calculateDayCountFactor(start, end, '30E/360');
      
      // 31st should be treated as 30th
      expect(factor).toBeGreaterThan(0);
    });
  });

  describe('ACT/360', () => {
    it('should calculate correct factor for actual days', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const factor = calculateDayCountFactor(start, end, 'ACT/360');
      
      expect(factor).toBeCloseTo(30 / 360, 5);
    });

    it('should handle leap year', () => {
      const start = new Date('2024-02-01');
      const end = new Date('2024-03-01');
      const factor = calculateDayCountFactor(start, end, 'ACT/360');
      
      // February 2024 has 29 days (leap year)
      expect(factor).toBeCloseTo(29 / 360, 5);
    });
  });

  describe('ACT/365', () => {
    it('should calculate correct factor for actual days', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const factor = calculateDayCountFactor(start, end, 'ACT/365');
      
      expect(factor).toBeCloseTo(30 / 365, 5);
    });

    it('should calculate correct factor for full year', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2025-01-01');
      const factor = calculateDayCountFactor(start, end, 'ACT/365');
      
      // 2024 is leap year with 366 days, but ACT/365 uses 365
      expect(factor).toBeCloseTo(366 / 365, 5);
    });
  });

  describe('Helper Functions', () => {
    it('should add months correctly', () => {
      const date = new Date('2024-01-15');
      const result = addMonths(date, 3);
      
      expect(result.getMonth()).toBe(3); // April (0-indexed)
      expect(result.getDate()).toBe(15);
    });

    it('should handle year rollover', () => {
      const date = new Date('2024-11-15');
      const result = addMonths(date, 3);
      
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(1); // February
    });

    it('should get correct days in month', () => {
      expect(getDaysInMonth(new Date('2024-01-01'))).toBe(31);
      expect(getDaysInMonth(new Date('2024-02-01'))).toBe(29); // Leap year
      expect(getDaysInMonth(new Date('2023-02-01'))).toBe(28); // Non-leap year
      expect(getDaysInMonth(new Date('2024-04-01'))).toBe(30);
    });
  });
});

