import { createClient } from '../supabase/server';
import { calculateLoan } from '@finapp/core';
import type { CreateLoanInput } from '@finapp/core';

export async function createLoan(input: CreateLoanInput) {
  const supabase = await createClient();

  // Verify user is member of household
  const { data: membership } = await supabase
    .from('household_members')
    .select('id')
    .eq('household_id', input.householdId)
    .single();

  if (!membership) {
    throw new Error('Not a member of this household');
  }

  // Create loan
  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .insert({
      household_id: input.householdId,
      name: input.name ?? null,
      lender: input.lender,
      loan_type: input.loanType,
      principal: input.principal,
      annual_rate: input.annualRate,
      rate_type: input.rateType,
      day_count_convention: input.dayCountConvention,
      start_date: input.startDate.toISOString().split('T')[0],
      term_months: input.termMonths,
      balloon_amount: input.balloonAmount ?? null,
      fee_setup: input.feeSetup ?? 0,
      fee_monthly: input.feeMonthly ?? 0,
      insurance_monthly: input.insuranceMonthly ?? 0,
      early_repayment_penalty_pct: input.earlyRepaymentPenaltyPct ?? 0,
      status: 'active',
    })
    .select()
    .single();

  if (loanError) throw loanError;
  if (!loan) throw new Error('Failed to create loan');

  // Calculate schedule
  const schedule = calculateLoan({
    loanType: input.loanType,
    principal: input.principal,
    annualRate: input.annualRate,
    termMonths: input.termMonths,
    startDate: input.startDate,
    dayCountConvention: input.dayCountConvention,
    feeSetup: input.feeSetup,
    feeMonthly: input.feeMonthly,
    insuranceMonthly: input.insuranceMonthly,
    balloonAmount: input.balloonAmount,
    fixedMonthlyPayment: input.fixedMonthlyPayment,
    fixedPrincipalPayment: input.fixedPrincipalPayment,
  });

  // Insert schedule
  const scheduleData = schedule.schedule.map((entry) => ({
    loan_id: loan.id,
    installment_no: entry.installmentNo,
    due_date: entry.dueDate.toISOString().split('T')[0],
    principal_due: entry.principalDue,
    interest_due: entry.interestDue,
    fees_due: entry.feesDue,
    total_due: entry.totalDue,
    principal_balance_after: entry.principalBalanceAfter,
    status: entry.status,
  }));

  const { error: scheduleError } = await supabase
    .from('loan_schedules')
    .insert(scheduleData);

  if (scheduleError) throw scheduleError;

  return { loan, schedule };
}

/** Loan with pre-computed metrics from loan_metrics materialized view */
export interface LoanWithMetrics {
  id: string;
  household_id: string;
  name: string | null;
  lender: string;
  loan_type: 'annuity' | 'fixed_principal' | 'interest_only';
  principal: string;
  annual_rate: string;
  rate_type: string;
  day_count_convention: string;
  start_date: string;
  term_months: number;
  balloon_amount: string | null;
  fee_setup: string;
  fee_monthly: string;
  insurance_monthly: string;
  early_repayment_penalty_pct: string;
  status: 'active' | 'paid_off' | 'defaulted';
  created_at: string;
  updated_at: string;
  // Computed metrics from loan_metrics view
  current_balance: string;
  paid_count: number;
  overdue_count: number;
  due_soon_count: number;
  total_installments: number;
  paid_amount: string;
  paid_principal: string;
  total_interest: string;
  total_fees: string;
  total_payment: string;
  remaining_amount: string;
  next_installment: {
    installment_no: number;
    due_date: string;
    total_due: string;
    principal_due: string;
    interest_due: string;
    days_until: number;
  } | null;
  // Compatibility aliases
  remaining_balance: string;
  amount_paid: string;
  monthly_payment: string;
  next_payment_due_date: string | null;
  rate: string;
  term: number;
}

/**
 * Get all loans for a household with pre-computed metrics.
 * Uses a single JOIN query with loan_metrics materialized view.
 * 
 * Performance: 1 query instead of 5, ~95% less data transfer
 */
