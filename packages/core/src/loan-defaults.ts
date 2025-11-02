/**
 * Default lenders for loan form dropdowns
 * Separated by type for better UX
 */

export const DEFAULT_LENDERS = {
  banks: [
    'Slovenská sporiteľňa',
    'Tatra banka',
    'VÚB banka',
    'ČSOB',
    'UniCredit Bank',
    'mBank',
    'Poštová banka',
    '365.bank',
    'Prima banka',
  ],
  leasing: [
    'HomeCredit',
    'Provident',
    'Cofidis',
    'UniCredit Leasing',
    'VB Leasing',
    'ČSOB Leasing',
    'Creditas',
  ],
} as const;

export const LOAN_TYPE_INFO = {
  annuity: {
    label: 'Anuitný',
    description: 'Fixná mesačná splátka (rovnaká každý mesiac)',
    icon: '💳',
    typical: 'Spotrebné úvery, osobné pôžičky',
  },
  fixed_principal: {
    label: 'Fixná istina',
    description: 'Klesajúca splátka (fixná istina + klesajúci úrok)',
    icon: '📉',
    typical: 'Hypotéky, väčšie úvery',
  },
  interest_only: {
    label: 'Interest-only',
    description: 'Mesačne len úrok, na konci celá suma (balón)',
    icon: '🎈',
    typical: 'Investičné úvery, bridging loans',
  },
  auto_loan: {
    label: 'Auto úver',
    description: 'Špeciálny úver na auto (leasing)',
    icon: '🚗',
    typical: 'Autá, motocykle, vozidlá',
  },
} as const;

export const LOAN_AMOUNT_PRESETS = [
  { value: 1000, label: '1 000 €' },
  { value: 5000, label: '5 000 €' },
  { value: 10000, label: '10 000 €' },
  { value: 20000, label: '20 000 €' },
  { value: 50000, label: '50 000 €' },
  { value: 100000, label: '100 000 €' },
] as const;

export const LOAN_TERM_PRESETS = [
  { value: 12, label: '1 rok' },
  { value: 24, label: '2 roky' },
  { value: 36, label: '3 roky' },
  { value: 60, label: '5 rokov' },
  { value: 84, label: '7 rokov' },
  { value: 120, label: '10 rokov' },
  { value: 180, label: '15 rokov' },
  { value: 240, label: '20 rokov' },
  { value: 300, label: '25 rokov' },
  { value: 360, label: '30 rokov' },
] as const;

export const LOAN_CALCULATION_MODES = {
  rate_term: {
    label: 'Úrok + Doba',
    description: 'Vypočítam mesačnú splátku',
    calculates: 'payment',
    requires: ['principal', 'annualRate', 'termMonths'],
  },
  payment_term: {
    label: 'Splátka + Doba',
    description: 'Vypočítam úrok (RPMN)',
    calculates: 'rate',
    requires: ['principal', 'monthlyPayment', 'termMonths'],
  },
  rate_payment: {
    label: 'Úrok + Splátka',
    description: 'Vypočítam dobu splácania',
    calculates: 'term',
    requires: ['principal', 'annualRate', 'monthlyPayment'],
  },
} as const;

export type LoanCalculationMode = keyof typeof LOAN_CALCULATION_MODES;

