import { supabase } from './supabase';
import { env } from './env';

const API_URL = env.EXPO_PUBLIC_API_URL;
const REQUEST_TIMEOUT = 30000; // 30 seconds

interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

class ApiTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiTimeoutError';
  }
}

class ApiNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiNetworkError';
  }
}

/**
 * Create an AbortSignal that times out after the specified duration
 */
function createTimeoutSignal(timeout: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return controller.signal;
}

/**
 * Retry logic for failed requests
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 2,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    
    // Don't retry on 4xx errors (client errors)
    if (error instanceof Error && error.message.includes('HTTP 4')) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

/**
 * Base fetch wrapper with auth headers, timeout, and retry logic
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  useRetry: boolean = true
): Promise<T> {
  const fetchFn = async (): Promise<T> => {
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

    const timeoutSignal = createTimeoutSignal(REQUEST_TIMEOUT);
    const combinedSignal = options.signal || timeoutSignal;

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        signal: combinedSignal,
      });

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({ 
          error: 'Unknown error',
          statusCode: response.status 
        }));
        throw new Error(error.message || error.error || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiTimeoutError('Request timed out. Please check your internet connection.');
        }
        if (error.message.includes('Network request failed') || error.message.includes('Failed to fetch')) {
          throw new ApiNetworkError('Network error. Please check your internet connection.');
        }
      }
      throw error;
    }
  };

  return useRetry ? withRetry(fetchFn) : fetchFn();
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
  rate: number; // Same as annual_rate
  term_months: number;
  term: number; // Same as term_months
  status: 'active' | 'paid_off' | 'defaulted';
  amount_paid: number;
  remaining_balance: number;
  monthly_payment: number;
  start_date: string;
  end_date: string;
  next_payment_due_date: string | null;
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

export async function deleteCategory(categoryId: string): Promise<void> {
  await apiFetch(`/api/categories/${categoryId}`, {
    method: 'DELETE',
  });
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

// ============================================
// RULES API
// ============================================

export interface Rule {
  id: string;
  household_id: string;
  match_type: 'contains' | 'exact' | 'starts_with' | 'ends_with';
  match_value: string;
  target_category_id: string;
  applies_to: 'expense' | 'income';
  created_at: string;
  target_category?: Category;
}

export interface CreateRuleData {
  household_id: string;
  match_type: 'contains' | 'exact' | 'starts_with' | 'ends_with';
  match_value: string;
  target_category_id: string;
  applies_to: 'expense' | 'income';
}

export async function getRules(householdId: string): Promise<Rule[]> {
  const response = await apiFetch<Rule[] | { rules: Rule[] }>(
    `/api/rules?householdId=${householdId}`
  );
  // Handle both array response and { rules: [] } response
  return Array.isArray(response) ? response : response.rules;
}

export async function createRule(data: CreateRuleData): Promise<Rule> {
  const response = await apiFetch<Rule | { rule: Rule }>('/api/rules', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  // Handle both direct Rule response and { rule: Rule } response
  return 'id' in response ? response : response.rule;
}

export async function deleteRule(ruleId: string): Promise<void> {
  await apiFetch(`/api/rules/${ruleId}`, {
    method: 'DELETE',
  });
}

export async function updateRule(ruleId: string, data: Partial<CreateRuleData>): Promise<Rule> {
  const response = await apiFetch<Rule | { rule: Rule }>(`/api/rules/${ruleId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return 'id' in response ? response : response.rule;
}

// ============================================
// AUDIT LOG API
// ============================================

export interface AuditLogEntry {
  id: string;
  user_id: string;
  household_id: string;
  action: 'create' | 'update' | 'delete';
  entity_type: 'expense' | 'income' | 'loan' | 'asset' | 'category';
  entity_id: string;
  changes: Record<string, unknown>;
  timestamp: string;
  user?: {
    email: string;
    full_name: string | null;
  };
}

export interface AuditLogFilters {
  entityType?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

export async function getAuditLog(
  householdId: string,
  filters?: AuditLogFilters
): Promise<AuditLogEntry[]> {
  const params = new URLSearchParams({ householdId });
  
  if (filters?.entityType) params.append('entityType', filters.entityType);
  if (filters?.action) params.append('action', filters.action);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  
  const response = await apiFetch<{ entries: AuditLogEntry[] } | AuditLogEntry[]>(
    `/api/audit?${params.toString()}`
  );
  
  return Array.isArray(response) ? response : response.entries || [];
}

// ============================================
// CATEGORY CRUD (extending existing)
// ============================================

export interface CreateCategoryData {
  name: string;
  kind: 'expense' | 'income' | 'asset' | 'loan';
  parent_id?: string;
  household_id: string;
}

export async function createCategory(data: CreateCategoryData): Promise<Category> {
  const response = await apiFetch<{ category: Category } | Category>('/api/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return 'id' in response ? response : response.category;
}

export async function updateCategory(
  id: string,
  data: Partial<CreateCategoryData>
): Promise<Category> {
  const response = await apiFetch<{ category: Category } | Category>(
    `/api/categories/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    }
  );
  return 'id' in response ? response : response.category;
}

// ============================================
// LOAN EARLY REPAYMENT API
// ============================================

export interface EarlyRepaymentPreview {
  new_remaining_principal: number;
  saved_interest: number;
  new_installment_count: number;
}

export interface EarlyRepaymentRequest {
  amount: number;
  payment_date: string;
  preview?: boolean;
}

export async function previewEarlyRepayment(
  loanId: string,
  data: EarlyRepaymentRequest
): Promise<EarlyRepaymentPreview> {
  return apiFetch(`/api/loans/${loanId}/early-repayment`, {
    method: 'POST',
    body: JSON.stringify({ ...data, preview: true }),
  });
}

export async function processEarlyRepayment(
  loanId: string,
  data: Omit<EarlyRepaymentRequest, 'preview'>
): Promise<{ success: boolean; loan: Loan }> {
  return apiFetch(`/api/loans/${loanId}/early-repayment`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================
// LOAN SIMULATE API
// ============================================

export interface SimulationParams {
  new_rate?: number;
  new_term?: number;
  extra_payment_monthly?: number;
}

export interface SimulationResult {
  original: {
    total_interest: number;
    total_cost: number;
    monthly_payment: number;
  };
  simulated: {
    total_interest: number;
    total_cost: number;
    monthly_payment: number;
  };
  savings: {
    interest_saved: number;
    time_saved_months: number;
  };
}

export async function simulateLoan(
  loanId: string,
  params: SimulationParams
): Promise<SimulationResult> {
  return apiFetch(`/api/loans/${loanId}/simulate`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ============================================
// SUBSCRIPTION API
// ============================================

export interface SubscriptionStatus {
  plan: 'free' | 'pro' | 'premium';
  status: 'active' | 'cancelled' | 'expired';
  current_period_start?: string;
  current_period_end?: string;
}

export async function getSubscriptionStatus(householdId: string): Promise<SubscriptionStatus> {
  const response = await apiFetch<SubscriptionStatus | { subscription: SubscriptionStatus }>(
    `/api/subscription/status?householdId=${householdId}`
  );
  return 'plan' in response ? response : response.subscription;
}

// ============================================
// INCOME TEMPLATES (LOCAL STORAGE)
// ============================================

export interface IncomeTemplate {
  id: string;
  name: string;
  amount: number;
  category_id: string;
  source?: string;
  note?: string;
  created_at: string;
}

const TEMPLATES_STORAGE_KEY = 'income_templates';

export async function getIncomeTemplates(): Promise<IncomeTemplate[]> {
  try {
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function createIncomeTemplate(data: Omit<IncomeTemplate, 'id' | 'created_at'>): Promise<IncomeTemplate> {
  const templates = await getIncomeTemplates();
  const newTemplate: IncomeTemplate = {
    ...data,
    id: `template_${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  
  templates.push(newTemplate);
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  
  return newTemplate;
}

export async function deleteIncomeTemplate(templateId: string): Promise<void> {
  const templates = await getIncomeTemplates();
  const filtered = templates.filter((t) => t.id !== templateId);
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(filtered));
}

export async function applyIncomeTemplate(template: IncomeTemplate, date: string): Promise<Income> {
  return createIncome({
    date,
    amount: template.amount,
    category_id: template.category_id,
    source: template.source,
    note: template.note,
  });
}

