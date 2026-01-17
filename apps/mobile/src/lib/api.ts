import { supabase } from './supabase';
import { env } from './env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ApiLoan,
  ApiLoanSchedule,
  ApiExpense,
  ApiIncome,
  ApiCategory,
  ApiHousehold,
  ApiRule,
  ApiAuditLogEntry,
  ApiIncomeTemplate,
  ApiSubscriptionStatus,
  CreateExpenseData,
  CreateIncomeData,
  CreateCategoryData,
  CreateRuleData,
  AuditLogFilters,
  EarlyRepaymentPreview,
  EarlyRepaymentRequest,
  SimulationParams,
  ApiSimulationResult,
} from '@finapp/core';
import type { DashboardData, MonthlyDashboardData } from '@finapp/core';

// Re-export types for backwards compatibility
export type Loan = ApiLoan;
export type LoanSchedule = ApiLoanSchedule;
export type Expense = ApiExpense;
export type Income = ApiIncome;
export type Category = ApiCategory;
export type Household = ApiHousehold;
export type Rule = ApiRule;
export type AuditLogEntry = ApiAuditLogEntry;
export type IncomeTemplate = ApiIncomeTemplate;
export type SubscriptionStatus = ApiSubscriptionStatus;
export type SimulationResult = ApiSimulationResult;
export type { CreateExpenseData, CreateIncomeData, CreateCategoryData, CreateRuleData, AuditLogFilters };
export type { EarlyRepaymentPreview, EarlyRepaymentRequest, SimulationParams };
export type { DashboardData, MonthlyDashboardData };

const API_URL = env.EXPO_PUBLIC_API_URL;
const REQUEST_TIMEOUT = __DEV__ ? 60000 : 30000; // 60s in dev, 30s in production

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
export async function apiFetch<T>(
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

    const fullUrl = `${API_URL}${endpoint}`;
    // Debug logs disabled for performance (console.log is slow in React Native)
    // Uncomment only when debugging API issues:
    // console.log('🌐 API Request:', { url: fullUrl, method: options.method || 'GET' });

    const timeoutSignal = createTimeoutSignal(REQUEST_TIMEOUT);
    const combinedSignal = options.signal || timeoutSignal;

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
        signal: combinedSignal,
      });

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({ 
          error: 'Unknown error',
          statusCode: response.status 
        }));
        // Only log actual errors
        if (__DEV__) {
          console.error('❌ API Error:', { url: fullUrl, error });
        }
        throw new Error(error.message || error.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // Only log in development
      if (__DEV__) {
        console.error('❌ API Fetch Error:', {
          url: fullUrl,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      
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
  householdId: string;
  name?: string;
  lender: string;
  loanType: 'annuity' | 'fixed_principal' | 'interest_only' | 'auto_loan' | 'graduated_payment';
  principal: number;
  annualRate: number;
  rateType?: 'fixed' | 'variable';
  startDate: Date;
  termMonths: number;
  feeSetup?: number;
  feeMonthly?: number;
  insuranceMonthly?: number;
  balloonAmount?: number;
  fixedMonthlyPayment?: number;
}

export async function createLoan(data: CreateLoanData): Promise<{ loan: Loan }> {
  return apiFetch('/api/loans', {
    method: 'POST',
    body: JSON.stringify({
      householdId: data.householdId,
      name: data.name,
      lender: data.lender,
      loanType: data.loanType,
      principal: data.principal,
      annualRate: data.annualRate,
      rateType: data.rateType ?? 'fixed',
      dayCountConvention: '30E/360',
      startDate: data.startDate.toISOString(),
      termMonths: data.termMonths,
      feeSetup: data.feeSetup ?? 0,
      feeMonthly: data.feeMonthly ?? 0,
      insuranceMonthly: data.insuranceMonthly ?? 0,
      balloonAmount: data.balloonAmount,
      fixedMonthlyPayment: data.fixedMonthlyPayment,
    }),
  });
}

export async function payLoan(
  loanId: string,
  installmentId: string,
  amount: number,
  date: string
): Promise<{ success: boolean }> {
  return apiFetch(`/api/loans/${loanId}/pay`, {
    method: 'POST',
    body: JSON.stringify({ installmentId, amount, date }),
  });
}

/**
 * Mark single loan installment as paid
 */
export async function markLoanInstallmentPaid(
  loanId: string,
  installmentId: string
): Promise<{ success: boolean }> {
  return apiFetch(`/api/loans/${loanId}/installments/${installmentId}/mark-paid`, {
    method: 'POST',
  });
}

/**
 * Mark all pending/overdue installments as paid until specified date
 */
export async function markLoanPaidUntilToday(
  loanId: string,
  date: string
): Promise<{ success: boolean; count: number }> {
  return apiFetch(`/api/loans/${loanId}/mark-paid-until-today`, {
    method: 'POST',
    body: JSON.stringify({ date }),
  });
}

// ============================================
// EXPENSES API
// ============================================

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

// Cache for household data (5 min TTL) to prevent multiple simultaneous requests
let householdCache: { data: Household; timestamp: number } | null = null;
let pendingHouseholdRequest: Promise<Household> | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCurrentHousehold(): Promise<Household> {
  // Return cached data if still valid
  if (householdCache && Date.now() - householdCache.timestamp < CACHE_TTL) {
    return householdCache.data;
  }
  
  // If there's already a pending request, wait for it (deduplication)
  if (pendingHouseholdRequest) {
    return pendingHouseholdRequest;
  }
  
  // Create new request
  pendingHouseholdRequest = (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const { data, error } = await supabase
        .from('household_members')
        .select('household_id, role, households(*)')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no household found, fall back to API (which creates one)
        if (error.code === 'PGRST116') {
          const { household } = await apiFetch<{ household: Household }>('/api/households/current', {}, false);
          
          // Cache the result
          householdCache = { data: household, timestamp: Date.now() };
          return household;
        }
        throw error;
      }

      // Transform to expected format
      const household = data.households as unknown as Household;
      
      // Cache the result
      householdCache = { data: household, timestamp: Date.now() };
      
      return household;
    } finally {
      // Clear pending request
      pendingHouseholdRequest = null;
    }
  })();
  
  return pendingHouseholdRequest;
}

