import { describe, expect, it } from 'vitest';
import { parseBankCsv, dedupTransactions } from '../index';

describe('Tatra banka parser', () => {
  it('parses sample export', () => {
    const csv = [
      '"Dátum zaúčtovania";"Suma";"Mena";"Typ";"Variabilný symbol";"Konštantný symbol";"Špecifický symbol";"Protiúčet";"Názov protistrany";"Popis transakcie";"Referencia banky"',
      '"15.04.2026";"-12,50";"EUR";"karta";"";"";"";"";"BILLA #123";"Nákup potravín";"REF001"',
      '"16.04.2026";"1 234,56";"EUR";"prevod";"";"";"";"";"Zamestnávateľ s.r.o.";"Mzda";"REF002"',
    ].join('\n');
    const res = parseBankCsv('tatrabanka', csv);
    expect(res.transactions).toHaveLength(2);
    expect(res.transactions[0]).toMatchObject({
      date: '2026-04-15',
      amount: -12.5,
      currency: 'EUR',
      counterparty: 'BILLA #123',
      externalRef: 'REF001',
    });
    expect(res.transactions[1].amount).toBeCloseTo(1234.56, 2);
  });
});

describe('VÚB parser', () => {
  it('parses sample export', () => {
    const csv = [
      '"Dátum zaúčtovania";"Dátum valuty";"Suma";"Mena";"Variabilný symbol";"Konštantný symbol";"Špecifický symbol";"Protiúčet";"Popis";"Referencia"',
      '"01.04.2026";"01.04.2026";"-99,99";"EUR";"";"";"";"SK1234";"Lekáreň";"V001"',
    ].join('\n');
    const res = parseBankCsv('vub', csv);
    expect(res.transactions).toHaveLength(1);
    expect(res.transactions[0].amount).toBe(-99.99);
  });
});

describe('ČSOB parser', () => {
  it('parses CSV with comma separator', () => {
    const csv = [
      'Date,Amount,Currency,Description,Counterparty,Reference',
      '2026-04-10,-50.00,EUR,Mobile top-up,O2 Slovakia,C001',
    ].join('\n');
    const res = parseBankCsv('csob', csv);
    expect(res.transactions).toHaveLength(1);
    expect(res.transactions[0]).toMatchObject({
      date: '2026-04-10',
      amount: -50,
      counterparty: 'O2 Slovakia',
    });
  });
});

describe('dedupTransactions', () => {
  it('removes duplicates by externalRef', () => {
    const existing = [{ date: '2026-04-01', amount: -10, externalRef: 'A1' }];
    const incoming = [
      { date: '2026-04-01', amount: -10, currency: 'EUR', externalRef: 'A1' },
      { date: '2026-04-02', amount: -20, currency: 'EUR', externalRef: 'A2' },
    ];
    const out = dedupTransactions(incoming, existing);
    expect(out).toHaveLength(1);
    expect(out[0].externalRef).toBe('A2');
  });

  it('falls back to composite key when ref missing', () => {
    const existing = [{ date: '2026-04-01', amount: -10, counterparty: 'Foo' }];
    const incoming = [
      { date: '2026-04-01', amount: -10, currency: 'EUR', counterparty: 'Foo' },
      { date: '2026-04-01', amount: -10, currency: 'EUR', counterparty: 'Bar' },
    ];
    const out = dedupTransactions(incoming, existing);
    expect(out).toHaveLength(1);
    expect(out[0].counterparty).toBe('Bar');
  });
});
