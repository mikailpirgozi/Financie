import { type NextRequest, NextResponse } from 'next/server';
import {
  parseBankCsv,
  dedupTransactions,
  type SupportedBank,
  type NormalizedTransaction,
} from '@finapp/core';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ImportBody {
  householdId: string;
  bank: SupportedBank;
  csv: string;
  defaultCategoryId: string;
  /** If true, only return preview (no DB writes). */
  dryRun?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as ImportBody;
    if (!body.householdId || !body.bank || !body.csv || !body.defaultCategoryId) {
      return NextResponse.json(
        { error: 'householdId, bank, csv, defaultCategoryId are required' },
        { status: 400 }
      );
    }

    const parsed = parseBankCsv(body.bank, body.csv);

    // Pull last 90 days of expenses+incomes for dedup heuristic.
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 90);
    const sinceIso = since.toISOString().slice(0, 10);

    const [{ data: prevExp }, { data: prevInc }] = await Promise.all([
      supabase
        .from('expenses')
        .select('date,amount,merchant,note')
        .eq('household_id', body.householdId)
        .gte('date', sinceIso),
      supabase
        .from('incomes')
        .select('date,amount,source,note')
        .eq('household_id', body.householdId)
        .gte('date', sinceIso),
    ]);

    const existing = [
      ...(prevExp ?? []).map((r) => ({
        date: (r as { date: string }).date,
        amount: -Math.abs(Number((r as { amount: number | string }).amount)),
        counterparty: (r as { merchant: string | null }).merchant ?? undefined,
        externalRef: extractRef((r as { note: string | null }).note),
      })),
      ...(prevInc ?? []).map((r) => ({
        date: (r as { date: string }).date,
        amount: Math.abs(Number((r as { amount: number | string }).amount)),
        counterparty: (r as { source: string }).source,
        externalRef: extractRef((r as { note: string | null }).note),
      })),
    ];

    const fresh = dedupTransactions(parsed.transactions, existing);

    if (body.dryRun) {
      return NextResponse.json({
        bank: parsed.bank,
        parsedCount: parsed.transactions.length,
        skipped: parsed.skipped,
        deduped: parsed.transactions.length - fresh.length,
        toInsertCount: fresh.length,
        preview: fresh.slice(0, 50),
      });
    }

    const expenses = fresh.filter((t) => t.amount < 0);
    const incomes = fresh.filter((t) => t.amount > 0);

    const expenseRows = expenses.map((t) => ({
      household_id: body.householdId,
      date: t.date,
      amount: Math.abs(t.amount),
      category_id: body.defaultCategoryId,
      merchant: t.counterparty ?? null,
      note: composeNote(t),
    }));

    const incomeRows = incomes.map((t) => ({
      household_id: body.householdId,
      date: t.date,
      amount: t.amount,
      source: t.counterparty ?? 'Bank import',
      category_id: body.defaultCategoryId,
      note: composeNote(t),
    }));

    let insertedExpenses = 0;
    let insertedIncomes = 0;

    if (expenseRows.length > 0) {
      const { error, count } = await supabase
        .from('expenses')
        .insert(expenseRows, { count: 'exact' });
      if (error) throw error;
      insertedExpenses = count ?? expenseRows.length;
    }

    if (incomeRows.length > 0) {
      const { error, count } = await supabase
        .from('incomes')
        .insert(incomeRows, { count: 'exact' });
      if (error) throw error;
      insertedIncomes = count ?? incomeRows.length;
    }

    return NextResponse.json({
      bank: parsed.bank,
      parsedCount: parsed.transactions.length,
      skipped: parsed.skipped,
      deduped: parsed.transactions.length - fresh.length,
      insertedExpenses,
      insertedIncomes,
    });
  } catch (error) {
    console.error('POST /api/bank-import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

function extractRef(note: string | null): string | undefined {
  if (!note) return undefined;
  const m = note.match(/\[bankref:([^\]]+)\]/);
  return m?.[1];
}

function composeNote(t: NormalizedTransaction): string {
  const parts = [t.description ?? ''];
  if (t.externalRef) parts.push(`[bankref:${t.externalRef}]`);
  return parts.filter(Boolean).join(' ').trim();
}
