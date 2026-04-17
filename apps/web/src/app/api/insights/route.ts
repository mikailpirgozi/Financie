import { type NextRequest, NextResponse } from 'next/server';
import {
  computeInsights,
  type InsightInput,
  type InsightTransaction,
  type InsightLoan,
} from '@finapp/core';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function defaultPeriod(): { start: string; end: string; prevStart: string; prevEnd: string } {
  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 2, 1));
  const prevEnd = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 0));
  const prevStart = new Date(Date.UTC(prevEnd.getUTCFullYear(), prevEnd.getUTCMonth() - 2, 1));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end), prevStart: fmt(prevStart), prevEnd: fmt(prevEnd) };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const householdId = params.get('householdId');
    if (!householdId) {
      return NextResponse.json({ error: 'householdId is required' }, { status: 400 });
    }

    const period = defaultPeriod();
    const start = params.get('start') ?? period.start;
    const end = params.get('end') ?? period.end;

    const expenseSelect = 'id,amount,date,merchant,note,categories(name)';
    const incomeSelect = 'id,amount,date,source,note,categories(name)';

    const [expensesRes, incomesRes, prevExpRes, prevIncRes, loansRes] = await Promise.all([
      supabase
        .from('expenses')
        .select(expenseSelect)
        .eq('household_id', householdId)
        .gte('date', start)
        .lte('date', end),
      supabase
        .from('incomes')
        .select(incomeSelect)
        .eq('household_id', householdId)
        .gte('date', start)
        .lte('date', end),
      supabase
        .from('expenses')
        .select(expenseSelect)
        .eq('household_id', householdId)
        .gte('date', period.prevStart)
        .lte('date', period.prevEnd),
      supabase
        .from('incomes')
        .select(incomeSelect)
        .eq('household_id', householdId)
        .gte('date', period.prevStart)
        .lte('date', period.prevEnd),
      supabase
        .from('loans')
        .select('id,monthly_payment,remaining_balance,interest_rate,status')
        .eq('household_id', householdId)
        .eq('status', 'active'),
    ]);

    const errors = [
      expensesRes.error,
      incomesRes.error,
      prevExpRes.error,
      prevIncRes.error,
      loansRes.error,
    ].filter(Boolean);
    if (errors.length > 0) throw errors[0];

    type RawTx = {
      id: string;
      amount: number | string;
      date: string;
      merchant?: string | null;
      source?: string | null;
      note?: string | null;
      categories?: { name?: string | null } | { name?: string | null }[] | null;
    };

    const pickCategory = (cat: RawTx['categories']): string | null => {
      if (!cat) return null;
      if (Array.isArray(cat)) return cat[0]?.name ?? null;
      return cat.name ?? null;
    };

    const mapTx = (rows: unknown[]): InsightTransaction[] =>
      (rows ?? []).map((r) => {
        const row = r as RawTx;
        return {
          id: row.id,
          amount: Number(row.amount),
          date: row.date,
          category: pickCategory(row.categories),
          description: row.note ?? row.merchant ?? row.source ?? null,
        };
      });

    const loans: InsightLoan[] = (loansRes.data ?? []).map((r) => {
      const row = r as {
        id: string;
        monthly_payment: number | string | null;
        remaining_balance: number | string | null;
        interest_rate: number | string | null;
      };
      return {
        id: row.id,
        monthlyPayment: Number(row.monthly_payment ?? 0),
        remainingBalance: Number(row.remaining_balance ?? 0),
        interestRate: Number(row.interest_rate ?? 0),
      };
    });

    const input: InsightInput = {
      periodStart: start,
      periodEnd: end,
      expenses: mapTx(expensesRes.data ?? []),
      incomes: mapTx(incomesRes.data ?? []),
      previousExpenses: mapTx(prevExpRes.data ?? []),
      previousIncomes: mapTx(prevIncRes.data ?? []),
      loans,
    };

    const insights = computeInsights(input);
    return NextResponse.json(insights);
  } catch (error) {
    console.error('GET /api/insights error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
