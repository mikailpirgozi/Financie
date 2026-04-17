import type { BankParser, NormalizedTransaction } from '../types';
import { parseCsvLine, parseSkAmount, parseSkDate, splitCsvLines } from '../csv';

/**
 * VÚB banka — Internet banking export. Predvolený separator `;`,
 * obvykla hlavička:
 *   "Dátum zaúčtovania";"Dátum valuty";"Suma";"Mena";"Variabilný symbol";
 *   "Konštantný symbol";"Špecifický symbol";"Protiúčet";"Popis";"Referencia";
 */
export const vubParser: BankParser = {
  bank: 'vub',
  parse(csv) {
    const lines = splitCsvLines(csv);
    if (lines.length === 0) return [];

    const header = parseCsvLine(lines[0]!, ';').map((s) => s.toLowerCase());
    const idx = (needle: string) => header.findIndex((h) => h.includes(needle));

    const dateIdx = idx('zaúčtovania') >= 0 ? idx('zaúčtovania') : idx('zauctovania');
    const amountIdx = idx('suma');
    const currencyIdx = idx('mena');
    const counterpartyIdx = idx('protiúčet') >= 0 ? idx('protiúčet') : idx('protiucet');
    const descriptionIdx = idx('popis');
    const refIdx = idx('referencia');

    if (dateIdx < 0 || amountIdx < 0) {
      throw new Error('VÚB CSV: missing required columns');
    }

    const out: NormalizedTransaction[] = [];
    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line) continue;
      const cells = parseCsvLine(line, ';');
      if (cells.length < amountIdx + 1) continue;
      const dateCell = cells[dateIdx];
      const amountCell = cells[amountIdx];
      if (dateCell === undefined || amountCell === undefined) continue;
      try {
        out.push({
          date: parseSkDate(dateCell),
          amount: parseSkAmount(amountCell),
          currency: currencyIdx >= 0 ? cells[currencyIdx] || 'EUR' : 'EUR',
          counterparty: counterpartyIdx >= 0 ? cells[counterpartyIdx] || undefined : undefined,
          description: descriptionIdx >= 0 ? cells[descriptionIdx] || undefined : undefined,
          externalRef: refIdx >= 0 ? cells[refIdx] || undefined : undefined,
        });
      } catch {
        // skip
      }
    }
    return out;
  },
};