// Clear household cache (call on logout or household change)
export function clearHouseholdCache(): void {
  householdCache = null;
  pendingHouseholdRequest = null;
}

// ============================================
// DASHBOARD API
// ============================================

export async function getDashboardData(
  householdId: string,
  monthsCount: number = 12
): Promise<DashboardData> {
  return apiFetch<DashboardData>(
    `/api/dashboard?householdId=${householdId}&monthsCount=${monthsCount}`
  );
}

/**
 * 🚀 NOVÁ OPTIMALIZOVANÁ VERZIA: Načíta všetko naraz
 * Jeden request namiesto 3+
 */
export interface DashboardFullResponse {
  household: Household;
  dashboard: DashboardData;
  overdueCount: number;
  recentTransactions?: Array<{
    id: string;
    date: string;
    amount: number;
    merchant?: string;
  }>;
}

export async function getDashboardFull(
  monthsCount: number = 6,
  includeRecent: boolean = false
): Promise<DashboardFullResponse> {
  const params = new URLSearchParams({
    monthsCount: monthsCount.toString(),
  });
  
  if (includeRecent) {
    params.append('includeRecent', 'true');
  }
  
  return apiFetch<DashboardFullResponse>(
    `/api/dashboard-full?${params.toString()}`
  );
}

// ============================================
// RULES API
// ============================================

export async function getRules(householdId: string): Promise<Rule[]> {
  const { rules } = await apiFetch<{ rules: Rule[] }>(
    `/api/rules?householdId=${householdId}`
  );
  return rules;
}

