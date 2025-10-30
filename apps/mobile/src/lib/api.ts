import { supabase } from './supabase';

const API_URL = typeof window !== 'undefined' && process?.env?.EXPO_PUBLIC_API_URL 
  ? process.env.EXPO_PUBLIC_API_URL 
  : 'http://localhost:3000';

/**
 * Base fetch wrapper with auth headers
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Merge existing headers if they exist
  if (options.headers && typeof options.headers === 'object') {
    Object.assign(headers, options.headers);
  }

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================
// LOANS API
// ============================================

export interface Loan {
  id: string;
  household_id: string;
  lender: string;
  loan_type: 'annuity' | 'fixed_principal' | 'interest_only';
  principal: number;
  annual_rate: number;
  term_months: number;
  status: 'active' | 'paid_off' | 'defaulted';
  created_at: string;
}

export interface LoanSchedule {
  id: string;
  payment_date: string;
  payment: number;
  principal: number;
  interest: number;
  fees: number;
  balance_remaining: number;
}

export async function getLoans(householdId: string): Promise<Loan[]> {
  const { loans } = await apiFetch<{ loans: Loan[] }>(
    `/api/loans?householdId=${householdId}`
  );
  return loans;
}

export async function getLoan(loanId: string): Promise<{ loan: Loan; schedule: LoanSchedule[] }> {
  return apiFetch(`/api/loans/${loanId}`);
}

export interface CreateLoanData {
  lender: string;
  loan_type: 'annuity' | 'fixed_principal' | 'interest_only';
  principal: number;
  annual_rate: number;
  term_months: number;
}

export async function createLoan(data: CreateLoanData): Promise<{ loan: Loan }> {
  return apiFetch('/api/loans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function payLoan(
  loanId: string,
  amount: number,
  date: string
): Promise<{ success: boolean }> {
  return apiFetch(`/api/loans/${loanId}/pay`, {
    method: 'POST',
    body: JSON.stringify({ amount, date }),
  });
}

// ============================================
// EXPENSES API
// ============================================

export interface Expense {
  id: string;
  household_id: string;
  date: string;
  amount: number;
  category_id: string;
  merchant?: string;
  note?: string;
  created_at: string;
}

export interface CreateExpenseData {
  date: string;
  amount: number;
  category_id: string;
  merchant?: string;
  note?: string;
}

export async function getExpenses(householdId: string): Promise<Expense[]> {
  const { expenses } = await apiFetch<{ expenses: Expense[] }>(
    `/api/expenses?householdId=${householdId}`
  );
  return expenses;
}

export async function createExpense(data: CreateExpenseData): Promise<{ expense: Expense }> {
  return apiFetch('/api/expenses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await apiFetch(`/api/expenses/${expenseId}`, {
    method: 'DELETE',
  });
}

// ============================================
// INCOMES API
// ============================================

export interface Income {
  id: string;
  household_id: string;
  date: string;
  amount: number;
  category_id: string;
  source?: string;
  note?: string;
  created_at: string;
}

export interface CreateIncomeData {
  date: string;
  amount: number;
  category_id: string;
  source?: string;
  note?: string;
}

export async function getIncomes(householdId: string): Promise<Income[]> {
  const { incomes } = await apiFetch<{ incomes: Income[] }>(
    `/api/incomes?householdId=${householdId}`
  );
  return incomes;
}

export async function createIncome(data: CreateIncomeData): Promise<{ income: Income }> {
  return apiFetch('/api/incomes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteIncome(incomeId: string): Promise<void> {
  await apiFetch(`/api/incomes/${incomeId}`, {
    method: 'DELETE',
  });
}

// ============================================
// CATEGORIES API
// ============================================

export interface Category {
  id: string;
  household_id: string;
  kind: 'income' | 'expense' | 'loan' | 'asset';
  name: string;
  parent_id?: string;
}

export async function getCategories(
  householdId: string,
  kind?: string
): Promise<Category[]> {
  const url = kind
    ? `/api/categories?householdId=${householdId}&kind=${kind}`
    : `/api/categories?householdId=${householdId}`;
  
  const { categories } = await apiFetch<{ categories: Category[] }>(url);
  return categories;
}

// ============================================
// HOUSEHOLD API
// ============================================

export interface Household {
  id: string;
  name: string;
  created_at: string;
}

export async function getCurrentHousehold(): Promise<Household> {
  const { household } = await apiFetch<{ household: Household }>('/api/households/current');
  return household;
}

// ============================================
// DASHBOARD API
// ============================================

export interface MonthlyDashboardData {
  month: string;
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

export interface DashboardData {
  currentMonth: MonthlyDashboardData;
  history: MonthlyDashboardData[];
}

export async function getDashboardData(
  householdId: string,
  monthsCount: number = 12
): Promise<DashboardData> {
  return apiFetch<DashboardData>(
    `/api/dashboard?householdId=${householdId}&monthsCount=${monthsCount}`
  );
}

