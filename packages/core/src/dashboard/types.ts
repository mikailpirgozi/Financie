import { z } from 'zod';

/**
 * Dashboard data for a single month
 */
export interface MonthlyDashboardData {
  month: string; // Format: YYYY-MM
  totalIncome: string;
  totalExpenses: string;
  netCashFlow: string;
  loanPaymentsTotal: string;
  loanPrincipalPaid: string;
  loanInterestPaid: string;
  loanFeesPaid: string;
  loanBalanceRemaining: string;
  totalAssets: string;
  netWorth: string;
  netWorthChange: string;
}

/**
 * Dashboard response with multiple months
 */
export interface DashboardData {
  currentMonth: MonthlyDashboardData;
  history: MonthlyDashboardData[];
}

/**
 * Dashboard query parameters
 */
export interface DashboardQuery {
  householdId: string;
  monthsCount?: number;
}

// Zod schemas for validation
export const monthlyDashboardDataSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  totalIncome: z.string(),
  totalExpenses: z.string(),
  netCashFlow: z.string(),
  loanPaymentsTotal: z.string(),
  loanPrincipalPaid: z.string(),
  loanInterestPaid: z.string(),
  loanFeesPaid: z.string(),
  loanBalanceRemaining: z.string(),
  totalAssets: z.string(),
  netWorth: z.string(),
  netWorthChange: z.string(),
});

export const dashboardDataSchema = z.object({
  currentMonth: monthlyDashboardDataSchema,
  history: z.array(monthlyDashboardDataSchema),
});

export const dashboardQuerySchema = z.object({
  householdId: z.string().uuid(),
  monthsCount: z.number().int().positive().max(120).optional().default(12),
});