export async function createRule(data: CreateRuleData): Promise<Rule> {
  const { rule } = await apiFetch<{ rule: Rule }>('/api/rules', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return rule;
}

export async function deleteRule(ruleId: string): Promise<void> {
  await apiFetch(`/api/rules/${ruleId}`, {
    method: 'DELETE',
  });
}

export async function updateRule(ruleId: string, data: Partial<CreateRuleData>): Promise<Rule> {
  const { rule } = await apiFetch<{ rule: Rule }>(`/api/rules/${ruleId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return rule;
}

// ============================================
// AUDIT LOG API
// ============================================

export async function getAuditLog(
  householdId: string,
  filters?: AuditLogFilters
): Promise<AuditLogEntry[]> {
  const params = new URLSearchParams({ householdId });
  
  if (filters?.entityType) params.append('entityType', filters.entityType);
  if (filters?.action) params.append('action', filters.action);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  
  const { logs } = await apiFetch<{ logs: AuditLogEntry[] }>(
    `/api/audit?${params.toString()}`
  );
  
  return logs || [];
}

// ============================================
// CATEGORY CRUD (extending existing)
// ============================================

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

export async function getSubscriptionStatus(householdId: string): Promise<SubscriptionStatus> {
  const response = await apiFetch<SubscriptionStatus | { subscription: SubscriptionStatus }>(
    `/api/subscription/status?householdId=${householdId}`
  );
  return 'plan' in response ? response : response.subscription;
}

// ============================================
// INCOME TEMPLATES (ASYNC STORAGE)
// ============================================

const TEMPLATES_STORAGE_KEY = 'income_templates';

export async function getIncomeTemplates(): Promise<IncomeTemplate[]> {
  try {
    const stored = await AsyncStorage.getItem(TEMPLATES_STORAGE_KEY);
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
  await AsyncStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  
  return newTemplate;
}

export async function deleteIncomeTemplate(templateId: string): Promise<void> {
  const templates = await getIncomeTemplates();
  const filtered = templates.filter((t) => t.id !== templateId);
  await AsyncStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(filtered));
}

export async function applyIncomeTemplate(template: IncomeTemplate, date: string): Promise<Income> {
  const household = await getCurrentHousehold();
  return createIncome({
    householdId: household.id,
    date,
    amount: template.amount,
    categoryId: template.category_id,
    source: template.source,
    note: template.note,
  }).then(r => r.income);
}

// ============================================
// ASSET MANAGEMENT - INSURANCES API
// ============================================

import type {
  Insurance,
  InsuranceStats,
  VehicleDocument,
  DocumentStats,
  ServiceRecord,
  Fine,
  FineStats,
  Insurer,
} from '@finapp/core';

export type { Insurance, InsuranceStats, VehicleDocument, DocumentStats, ServiceRecord, Fine, FineStats, Insurer };

export interface InsurancesResponse {
  data: Insurance[];
  stats: InsuranceStats;
}

export async function getInsurances(householdId: string): Promise<InsurancesResponse> {
  return apiFetch<InsurancesResponse>(`/api/insurances?householdId=${householdId}`);
}

export async function getInsurance(id: string): Promise<{ data: Insurance }> {
  return apiFetch(`/api/insurances/${id}`);
}

export async function createInsurance(data: Partial<Insurance>): Promise<{ data: Insurance }> {
  return apiFetch('/api/insurances', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateInsurance(id: string, data: Partial<Insurance>): Promise<{ data: Insurance }> {
  return apiFetch(`/api/insurances/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteInsurance(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/insurances/${id}`, { method: 'DELETE' });
}

// ============================================
// VEHICLE DOCUMENTS API (STK, EK, Vignettes)
// ============================================

export interface VehicleDocumentsResponse {
  data: VehicleDocument[];
  stats: DocumentStats;
}

export async function getVehicleDocuments(
  householdId: string, 
  documentType?: string
): Promise<VehicleDocumentsResponse> {
  const params = new URLSearchParams({ householdId });
  if (documentType) params.append('documentType', documentType);
  return apiFetch<VehicleDocumentsResponse>(`/api/vehicle-documents?${params.toString()}`);
}

export async function getVehicleDocument(id: string): Promise<{ data: VehicleDocument }> {
  return apiFetch(`/api/vehicle-documents/${id}`);
}

export async function createVehicleDocument(data: Partial<VehicleDocument>): Promise<{ data: VehicleDocument }> {
  return apiFetch('/api/vehicle-documents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateVehicleDocument(id: string, data: Partial<VehicleDocument>): Promise<{ data: VehicleDocument }> {
  return apiFetch(`/api/vehicle-documents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteVehicleDocument(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/vehicle-documents/${id}`, { method: 'DELETE' });
}

// ============================================
// SERVICE RECORDS API
// ============================================

export interface ServiceRecordsResponse {
  data: ServiceRecord[];
  stats: { total: number; totalCost: number };
}

export async function getServiceRecords(householdId: string, assetId?: string): Promise<ServiceRecordsResponse> {
  const params = new URLSearchParams({ householdId });
  if (assetId) params.append('assetId', assetId);
  return apiFetch<ServiceRecordsResponse>(`/api/service-records?${params.toString()}`);
}

export async function getServiceRecord(id: string): Promise<{ data: ServiceRecord }> {
  return apiFetch(`/api/service-records/${id}`);
}

export async function createServiceRecord(data: Partial<ServiceRecord>): Promise<{ data: ServiceRecord }> {
  return apiFetch('/api/service-records', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateServiceRecord(id: string, data: Partial<ServiceRecord>): Promise<{ data: ServiceRecord }> {
  return apiFetch(`/api/service-records/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteServiceRecord(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/service-records/${id}`, { method: 'DELETE' });
}

// ============================================
// FINES API
// ============================================

export interface FinesResponse {
  data: Fine[];
  stats: FineStats;
}

export async function getFines(householdId: string): Promise<FinesResponse> {
  return apiFetch<FinesResponse>(`/api/fines?householdId=${householdId}`);
}

export async function getFine(id: string): Promise<{ data: Fine }> {
  return apiFetch(`/api/fines/${id}`);
}

export async function createFine(data: Partial<Fine>): Promise<{ data: Fine }> {
  return apiFetch('/api/fines', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateFine(id: string, data: Partial<Fine>): Promise<{ data: Fine }> {
  return apiFetch(`/api/fines/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteFine(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/fines/${id}`, { method: 'DELETE' });
}

// ============================================
// INSURERS API
// ============================================

export async function getInsurers(householdId: string): Promise<{ data: Insurer[] }> {
  return apiFetch(`/api/insurers?householdId=${householdId}`);
}

export async function createInsurer(data: { householdId: string; name: string }): Promise<{ data: Insurer }> {
  return apiFetch('/api/insurers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================
// LOAN DOCUMENTS API
// ============================================

export interface LoanDocument {
  id: string;
  householdId: string;
  loanId: string;
  documentType: 'contract' | 'payment_schedule' | 'amendment' | 'other';
  name: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoanDocumentsResponse {
  documents: LoanDocument[];
}

export async function getLoanDocuments(loanId: string): Promise<LoanDocumentsResponse> {
  return apiFetch<LoanDocumentsResponse>(`/api/loans/${loanId}/documents`);
}

export async function getLoanDocument(loanId: string, docId: string): Promise<{ document: LoanDocument }> {
  return apiFetch<{ document: LoanDocument }>(`/api/loans/${loanId}/documents/${docId}`);
}

export interface CreateLoanDocumentData {
  document_type: 'contract' | 'payment_schedule' | 'amendment' | 'other';
  name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  notes?: string;
}

export async function createLoanDocument(
  loanId: string,
  data: CreateLoanDocumentData
): Promise<{ document: LoanDocument }> {
  return apiFetch<{ document: LoanDocument }>(`/api/loans/${loanId}/documents`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteLoanDocument(loanId: string, docId: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/loans/${loanId}/documents/${docId}`, { method: 'DELETE' });
}

// ============================================
// VEHICLES API
// ============================================

export interface Vehicle {
  id: string;
  householdId: string;
  name: string;
  make?: string;
  model?: string;
  year?: number;
  licensePlate?: string;
  vin?: string;
  registeredCompany?: string;
  fuelType?: string;
  mileage?: number;
  color?: string;
  bodyType?: string;
  engineCapacity?: number;
  enginePower?: number;
  transmission?: string;
  driveType?: string;
  seats?: number;
  doors?: number;
  acquisitionValue: number;
  currentValue: number;
  acquisitionDate: string;
  // Summary data
  loanCount: number;
  totalLoanPaid: number;
  totalLoanBalance: number;
  insuranceCount: number;
  activeInsuranceCount: number;
  totalInsuranceCost: number;
  nearestInsuranceExpiry?: string;
  documentCount: number;
  validDocumentCount: number;
  totalDocumentCost: number;
  stkExpiry?: string;
  ekExpiry?: string;
  serviceCount: number;
  totalServiceCost: number;
  lastServiceDate?: string;
  lastServiceKm?: number;
  fineCount: number;
  unpaidFineCount: number;
  totalFineAmount: number;
  unpaidFineAmount: number;
  totalCostOfOwnership: number;
  // Alerts
  stkExpiringSoon: boolean;
  ekExpiringSoon: boolean;
  insuranceExpiringSoon: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleStats {
  totalCount: number;
  totalValue: number;
  totalAcquisitionValue: number;
  expiringSoonCount: number;
  withActiveLoansCount: number;
  totalLoanBalance: number;
  totalTco: number;
}

export interface VehiclesResponse {
  data: Vehicle[];
  stats: VehicleStats;
  filters: {
    companies: string[];
    makes: string[];
    years: number[];
  };
}

export interface VehicleDetailResponse {
  data: Vehicle & {
    linkedItems: {
      loans: Array<{
        id: string;
        name?: string;
        lender: string;
        principal: number;
        currentBalance: number;
        monthlyPayment: number;
        status: string;
      }>;
      insurances: Array<{
        id: string;
        type: string;
        policyNumber: string;
        company?: string;
        validTo: string;
        price: number;
        filePaths?: string[];
        notes?: string;
        isActive: boolean;
      }>;
      documents: Array<{
        id: string;
        documentType: string;
        validFrom?: string;
        validTo: string;
        price?: number;
        filePaths?: string[];
        notes?: string;
        isValid: boolean;
      }>;
      serviceRecords: Array<{
        id: string;
        serviceDate: string;
        serviceType?: string;
        price?: number;
        kmState?: number;
        description?: string;
        filePaths?: string[];
        notes?: string;
      }>;
      fines: Array<{
        id: string;
        fineDate: string;
        fineAmount: number;
        isPaid: boolean;
        description?: string;
        filePaths?: string[];
        notes?: string;
      }>;
      loanDocuments?: Array<{
        id: string;
        loanId: string;
        documentType: string;
        name: string;
        filePath: string;
        fileSize?: number;
        mimeType?: string;
        notes?: string;
        createdAt?: string;
      }>;
      allFiles?: Array<{
        id: string;
        source: 'vehicle_document' | 'insurance' | 'service' | 'fine' | 'loan';
        sourceId: string;
        name: string;
        filePath: string;
        category: string;
        date?: string;
      }>;
    };
  };
}

export async function getVehicles(householdId: string): Promise<VehiclesResponse> {
  return apiFetch<VehiclesResponse>(`/api/vehicles?householdId=${householdId}`);
}

export async function getVehicle(id: string): Promise<VehicleDetailResponse> {
  return apiFetch<VehicleDetailResponse>(`/api/vehicles/${id}`);
}

export interface CreateVehicleData {
  householdId: string;
  name: string;
  acquisitionValue: number;
  currentValue: number;
  acquisitionDate: string;
  make?: string;
  model?: string;
  year?: number;
  licensePlate?: string;
  vin?: string;
  registeredCompany?: string;
  fuelType?: string;
  mileage?: number;
  color?: string;
  bodyType?: string;
  engineCapacity?: number;
  enginePower?: number;
  transmission?: string;
  driveType?: string;
  seats?: number;
  doors?: number;
}

export async function createVehicle(data: CreateVehicleData): Promise<{ data: Vehicle }> {
  return apiFetch('/api/vehicles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateVehicle(id: string, data: Partial<CreateVehicleData>): Promise<{ data: Vehicle }> {
  return apiFetch(`/api/vehicles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteVehicle(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/vehicles/${id}`, { method: 'DELETE' });
}

export interface LinkToVehicleData {
  loanIds?: string[];
  insuranceIds?: string[];
  documentIds?: string[];
  serviceRecordIds?: string[];
  fineIds?: string[];
}

export async function linkToVehicle(vehicleId: string, data: LinkToVehicleData): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/api/vehicles/${vehicleId}/link`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================
// FILE UPLOAD API
// ============================================

export interface UploadFileParams {
  uri: string;
  name: string;
  type: string;
  householdId: string;
  folder: string;
  recordId?: string;
}

export interface UploadFileResponse {
  success: boolean;
  data: {
    path: string;
    url: string;
    fullPath: string;
    size: number;
    type: string;
    name: string;
  };
}

/**
 * Upload file to Supabase Storage via API (with auth)
 */
export async function uploadFile(params: UploadFileParams): Promise<UploadFileResponse> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const formData = new FormData();
  formData.append('file', {
    uri: params.uri,
    type: params.type,
    name: params.name,
  } as unknown as Blob);
  formData.append('householdId', params.householdId);
  formData.append('folder', params.folder);
  if (params.recordId) {
    formData.append('recordId', params.recordId);
  }

  const response = await fetch(`${API_URL}/api/files/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      // Note: Don't set Content-Type for FormData - browser/RN sets it automatically with boundary
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ==========================================
// SIGNED URLs for private storage
// ==========================================

interface SignedUrlResponse {
  success: boolean;
  signedUrl: string;
  expiresIn: number;
}

/**
 * Get a signed URL for accessing private storage files
 * @param filePath The storage path (e.g., "household-id/vehicles/record-id/file.jpeg")
 * @param expiresIn Expiration time in seconds (default: 1 hour)
 */
export async function getSignedUrl(filePath: string, expiresIn = 3600): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/api/files/signed-url`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path: filePath, expiresIn }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to get signed URL' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data: SignedUrlResponse = await response.json();
  return data.signedUrl;
}
