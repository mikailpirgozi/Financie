/**
 * API Response Types
 * Shared types for API responses between web and mobile
 */

import type { LoanType, LoanStatus, CategoryKind } from './types';

// ============================================
// LOAN API TYPES
// ============================================

export interface ApiLoanNextInstallment {
  installment_no: number;
  due_date: string;
  total_due: string;
  principal_due: string;
  interest_due: string;
  days_until: number;
}

export interface ApiLoan {
  id: string;
  household_id: string;
  name?: string;
  lender: string;
  loan_type: LoanType;
  principal: number | string;
  annual_rate: number | string;
  rate: number | string; // Alias for annual_rate
  term_months: number;
  term: number; // Alias for term_months
  status: LoanStatus;
  amount_paid: number | string;
  remaining_balance: number | string;
  monthly_payment: number | string;
  start_date: string;
  end_date: string;
  next_payment_due_date: string | null;
  overdue_count?: number;
  created_at: string;
  // Extended metrics from loan_metrics view
  current_balance?: string;
  paid_count?: number;
  due_soon_count?: number;
  total_installments?: number;
  paid_amount?: string;
  paid_principal?: string;
  total_interest?: string;
  total_fees?: string;
  total_payment?: string;
  remaining_amount?: string;
  next_installment?: ApiLoanNextInstallment | null;
  // Additional fields
  fee_setup?: string;
  fee_monthly?: string;
  insurance_monthly?: string;
}

export interface ApiLoanSchedule {
  id: string;
  loan_id: string;
  installment_no: number;
  due_date: string;
  principal_due: string;
  interest_due: string;
  fees_due: string;
  total_due: string;
  principal_balance_after: string;
  status: 'pending' | 'paid' | 'overdue';
  paid_at: string | null;
}

// ============================================
// EXPENSE API TYPES
// ============================================

export interface ApiExpense {
  id: string;
  household_id: string;
  date: string;
  amount: number;
  category_id: string;
  merchant?: string;
  note?: string;
  created_at: string;
  // Extended properties from joins
  category?: ApiCategory;
}

export interface CreateExpenseData {
  householdId: string;
  date: string;
  amount: number;
  categoryId: string;
  merchant?: string;
  note?: string;
}

// ============================================
// INCOME API TYPES
// ============================================

export interface ApiIncome {
  id: string;
  household_id: string;
  date: string;
  amount: number;
  category_id: string;
  source?: string;
  note?: string;
  created_at: string;
  // Extended properties from joins
  category?: ApiCategory;
  is_recurring?: boolean;
}

export interface CreateIncomeData {
  householdId: string;
  date: string;
  amount: number;
  categoryId: string;
  source?: string;
  note?: string;
}

// ============================================
// CATEGORY API TYPES
// ============================================

export interface ApiCategory {
  id: string;
  household_id: string;
  kind: CategoryKind;
  name: string;
  parent_id?: string;
}

export interface CreateCategoryData {
  name: string;
  kind: CategoryKind;
  parent_id?: string;
  household_id: string;
}

// ============================================
// HOUSEHOLD API TYPES
// ============================================

export interface ApiHousehold {
  id: string;
  name: string;
  created_at: string;
}

// ============================================
// RULE API TYPES
// ============================================

export type MatchType = 'contains' | 'exact' | 'starts_with' | 'ends_with';
export type AppliesTo = 'expense' | 'income';

export interface ApiRule {
  id: string;
  household_id: string;
  match_type: MatchType;
  match_value: string;
  target_category_id: string;
  applies_to: AppliesTo;
  created_at: string;
  target_category?: ApiCategory;
}

export interface CreateRuleData {
  household_id: string;
  match_type: MatchType;
  match_value: string;
  target_category_id: string;
  applies_to: AppliesTo;
}

// ============================================
// AUDIT LOG API TYPES
// ============================================

export type AuditAction = 'create' | 'update' | 'delete';
export type AuditEntityType = 'expense' | 'income' | 'loan' | 'asset' | 'category' | 'vehicle';

export interface ApiAuditLogEntry {
  id: string;
  user_id: string;
  household_id: string;
  action: AuditAction;
  entity_type: AuditEntityType;
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

// ============================================
// SUBSCRIPTION API TYPES
// ============================================

export type SubscriptionPlan = 'free' | 'pro' | 'premium';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired';

export interface ApiSubscriptionStatus {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_start?: string;
  current_period_end?: string;
}

// ============================================
// INCOME TEMPLATE API TYPES
// ============================================

export interface ApiIncomeTemplate {
  id: string;
  name: string;
  amount: number;
  category_id: string;
  source?: string;
  note?: string;
  created_at: string;
}

// ============================================
// EARLY REPAYMENT API TYPES
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

// ============================================
// LOAN SIMULATION API TYPES
// ============================================

export interface SimulationParams {
  new_rate?: number;
  new_term?: number;
  extra_payment_monthly?: number;
}

export interface ApiSimulationResult {
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
