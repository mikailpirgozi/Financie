/**
 * Cash flow forecast (12 months ahead by default).
 *
 * Pure, deterministic, side-effect-free. Produces month-by-month projection
 * combining:
 *
 *   - scheduled loan installments (principal + interest + fees)
 *   - active recurring expenses & incomes (materialized into months)
 *   - optional one-off planned items (custom adjustments)
 *
 * Consumers (web/mobile) supply already-fetched data slices; this module
 * never talks to the database.
 */

export type ForecastFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface ForecastLoanInstallment {
  /** ISO date of due date. */
  dueDate: string;
  totalDue: number;
}

export interface ForecastRecurringItem {
  kind: 'expense' | 'income';
  amount: number;
  frequency: ForecastFrequency;
  /** ISO date when the recurring template starts (or its `next_run_date`). */
  startDate: string;
  /** Optional ISO date when it ends. */
  endDate?: string | null;
}

export interface ForecastOneOff {
  kind: 'expense' | 'income';
  /** ISO date. */
  date: string;
  amount: number;
}

export interface ForecastInput {
  /** Inclusive month from which to start. Format `YYYY-MM`. */
  startMonth: string;
  /** Number of months to project. Default 12. */
  monthsCount?: number;
  /** Opening balance (cash on hand) at the beginning of `startMonth`. */
  openingBalance: number;
  loanInstallments: ForecastLoanInstallment[];
  recurring: ForecastRecurringItem[];
  oneOffs?: ForecastOneOff[];
}

export interface ForecastMonth {
  /** `YYYY-MM`. */
  month: string;
  income: number;
  expense: number;
  loanPayments: number;
  net: number;
  /** End-of-month projected balance. */
  closingBalance: number;
}

export interface ForecastResult {
  months: ForecastMonth[];
  /** `closingBalance` of the last month. */
  endBalance: number;
  /** Lowest closing balance encountered (useful for liquidity warnings). */
  lowestBalance: number;
  /** Month at which `lowestBalance` happens. */
  lowestBalanceMonth: string;
}

const DEFAULT_HORIZON = 12;

function monthKey(year: number, month0: number): string {
  return `${year}-${String(month0 + 1).padStart(2, '0')}`;
}

function parseMonth(key: string): { year: number; month0: number } {
  const [y, m] = key.split('-').map(Number);
  return { year: y, month0: m - 1 };
}

function addMonths(key: string, delta: number): string {
  const { year, month0 } = parseMonth(key);
  const total = year * 12 + month0 + delta;
  return monthKey(Math.floor(total / 12), ((total % 12) + 12) % 12);
}

function isoToMonth(iso: string): string {
  return iso.slice(0, 7);
}

function isoToDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

/**
 * Expand a recurring item into the count of occurrences that fall inside a
 * given month. We deliberately approximate: e.g. a `weekly` template that
 * starts mid-month yields ~4-5 hits per month based on calendar weeks.
 */
function occurrencesInMonth(item: ForecastRecurringItem, month: string): number {
  const { year, month0 } = parseMonth(month);
  const monthStart = new Date(Date.UTC(year, month0, 1));
  const monthEnd = new Date(Date.UTC(year, month0 + 1, 0));
  const start = isoToDate(item.startDate);
  const end = item.endDate ? isoToDate(item.endDate) : null;

  if (start > monthEnd) return 0;
  if (end && end < monthStart) return 0;

  const effectiveStart = start > monthStart ? start : monthStart;
  const effectiveEnd = end && end < monthEnd ? end : monthEnd;
  if (effectiveStart > effectiveEnd) return 0;

  switch (item.frequency) {
    case 'daily': {
      const diff = (effectiveEnd.getTime() - effectiveStart.getTime()) / 86_400_000;
      return Math.floor(diff) + 1;
    }
    case 'weekly': {
      const diff = (effectiveEnd.getTime() - effectiveStart.getTime()) / 86_400_000;
      return Math.floor(diff / 7) + 1;
    }
    case 'monthly':
      return 1;
    case 'quarterly': {
      const monthsSinceStart =
        (year - start.getUTCFullYear()) * 12 + (month0 - start.getUTCMonth());
      return monthsSinceStart >= 0 && monthsSinceStart % 3 === 0 ? 1 : 0;
    }
    case 'yearly':
      return month0 === start.getUTCMonth() && year >= start.getUTCFullYear() ? 1 : 0;
    default:
      return 0;
  }
}

export function forecastCashflow(input: ForecastInput): ForecastResult {
  const horizon = input.monthsCount ?? DEFAULT_HORIZON;
  const months: ForecastMonth[] = [];

  let runningBalance = input.openingBalance;
  let lowest = runningBalance;
  let lowestMonth = input.startMonth;

  const loansByMonth = new Map<string, number>();
  for (const inst of input.loanInstallments) {
    const key = isoToMonth(inst.dueDate);
    loansByMonth.set(key, (loansByMonth.get(key) ?? 0) + inst.totalDue);
  }

  const oneOffsByMonth = new Map<string, { income: number; expense: number }>();
  for (const off of input.oneOffs ?? []) {
    const key = isoToMonth(off.date);
    const bucket = oneOffsByMonth.get(key) ?? { income: 0, expense: 0 };
    if (off.kind === 'income') bucket.income += off.amount;
    else bucket.expense += off.amount;
    oneOffsByMonth.set(key, bucket);
  }

  for (let i = 0; i < horizon; i += 1) {
    const month = addMonths(input.startMonth, i);

    let income = 0;
    let expense = 0;

    for (const item of input.recurring) {
      const occ = occurrencesInMonth(item, month);
      if (occ === 0) continue;
      const sum = item.amount * occ;
      if (item.kind === 'income') income += sum;
      else expense += sum;
    }

    const oneOff = oneOffsByMonth.get(month);
    if (oneOff) {
      income += oneOff.income;
      expense += oneOff.expense;
    }

    const loanPayments = loansByMonth.get(month) ?? 0;
    const net = income - expense - loanPayments;
    runningBalance += net;

    if (runningBalance < lowest) {
      lowest = runningBalance;
      lowestMonth = month;
    }

    months.push({
      month,
      income: round2(income),
      expense: round2(expense),
      loanPayments: round2(loanPayments),
      net: round2(net),
      closingBalance: round2(runningBalance),
    });
  }

  return {
    months,
    endBalance: round2(runningBalance),
    lowestBalance: round2(lowest),
    lowestBalanceMonth: lowestMonth,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
