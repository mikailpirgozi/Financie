import { describe, expect, it } from 'vitest';
import { convertAmount, formatMoney, roundCurrency } from '../index';

describe('convertAmount', () => {
  const rates = new Map<string, number>([
    ['USD->EUR', 0.92],
    ['EUR->CZK', 25.4],
  ]);

  it('returns same amount for same currency', () => {
    expect(convertAmount(100, 'EUR', 'EUR', rates)).toBe(100);
  });

  it('uses direct rate', () => {
    expect(convertAmount(100, 'USD', 'EUR', rates)).toBe(92);
  });

  it('falls back to inverse rate', () => {
    expect(convertAmount(100, 'CZK', 'EUR', rates)).toBeCloseTo(3.94, 2);
  });

  it('throws when no rate available', () => {
    expect(() => convertAmount(100, 'JPY', 'EUR', rates)).toThrow(/No FX rate/);
  });
});

describe('roundCurrency', () => {
  it('rounds to 2 decimals', () => {
    expect(roundCurrency(1.234)).toBe(1.23);
    expect(roundCurrency(1.235)).toBe(1.24);
  });
});

describe('formatMoney', () => {
  it('formats EUR with sk-SK locale', () => {
    const out = formatMoney(1234.5, 'EUR', 'sk-SK');
    expect(out).toMatch(/1\s?234,50/);
  });
});
