/**
 * Personal-finance insights derived from raw expense / income / loan data.
 *
 * Everything here is pure / deterministic — no I/O, no LLM calls. The output
 * is designed to be small and structured so it can be:
 *   - rendered directly in the UI as charts / lists, or
 *   - stuffed into an LLM prompt to generate a natural-language summary
 *     (see apps/web/src/app/api/insights/ai/route.ts).
 */

export interface InsightTransaction {
  id: string;
  amount: number; // positive = expense or income (sign is implied by `kind`)
  date: string; // YYYY-MM-DD
  category?: string | null;
  description?: string | null;
}

export interface InsightLoan {
  id: string;
  monthlyPayment: number;
  remainingBalance: number;
  interestRate: number; // annual %, 0..100
}

export interface InsightInput {
  /** Inclusive period start, ISO date (YYYY-MM-DD). */
  periodStart: string;
  /** Inclusive period end, ISO date (YYYY-MM-DD). */
  periodEnd: string;
  expenses: InsightTransaction[];
  incomes: InsightTransaction[];
  loans?: InsightLoan[];
  /** Same data for the previous comparable period (optional). */
  previousExpenses?: InsightTransaction[];
  previousIncomes?: InsightTransaction[];
}

export interface CategoryBreakdownItem {
  category: string;
  total: number;
  share: number; // 0..1
  count: number;
}

export interface MonthlySeriesPoint {
  month: string; // YYYY-MM
  expenses: number;
  incomes: number;
  net: number;
}

export interface AnomalyHint {
  category: string;
  current: number;
  previous: number;
  pctChange: number; // 0.42 = +42%
  reason: 'spike' | 'drop';
}

export interface FinancialInsights {
  periodStart: string;
  periodEnd: string;
  totals: {
    expenses: number;
    incomes: number;
    net: number;
    savingsRate: number; // 0..1; if income is 0 -> 0
  };
  categories: CategoryBreakdownItem[]; // sorted desc by total
  monthlySeries: MonthlySeriesPoint[];
  topExpenses: InsightTransaction[]; // up to 5
  anomalies: AnomalyHint[];
  loanLoad: {
    monthlyTotal: number;
    asShareOfIncome: number; // monthlyPayment sum / monthly income; 0 if no income
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function monthKey(dateIso: string): string {
  return dateIso.slice(0, 7);
}

function sumByCategory(
  rows: InsightTransaction[]
): Record<string, { total: number; count: number }> {
  const acc: Record<string, { total: number; count: number }> = {};
  for (const r of rows) {
    const key = (r.category ?? 'Nezaradené').trim() || 'Nezaradené';
    if (!acc[key]) acc[key] = { total: 0, count: 0 };
    acc[key].total += r.amount;
    acc[key].count += 1;
  }
  return acc;
}

function buildMonthlySeries(input: InsightInput): MonthlySeriesPoint[] {
  const months = new Map<string, MonthlySeriesPoint>();
  for (const e of input.expenses) {
    const m = monthKey(e.date);
    const cur = months.get(m) ?? { month: m, expenses: 0, incomes: 0, net: 0 };
    cur.expenses += e.amount;
    months.set(m, cur);
  }
  for (const i of input.incomes) {
    const m = monthKey(i.date);
    const cur = months.get(m) ?? { month: m, expenses: 0, incomes: 0, net: 0 };
    cur.incomes += i.amount;
    months.set(m, cur);
  }
  const sorted = Array.from(months.values()).sort((a, b) => a.month.localeCompare(b.month));
  for (const p of sorted) {
    p.expenses = round2(p.expenses);
    p.incomes = round2(p.incomes);
    p.net = round2(p.incomes - p.expenses);
  }
  return sorted;
}

function detectAnomalies(input: InsightInput): AnomalyHint[] {
  if (!input.previousExpenses || input.previousExpenses.length === 0) return [];
  const cur = sumByCategory(input.expenses);
  const prev = sumByCategory(input.previousExpenses);
  const hints: AnomalyHint[] = [];
  for (const [cat, { total }] of Object.entries(cur)) {
    const prevTotal = prev[cat]?.total ?? 0;
    if (prevTotal < 1 && total < 50) continue; // ignore noise
    const pct = prevTotal === 0 ? 1 : (total - prevTotal) / prevTotal;
    if (Math.abs(pct) >= 0.5) {
      hints.push({
        category: cat,
        current: round2(total),
        previous: round2(prevTotal),
        pctChange: round2(pct),
        reason: pct > 0 ? 'spike' : 'drop',
      });
    }
  }
  hints.sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));
  return hints.slice(0, 5);
}

export function computeInsights(input: InsightInput): FinancialInsights {
  const expensesTotal = input.expenses.reduce((acc, x) => acc + x.amount, 0);
  const incomesTotal = input.incomes.reduce((acc, x) => acc + x.amount, 0);
  const net = incomesTotal - expensesTotal;
  const savingsRate = incomesTotal > 0 ? Math.max(0, net / incomesTotal) : 0;

  const catMap = sumByCategory(input.expenses);
  const categories: CategoryBreakdownItem[] = Object.entries(catMap)
    .map(([category, { total, count }]) => ({
      category,
      total: round2(total),
      share: expensesTotal > 0 ? round2(total / expensesTotal) : 0,
      count,
    }))
    .sort((a, b) => b.total - a.total);

  const topExpenses = [...input.expenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((e) => ({ ...e, amount: round2(e.amount) }));

  const monthlyTotal = (input.loans ?? []).reduce((acc, l) => acc + l.monthlyPayment, 0);
  // Approximate average monthly income across the analysed period.
  const months = buildMonthlySeries(input);
  const avgMonthlyIncome =
    months.length > 0 ? months.reduce((acc, m) => acc + m.incomes, 0) / months.length : 0;

  return {
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    totals: {
      expenses: round2(expensesTotal),
      incomes: round2(incomesTotal),
      net: round2(net),
      savingsRate: round2(savingsRate),
    },
    categories,
    monthlySeries: months,
    topExpenses,
    anomalies: detectAnomalies(input),
    loanLoad: {
      monthlyTotal: round2(monthlyTotal),
      asShareOfIncome: avgMonthlyIncome > 0 ? round2(monthlyTotal / avgMonthlyIncome) : 0,
    },
  };
}

/**
 * Compact JSON-like prompt context for an LLM. Keep it small to control cost.
 * The model is instructed to return Slovak natural-language tips/observations.
 */
export function buildInsightsPrompt(insights: FinancialInsights): string {
  const top3 = insights.categories
    .slice(0, 3)
    .map((c) => `${c.category}: €${c.total} (${Math.round(c.share * 100)}%)`)
    .join(', ');
  const anomalies = insights.anomalies
    .map((a) => `${a.category} ${a.reason === 'spike' ? '+' : ''}${Math.round(a.pctChange * 100)}%`)
    .join(', ');
  return [
    `Obdobie: ${insights.periodStart} až ${insights.periodEnd}`,
    `Príjmy: €${insights.totals.incomes}, výdaje: €${insights.totals.expenses}, čistý tok: €${insights.totals.net}`,
    `Miera úspor: ${Math.round(insights.totals.savingsRate * 100)}%`,
    `Top 3 výdavkové kategórie: ${top3 || 'n/a'}`,
    insights.anomalies.length > 0 ? `Neobvyklé zmeny: ${anomalies}` : 'Bez neobvyklých zmien.',
    `Mesačné splátky úverov: €${insights.loanLoad.monthlyTotal} (${Math.round(insights.loanLoad.asShareOfIncome * 100)}% z príjmu)`,
  ].join('\n');
}
