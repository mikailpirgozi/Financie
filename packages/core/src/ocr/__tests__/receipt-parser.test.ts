import { describe, expect, it } from 'vitest';
import { parseReceipt } from '../receipt-parser';

describe('parseReceipt', () => {
  it('extracts merchant, date, total from typical SK receipt', () => {
    const text = [
      'TESCO STORES',
      'Bratislava, Petržalka',
      'IČO: 12345678',
      '15.04.2026 14:23',
      '',
      'Mlieko 1L     1,29',
      'Chlieb        2,49',
      'Spolu k úhrade   3,78',
      'DPH 20%       0,63',
    ].join('\n');

    const r = parseReceipt(text);
    expect(r.merchant?.toLowerCase()).toContain('tesco');
    expect(r.date).toBe('2026-04-15');
    expect(r.total).toBeCloseTo(3.78, 2);
    expect(r.vatAmount).toBeCloseTo(0.63, 2);
    expect(r.confidence).toBeGreaterThan(0.7);
  });

  it('falls back to largest amount if no TOTAL keyword', () => {
    const text = ['Niečo', '15.04.2026', 'Položka A 1,00', 'Položka B 5,55'].join('\n');
    const r = parseReceipt(text);
    expect(r.total).toBeCloseTo(5.55, 2);
  });

  it('low confidence when nothing parseable', () => {
    const r = parseReceipt('blablabla');
    expect(r.total).toBeUndefined();
    expect(r.confidence).toBeLessThan(0.5);
  });
});
