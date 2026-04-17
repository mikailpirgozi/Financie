import { describe, expect, it } from 'vitest';
import { computeInsights, buildInsightsPrompt } from '../index';

describe('computeInsights', () => {
  const baseInput = {
    periodStart: '2026-03-01',
    periodEnd: '2026-04-30',
    expenses: [
      { id: '1', amount: 600, date: '2026-03-05', category: 'Potraviny' },
      { id: '2', amount: 200, date: '2026-03-10', category: 'Doprava' },
      { id: '3', amount: 800, date: '2026-04-02', category: 'Potraviny' },
      { id: '4', amount: 50, date: '2026-04-15', category: null },
    ],
    incomes: [
      { id: 'i1', amount: 2000, date: '2026-03-01', category: 'Mzda' },
      { id: 'i2', amount: 2000, date: '2026-04-01', category: 'Mzda' },
    ],
    loans: [{ id: 'l1', monthlyPayment: 400, remainingBalance: 8000, interestRate: 5 }],
    previousExpenses: [
      { id: 'p1', amount: 200, date: '2026-01-05', category: 'Potraviny' },
      { id: 'p2', amount: 300, date: '2026-02-05', category: 'Potraviny' },
    ],
  };

  it('totals expenses and incomes', () => {
    const r = computeInsights(baseInput);
    expect(r.totals.expenses).toBe(1650);
    expect(r.totals.incomes).toBe(4000);
    expect(r.totals.net).toBe(2350);
    expect(r.totals.savingsRate).toBeGreaterThan(0.5);
  });

  it('produces category breakdown sorted by total', () => {
    const r = computeInsights(baseInput);
    expect(r.categories[0].category).toBe('Potraviny');
    expect(r.categories[0].total).toBe(1400);
    expect(r.categories.find((c) => c.category === 'Nezaradené')).toBeTruthy();
  });

  it('detects category spikes', () => {
    const r = computeInsights(baseInput);
    expect(r.anomalies.some((a) => a.category === 'Potraviny' && a.reason === 'spike')).toBe(true);
  });

  it('computes loan load relative to income', () => {
    const r = computeInsights(baseInput);
    expect(r.loanLoad.monthlyTotal).toBe(400);
    expect(r.loanLoad.asShareOfIncome).toBeCloseTo(0.2, 2);
  });

  it('builds a compact prompt', () => {
    const r = computeInsights(baseInput);
    const prompt = buildInsightsPrompt(r);
    expect(prompt).toContain('Obdobie');
    expect(prompt).toContain('Potraviny');
    expect(prompt).toContain('Mesačné splátky');
  });
});
