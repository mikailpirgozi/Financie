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

export async function getLoans(householdId: string) {
  const supabase = await createClient();

  // Get loans with computed fields from loan_metrics
  const { data: loans, error: loansError } = await supabase
    .from('loans')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (loansError) throw loansError;
  if (!loans) return [];

  // Get metrics for all loans
  // IMPORTANT: .in('loan_id', []) returns ALL records, not zero!
  let metrics = null;
  if (loans.length > 0) {
    const { data, error: metricsError } = await supabase
      .from('loan_metrics')
      .select('*')
      .in('loan_id', loans.map(l => l.id));

    if (metricsError) {
      console.warn('Failed to load loan_metrics:', metricsError);
    } else {
      metrics = data;
    }
  }

  // Get overdue counts for all active loans
  const overdueCounts = new Map<string, number>();
  if (loans.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    const { data: schedules } = await supabase
      .from('loan_schedules')
      .select('loan_id')
      .in('loan_id', loans.map(l => l.id))
      .in('status', ['pending', 'overdue'])
      .lt('due_date', today);
    
    if (schedules) {
      // Count overdue installments per loan
      schedules.forEach(schedule => {
        const count = overdueCounts.get(schedule.loan_id) || 0;
        overdueCounts.set(schedule.loan_id, count + 1);
      });
    }
  }

  // Get first installment for each loan to determine monthly_payment
  const monthlyPayments = new Map<string, number>();
  if (loans.length > 0) {
    const { data: firstInstallments } = await supabase
      .from('loan_schedules')
      .select('loan_id, total_due')
      .in('loan_id', loans.map(l => l.id))
      .eq('installment_no', 1);
    
    if (firstInstallments) {
      firstInstallments.forEach(installment => {
        monthlyPayments.set(installment.loan_id, Number(installment.total_due));
      });
    }
  }

  // Get next payment due date for each active loan
  const nextPayments = new Map<string, string>();
  if (loans.length > 0) {
    const { data: nextInstallments } = await supabase
      .from('loan_schedules')
      .select('loan_id, due_date')
      .in('loan_id', loans.map(l => l.id))
      .in('status', ['pending', 'overdue'])
      .order('due_date', { ascending: true });
    
    if (nextInstallments) {
      // Get the earliest due date for each loan
      nextInstallments.forEach(installment => {
        if (!nextPayments.has(installment.loan_id)) {
          nextPayments.set(installment.loan_id, installment.due_date);
        }
      });
    }
  }

  // Merge loans with metrics
  const loansWithMetrics = loans.map(loan => {
    const metric = metrics?.find(m => m.loan_id === loan.id);
    const overdueCount = overdueCounts.get(loan.id) || 0;
    const monthlyPayment = monthlyPayments.get(loan.id) || 0;
    const nextPaymentDueDate = nextPayments.get(loan.id);
    
    return {
      ...loan,
      // Add computed fields for mobile compatibility
      remaining_balance: metric?.current_balance ?? loan.principal,
      amount_paid: metric?.paid_principal ?? 0,
      monthly_payment: monthlyPayment,
      overdue_count: overdueCount,
      next_payment_due_date: nextPaymentDueDate,
      // Also include these for compatibility
      rate: loan.annual_rate,
      term: loan.term_months,
    };
  });

  return loansWithMetrics;
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