export async function getLoans(householdId: string): Promise<LoanWithMetrics[]> {
  const supabase = await createClient();

  // Single optimized query: JOIN loans with loan_metrics
  const { data, error } = await supabase
    .rpc('get_loans_with_metrics', { p_household_id: householdId });

  if (error) {
    // Fallback to basic query if RPC doesn't exist yet
    console.warn('get_loans_with_metrics RPC not available, using fallback:', error.message);
    return getLoansLegacy(householdId);
  }

  if (!data) return [];

  // Map to consistent format
  return data.map((row: Record<string, unknown>) => {
    const nextInstallment = row.next_installment as LoanWithMetrics['next_installment'];
    
    return {
      // Base loan fields
      id: row.id as string,
      household_id: row.household_id as string,
      name: row.name as string | null,
      lender: row.lender as string,
      loan_type: row.loan_type as LoanWithMetrics['loan_type'],
      principal: String(row.principal),
      annual_rate: String(row.annual_rate),
      rate_type: row.rate_type as string,
      day_count_convention: row.day_count_convention as string,
      start_date: row.start_date as string,
      term_months: row.term_months as number,
      balloon_amount: row.balloon_amount ? String(row.balloon_amount) : null,
      fee_setup: String(row.fee_setup ?? '0'),
      fee_monthly: String(row.fee_monthly ?? '0'),
      insurance_monthly: String(row.insurance_monthly ?? '0'),
      early_repayment_penalty_pct: String(row.early_repayment_penalty_pct ?? '0'),
      status: row.status as LoanWithMetrics['status'],
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      // Metrics from materialized view
      current_balance: String(row.current_balance ?? row.principal),
      paid_count: Number(row.paid_count ?? 0),
      overdue_count: Number(row.overdue_count ?? 0),
      due_soon_count: Number(row.due_soon_count ?? 0),
      total_installments: Number(row.total_installments ?? 0),
      paid_amount: String(row.paid_amount ?? '0'),
      paid_principal: String(row.paid_principal ?? '0'),
      total_interest: String(row.total_interest ?? '0'),
      total_fees: String(row.total_fees ?? '0'),
      total_payment: String(row.total_payment ?? '0'),
      remaining_amount: String(row.remaining_amount ?? row.principal),
      next_installment: nextInstallment,
      // Compatibility aliases
      remaining_balance: String(row.current_balance ?? row.principal),
      amount_paid: String(row.paid_principal ?? '0'),
      monthly_payment: nextInstallment ? String(nextInstallment.total_due) : '0',
      next_payment_due_date: nextInstallment?.due_date ?? null,
      rate: String(row.annual_rate),
      term: row.term_months as number,
    };
  });
}

/**
 * Legacy fallback for getLoans - used when RPC is not available
 * @deprecated Use getLoans() which uses the optimized RPC
 */
async function getLoansLegacy(householdId: string): Promise<LoanWithMetrics[]> {
  const supabase = await createClient();

  // Get loans
  const { data: loans, error: loansError } = await supabase
    .from('loans')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (loansError) throw loansError;
  if (!loans || loans.length === 0) return [];

  // Get metrics in a single query
  const { data: metrics } = await supabase
    .from('loan_metrics')
    .select('*')
    .in('loan_id', loans.map(l => l.id));

  const metricsMap = new Map(metrics?.map(m => [m.loan_id, m]) ?? []);

  return loans.map(loan => {
    const metric = metricsMap.get(loan.id);
    const nextInstallment = metric?.next_installment as LoanWithMetrics['next_installment'];

    return {
      ...loan,
      principal: String(loan.principal),
      annual_rate: String(loan.annual_rate),
      balloon_amount: loan.balloon_amount ? String(loan.balloon_amount) : null,
      fee_setup: String(loan.fee_setup ?? '0'),
      fee_monthly: String(loan.fee_monthly ?? '0'),
      insurance_monthly: String(loan.insurance_monthly ?? '0'),
      early_repayment_penalty_pct: String(loan.early_repayment_penalty_pct ?? '0'),
      // Metrics
      current_balance: String(metric?.current_balance ?? loan.principal),
      paid_count: Number(metric?.paid_count ?? 0),
      overdue_count: Number(metric?.overdue_count ?? 0),
      due_soon_count: Number(metric?.due_soon_count ?? 0),
      total_installments: Number(metric?.total_installments ?? 0),
      paid_amount: String(metric?.paid_amount ?? '0'),
      paid_principal: String(metric?.paid_principal ?? '0'),
      total_interest: String(metric?.total_interest ?? '0'),
      total_fees: String(metric?.total_fees ?? '0'),
      total_payment: String(metric?.total_payment ?? '0'),
      remaining_amount: String(metric?.remaining_amount ?? loan.principal),
      next_installment: nextInstallment,
      // Compatibility
      remaining_balance: String(metric?.current_balance ?? loan.principal),
      amount_paid: String(metric?.paid_principal ?? '0'),
      monthly_payment: nextInstallment ? String(nextInstallment.total_due) : '0',
      next_payment_due_date: nextInstallment?.due_date ?? null,
      rate: String(loan.annual_rate),
      term: loan.term_months,
    };
  });
}

export async function getLoan(loanId: string) {
  const supabase = await createClient();

  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .select('*')
    .eq('id', loanId)
    .single();

  if (loanError) throw loanError;
  if (!loan) throw new Error('Loan not found');

  // Get schedule
  const { data: schedule, error: scheduleError } = await supabase
    .from('loan_schedules')
    .select('*')
    .eq('loan_id', loanId)
    .order('installment_no', { ascending: true });

  if (scheduleError) throw scheduleError;

  // Get metrics for computed fields
  const { data: metrics } = await supabase
    .from('loan_metrics')
    .select('*')
    .eq('loan_id', loanId)
    .single();

  // Calculate monthly payment from schedule
  const monthlyPayment = schedule && schedule.length > 0 
    ? Number(schedule[0]?.total_due ?? 0)
    : 0;

  // Add computed fields for mobile compatibility
  const loanWithMetrics = {
    ...loan,
    remaining_balance: metrics?.current_balance ?? loan.principal,
    amount_paid: metrics?.paid_principal ?? 0,
    monthly_payment: monthlyPayment,
    rate: loan.annual_rate,
    term: loan.term_months,
  };

  return { loan: loanWithMetrics, schedule: schedule ?? [] };
}

