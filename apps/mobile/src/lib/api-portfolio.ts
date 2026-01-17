import { apiFetch } from './api';
import type { 
  PortfolioOverview, 
  AssetROI,
  MonthlyLoanCalendar,
  AssetCashFlow
} from '@finapp/core';

/**
 * Portfolio API Client
 */

export interface AssetMetrics {
  assetId: string;
  metrics: {
    ltvRatio: number;
    equity: number;
    netMonthlyCashFlow: number;
  };
  roi?: AssetROI;
  linkedLoan?: {
    id: string;
    lender: string;
    currentBalance: number;
    monthlyPayment: number;
  };
  historicalMetrics?: {
    calculationDate: string;
    assetValue: number;
    loanBalance: number;
    equity: number;
    ltvRatio: number;
  };
}

export interface LoanCalendarResponse {
  calendar: MonthlyLoanCalendar[];
  summary: {
    totalMonths: number;
    totalPayments: number;
    totalPrincipal: number;
    totalInterest: number;
    totalFees: number;
  };
  period: {
    startMonth: string;
    endMonth: string;
    monthsCount: number;
  };
}

/**
 * Získa prehľad portfólia
 */
export async function getPortfolioOverview(
  householdId: string
): Promise<{ portfolio: PortfolioOverview }> {
  return apiFetch(`/api/portfolio/overview?householdId=${householdId}`);
}

/**
 * Získa metriky pre majetok
 */
export async function getAssetMetrics(
  assetId: string,
  options?: {
    includeRoi?: boolean;
    roiPeriodMonths?: number;
  }
): Promise<AssetMetrics> {
  const params = new URLSearchParams();
  if (options?.includeRoi !== undefined) {
    params.append('includeRoi', String(options.includeRoi));
  }
  if (options?.roiPeriodMonths) {
    params.append('roiPeriodMonths', String(options.roiPeriodMonths));
  }
  
  const queryString = params.toString();
  const url = `/api/assets/${assetId}/metrics${queryString ? `?${queryString}` : ''}`;
  
  return apiFetch(url);
}

/**
 * Získa splátkový kalendár
 */
export async function getLoanCalendar(
  householdId: string,
  options?: {
    startMonth?: string; // YYYY-MM
    monthsCount?: number;
  }
): Promise<LoanCalendarResponse> {
  const params = new URLSearchParams({ householdId });
  
  if (options?.startMonth) {
    params.append('startMonth', options.startMonth);
  }
  if (options?.monthsCount) {
    params.append('monthsCount', String(options.monthsCount));
  }
  
  return apiFetch(`/api/loans/calendar?${params.toString()}`);
}

/**
 * Prepojí úver s majetkom
 */
export async function linkLoanToAsset(
  loanId: string,
  assetId: string
): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/api/loans/${loanId}/link-asset`, {
    method: 'POST',
    body: JSON.stringify({ assetId }),
  });
}

/**
 * Odpojí úver od majetku
 */
export async function unlinkLoanFromAsset(
  loanId: string
): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/api/loans/${loanId}/link-asset`, {
    method: 'DELETE',
  });
}

/**
 * Získa cash flow históriu pre majetok
 */
export async function getAssetCashFlow(
  assetId: string,
  options?: {
    startDate?: string; // YYYY-MM-DD
    endDate?: string; // YYYY-MM-DD
    type?: string;
  }
): Promise<{
  cashFlows: Array<{
    id: string;
    date: string;
    type: string;
    amount: number;
    description?: string;
  }>;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netCashFlow: number;
    count: number;
  };
}> {
  const params = new URLSearchParams();
  if (options?.startDate) params.append('startDate', options.startDate);
  if (options?.endDate) params.append('endDate', options.endDate);
  if (options?.type) params.append('type', options.type);
  
  const queryString = params.toString();
  const url = `/api/assets/${assetId}/cash-flow${queryString ? `?${queryString}` : ''}`;
  
  return apiFetch(url);
}

/**
 * Pridá cash flow záznam pre majetok
 */
export async function addAssetCashFlow(
  assetId: string,
  data: {
    date: string; // YYYY-MM-DD
    type: string;
    amount: number;
    description?: string;
  }
): Promise<{ cashFlow: AssetCashFlow }> {
  return apiFetch(`/api/assets/${assetId}/cash-flow`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

