/**
 * Portfolio Management Utilities
 * Výpočty LTV, ROI, cash flow pre portfolio management
 */

import type {
  AssetROI,
  AssetWithMetrics,
} from '../types';

/**
 * Vypočíta LTV ratio (Loan-to-Value)
 */
export function calculateLTV(assetValue: number, loanBalance: number): number {
  if (assetValue <= 0) return 0;
  return (loanBalance / assetValue) * 100;
}

/**
 * Vypočíta equity (vlastný podiel)
 */
export function calculateEquity(assetValue: number, loanBalance: number): number {
  return Math.max(0, assetValue - loanBalance);
}

/**
 * Vypočíta debt-to-asset ratio pre celé portfólio
 */
export function calculateDebtToAssetRatio(totalAssets: number, totalDebt: number): number {
  if (totalAssets <= 0) return 0;
  return (totalDebt / totalAssets) * 100;
}

/**
 * Vypočíta net worth
 */
export function calculateNetWorth(totalAssets: number, totalDebt: number): number {
  return totalAssets - totalDebt;
}

/**
 * Vypočíta ROI pre majetok
 * @param acquisitionValue Nákupná cena
 * @param currentValue Aktuálna hodnota
 * @param totalIncome Celkový príjem za obdobie
 * @param totalExpenses Celkové výdavky za obdobie
 * @param periodMonths Obdobie v mesiacoch (pre anualizáciu)
 */
export function calculateAssetROI(
  acquisitionValue: number,
  currentValue: number,
  totalIncome: number,
  totalExpenses: number,
  periodMonths: number = 12
): Omit<AssetROI, 'currentValue' | 'acquisitionValue' | 'valueChange' | 'totalIncome' | 'totalExpenses' | 'netCashFlow'> {
  if (acquisitionValue <= 0) {
    return {
      cashFlowRoi: 0,
      appreciationRoi: 0,
      totalRoi: 0,
    };
  }

  const netCashFlow = totalIncome - totalExpenses;
  const valueChange = currentValue - acquisitionValue;

  // Anualizovaný cash flow ROI
  const cashFlowRoi = periodMonths > 0
    ? (netCashFlow / acquisitionValue * 100 * 12 / periodMonths)
    : 0;

  // Appreciation ROI (nie je anualizovaný, reprezentuje celkové zhodnotenie)
  const appreciationRoi = (valueChange / acquisitionValue * 100);

  // Total ROI
  const totalRoi = cashFlowRoi + appreciationRoi;

  return {
    cashFlowRoi: Number(cashFlowRoi.toFixed(4)),
    appreciationRoi: Number(appreciationRoi.toFixed(4)),
    totalRoi: Number(totalRoi.toFixed(4)),
  };
}

/**
 * Vypočíta mesačný cash flow z majetku
 */
export function calculateAssetCashFlow(
  monthlyIncome: number,
  monthlyExpenses: number,
  loanMonthlyPayment: number = 0
): number {
  return monthlyIncome - monthlyExpenses - loanMonthlyPayment;
}

/**
 * Vytvorí kompletné asset metriky
 */
export function createAssetMetrics(
  assetValue: number,
  loanBalance: number,
  monthlyIncome: number,
  monthlyExpenses: number,
  loanMonthlyPayment: number = 0
): {
  ltvRatio: number;
  equity: number;
  netMonthlyCashFlow: number;
} {
  return {
    ltvRatio: calculateLTV(assetValue, loanBalance),
    equity: calculateEquity(assetValue, loanBalance),
    netMonthlyCashFlow: calculateAssetCashFlow(monthlyIncome, monthlyExpenses, loanMonthlyPayment),
  };
}

/**
 * Zoskupí majetky podľa produktivity (generujúce príjem vs negenerujúce)
 */
export function groupAssetsByProductivity(assets: AssetWithMetrics[]): {
  productive: AssetWithMetrics[];
  nonProductive: AssetWithMetrics[];
  productiveValue: number;
  nonProductiveValue: number;
  productiveCashFlow: number;
  nonProductiveCashFlow: number;
} {
  const productive = assets.filter(a => a.isIncomeGenerating);
  const nonProductive = assets.filter(a => !a.isIncomeGenerating);

  const productiveValue = productive.reduce((sum, a) => sum + a.currentValue, 0);
  const nonProductiveValue = nonProductive.reduce((sum, a) => sum + a.currentValue, 0);

  const productiveCashFlow = productive.reduce((sum, a) => {
    const loanPayment = a.linkedLoan?.monthlyPayment || 0;
    return sum + (a.monthlyIncome - a.monthlyExpenses - loanPayment);
  }, 0);

  const nonProductiveCashFlow = nonProductive.reduce((sum, a) => {
    const loanPayment = a.linkedLoan?.monthlyPayment || 0;
    return sum + (a.monthlyIncome - a.monthlyExpenses - loanPayment);
  }, 0);

  return {
    productive,
    nonProductive,
    productiveValue,
    nonProductiveValue,
    productiveCashFlow,
    nonProductiveCashFlow,
  };
}

/**
 * Vypočíta health score pre LTV
 * < 60% = excellent (zelená)
 * 60-80% = good (žltá)
 * 80-90% = warning (oranžová)
 * > 90% = danger (červená)
 */
export function getLTVHealthScore(ltv: number): {
  score: 'excellent' | 'good' | 'warning' | 'danger';
  color: string;
  message: string;
} {
  if (ltv < 60) {
    return {
      score: 'excellent',
      color: '#10b981',
      message: 'Výborný pomer vlastného a cudzieho kapitálu',
    };
  } else if (ltv < 80) {
    return {
      score: 'good',
      color: '#f59e0b',
      message: 'Dobrý pomer, bežný pri hypotékach',
    };
  } else if (ltv < 90) {
    return {
      score: 'warning',
      color: '#fb923c',
      message: 'Vysoké zadlženie, zvážte zvýšenie equity',
    };
  } else {
    return {
      score: 'danger',
      color: '#ef4444',
      message: 'Kritické zadlženie! Potrebné znížiť dlh',
    };
  }
}

/**
 * Formátuje cash flow s pridaním znaku a farby
 */
export function formatCashFlow(cashFlow: number): {
  formatted: string;
  color: string;
  isPositive: boolean;
} {
  const isPositive = cashFlow >= 0;
  return {
    formatted: `${isPositive ? '+' : ''}${cashFlow.toFixed(2)} €`,
    color: isPositive ? '#10b981' : '#ef4444',
    isPositive,
  };
}

/**
 * Vypočíta priemernú hodnotu poľa čísel
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Vypočíta percentuálnu zmenu
 */
export function calculatePercentageChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

