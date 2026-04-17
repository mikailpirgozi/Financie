import { type NextRequest, NextResponse } from 'next/server';
import { fetchEcbRates } from '@finapp/core';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Syncs ECB daily FX rates into `fx_rates`. Idempotent (UNIQUE on
 * (rate_date, from_currency, to_currency)).
 *
 * Authorization: must be invoked with `Authorization: Bearer <token>`
 * matching `process.env.CRON_SECRET`. Wire this to:
 *   - Vercel cron (vercel.json -> crons)
 *   - or Supabase pg_cron via pg_net POST.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const rates = await fetchEcbRates();
    const supabase = createAdminClient();

    const rows = rates.map((r) => ({
      rate_date: r.date,
      from_currency: r.from,
      to_currency: r.to,
      rate: r.rate,
      source: 'ecb',
    }));

    const { error } = await supabase
      .from('fx_rates')
      .upsert(rows, { onConflict: 'rate_date,from_currency,to_currency' });

    if (error) throw error;

    return NextResponse.json({ ok: true, count: rows.length, date: rates[0]?.date });
  } catch (error) {
    console.error('POST /api/fx/sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
