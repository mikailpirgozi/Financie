/**
 * Currency helpers - formatting, conversion, ECB rates fetching.
 *
 * convertAmount is a pure function: caller supplies the rate map. The
 * actual rate ingestion (ECB feed) happens in a server-side cron / Edge
 * Function and persists to fx_rates.
 */

export const SUPPORTED_CURRENCIES = [
  'EUR',
  'USD',
  'GBP',
  'CZK',
  'PLN',
  'HUF',
  'CHF',
  'JPY',
  'NOK',
  'SEK',
  'DKK',
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export interface FxRate {
  from: string;
  to: string;
  rate: number;
  date: string;
}

export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Map<string, number>
): number {
  if (fromCurrency === toCurrency) return amount;
  const direct = rates.get(`${fromCurrency}->${toCurrency}`);
  if (direct !== undefined) return roundCurrency(amount * direct);
  const inverse = rates.get(`${toCurrency}->${fromCurrency}`);
  if (inverse !== undefined) return roundCurrency(amount / inverse);
  throw new Error(`No FX rate available for ${fromCurrency} -> ${toCurrency}`);
}

export function roundCurrency(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatMoney(
  amount: number,
  currency: string = 'EUR',
  locale: string = 'sk-SK'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export async function fetchEcbRates(date: Date = new Date()): Promise<FxRate[]> {
  const url = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
  const res = await fetch(url, {
    headers: { Accept: 'application/xml' },
  });
  if (!res.ok) {
    throw new Error(`ECB feed returned ${res.status}`);
  }
  const xml = await res.text();
  const isoDate = date.toISOString().slice(0, 10);

  const out: FxRate[] = [];
  const cubeRegex = /<Cube\s+currency="([A-Z]{3})"\s+rate="([\d.]+)"\s*\/>/g;
  let m: RegExpExecArray | null;
  while ((m = cubeRegex.exec(xml)) !== null) {
    out.push({
      from: 'EUR',
      to: m[1],
      rate: Number(m[2]),
      date: isoDate,
    });
  }
  if (out.length === 0) {
    throw new Error('Failed to parse ECB rates (no Cube currency entries)');
  }
  return out;
}
