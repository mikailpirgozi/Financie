import { describe, expect, it } from 'vitest';
import { forecastCashflow } from '../cashflow';

describe('forecastCashflow', () => {
  it('projects opening balance with no items', () => {
    const result = forecastCashflow({
      startMonth: '2026-04',
      monthsCount: 3,
      openingBalance: 1000,
      loanInstallments: [],
      recurring: [],
    });
    expect(result.months).toHaveLength(3);
    expect(result.endBalance).toBe(1000);
    expect(result.lowestBalance).toBe(1000);
  });

  it('subtracts loan installments and adds recurring income', () => {
    const result = forecastCashflow({
      startMonth: '2026-04',
      monthsCount: 2,
      openingBalance: 0,
      loanInstallments: [
        { dueDate: '2026-04-15', totalDue: 500 },
        { dueDate: '2026-05-15', totalDue: 500 },
      ],
      recurring: [
        { kind: 'income', amount: 2000, frequency: 'monthly', startDate: '2026-04-01' },
        { kind: 'expense', amount: 1200, frequency: 'monthly', startDate: '2026-04-01' },
      ],
    });

    expect(result.months[0]).toMatchObject({
      month: '2026-04',
      income: 2000,
      expense: 1200,
      loanPayments: 500,
      net: 300,
      closingBalance: 300,
    });
    expect(result.months[1].closingBalance).toBe(600);
    expect(result.endBalance).toBe(600);
  });

  it('flags lowest balance month', () => {
    const result = forecastCashflow({
      startMonth: '2026-04',
      monthsCount: 3,
      openingBalance: 100,
      loanInstallments: [{ dueDate: '2026-05-10', totalDue: 1500 }],
      recurring: [{ kind: 'income', amount: 500, frequency: 'monthly', startDate: '2026-04-01' }],
    });
    expect(result.lowestBalanceMonth).toBe('2026-05');
    expect(result.lowestBalance).toBeLessThan(0);
  });

  it('respects end_date for recurring', () => {
    const result = forecastCashflow({
      startMonth: '2026-04',
      monthsCount: 4,
      openingBalance: 0,
      loanInstallments: [],
      recurring: [
        {
          kind: 'expense',
          amount: 100,
          frequency: 'monthly',
          startDate: '2026-04-01',
          endDate: '2026-05-15',
        },
      ],
    });
    expect(result.months[0].expense).toBe(100);
    expect(result.months[1].expense).toBe(100);
    expect(result.months[2].expense).toBe(0);
    expect(result.months[3].expense).toBe(0);
  });
});