export async function payLoan(loanId: string, amount: number, date: Date) {
  const supabase = await createClient();

  // Get loan
  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .select('household_id')
    .eq('id', loanId)
    .single();

  if (loanError) throw loanError;
  if (!loan) throw new Error('Loan not found');

  // Get next unpaid installment
  const { data: installments, error: installmentsError } = await supabase
    .from('loan_schedules')
    .select('*')
    .eq('loan_id', loanId)
    .in('status', ['pending', 'overdue'])
    .order('installment_no', { ascending: true })
    .limit(1);

  if (installmentsError) throw installmentsError;
  if (!installments || installments.length === 0) {
    throw new Error('No pending installments');
  }

  const installment = installments[0];
  if (!installment) throw new Error('No installment found');

  // Check if payment covers installment
  if (amount < Number(installment.total_due)) {
    throw new Error('Payment amount is less than installment total');
  }

  // Mark installment as paid
  const { error: updateError } = await supabase
    .from('loan_schedules')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', installment.id);

  if (updateError) throw updateError;

  // Record payment
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      household_id: loan.household_id,
      loan_id: loanId,
      date: date.toISOString().split('T')[0],
      amount,
      meta: {
        principal: Number(installment.principal_due),
        interest: Number(installment.interest_due),
        fees: Number(installment.fees_due),
        installment_no: installment.installment_no,
      },
    })
    .select()
    .single();

  if (paymentError) throw paymentError;

  return { payment, installment };
}

export async function deleteLoan(loanId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('loans')
    .delete()
    .eq('id', loanId);

  if (error) throw error;
}

/** Summary statistics for all loans */
export interface LoansSummary {
  totalBalance: string;
  totalMonthlyPayment: string;
  totalPaid: string;
  totalOriginal: string;
  overdueCount: number;
  dueSoonCount: number;
  totalSplatene: number; // percentage
  nextPayment: {
    date: string;
    amount: string;
    lender: string;
    daysUntil: number;
  } | null;
  loanCount: number;
}

/**
 * Calculate summary statistics from loans with metrics.
 * This is done server-side to avoid client-side computation.
 */
export function calculateLoansSummary(loans: LoanWithMetrics[]): LoansSummary {
  let totalBalance = 0;
  let totalMonthlyPayment = 0;
  let totalPaid = 0;
  let totalOriginal = 0;
  let overdueCount = 0;
  let dueSoonCount = 0;
  
  type NextPaymentInfo = { date: string; amount: number; lender: string; daysUntil: number };
  let nextPayment: NextPaymentInfo | null = null;

  for (const loan of loans) {
    totalOriginal += Number(loan.principal);
    totalBalance += Number(loan.current_balance);
    totalPaid += Number(loan.paid_amount);
    overdueCount += loan.overdue_count;
    dueSoonCount += loan.due_soon_count;

    // Get monthly payment from next installment
    if (loan.next_installment) {
      totalMonthlyPayment += Number(loan.next_installment.total_due);
      
      // Find the nearest next payment across all loans
      if (!nextPayment || loan.next_installment.days_until < nextPayment.daysUntil) {
        nextPayment = {
          date: loan.next_installment.due_date,
          amount: Number(loan.next_installment.total_due),
          lender: loan.lender,
          daysUntil: loan.next_installment.days_until,
        };
      }
    }
  }

  // Calculate percentage splatene
  const totalSplatene = totalOriginal > 0 
    ? (totalPaid / (totalOriginal + totalPaid)) * 100 
    : 0;

  return {
    totalBalance: totalBalance.toFixed(2),
    totalMonthlyPayment: totalMonthlyPayment.toFixed(2),
    totalPaid: totalPaid.toFixed(2),
    totalOriginal: totalOriginal.toFixed(2),
    overdueCount,
    dueSoonCount,
    totalSplatene: Math.round(totalSplatene),
    nextPayment: nextPayment ? {
      date: nextPayment.date,
      amount: nextPayment.amount.toFixed(2),
      lender: nextPayment.lender,
      daysUntil: nextPayment.daysUntil,
    } : null,
    loanCount: loans.length,
  };
}

/**
 * Trigger a refresh of the loan_metrics materialized view.
 * Called on-demand when viewing the loans page.
 */
export async function refreshLoanMetrics(): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase.rpc('refresh_loan_metrics_safe');
  
  if (error) {
    console.warn('Failed to refresh loan_metrics:', error.message);
    // Don't throw - stale data is acceptable
  }
}

