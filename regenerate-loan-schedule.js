#!/usr/bin/env node

/**
 * Regenerate loan schedule for existing loan
 */

import { createClient } from '@supabase/supabase-js';
import { calculateLoan } from './packages/core/src/loan-engine/calculator.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function regenerateLoanSchedule(loanId) {
  console.log(`\n🔄 Regenerating schedule for loan ${loanId}...`);

  // Get loan
  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .select('*')
    .eq('id', loanId)
    .single();

  if (loanError || !loan) {
    console.error('❌ Loan not found:', loanError);
    return;
  }

  console.log(`📋 Loan: ${loan.lender}`);
  console.log(`   Principal: ${loan.principal} €`);
  console.log(`   Rate: ${loan.annual_rate}%`);
  console.log(`   Term: ${loan.term_months} months`);

  // Delete existing schedule
  const { error: deleteError } = await supabase
    .from('loan_schedules')
    .delete()
    .eq('loan_id', loanId);

  if (deleteError) {
    console.error('❌ Failed to delete old schedule:', deleteError);
    return;
  }

  console.log('✅ Deleted old schedule');

  // Calculate new schedule
  const schedule = calculateLoan({
    loanType: loan.loan_type,
    principal: Number(loan.principal),
    annualRate: Number(loan.annual_rate),
    termMonths: loan.term_months,
    startDate: new Date(loan.start_date),
    dayCountConvention: loan.day_count_convention,
    feeSetup: Number(loan.fee_setup || 0),
    feeMonthly: Number(loan.fee_monthly || 0),
    insuranceMonthly: Number(loan.insurance_monthly || 0),
    balloonAmount: loan.balloon_amount ? Number(loan.balloon_amount) : undefined,
  });

  console.log(`📊 Calculated ${schedule.schedule.length} installments`);
  console.log(`   Total interest: ${schedule.totalInterest.toFixed(2)} €`);
  console.log(`   Total payment: ${schedule.totalPayment.toFixed(2)} €`);

  // Insert new schedule
  const scheduleData = schedule.schedule.map((entry) => ({
    loan_id: loanId,
    installment_no: entry.installmentNo,
    due_date: entry.dueDate.toISOString().split('T')[0],
    principal_due: entry.principalDue,
    interest_due: entry.interestDue,
    fees_due: entry.feesDue,
    total_due: entry.totalDue,
    principal_balance_after: entry.principalBalanceAfter,
    status: entry.status,
  }));

  const { error: insertError } = await supabase
    .from('loan_schedules')
    .insert(scheduleData);

  if (insertError) {
    console.error('❌ Failed to insert schedule:', insertError);
    return;
  }

  console.log('✅ Schedule regenerated successfully!');
}

async function main() {
  // Get all loans for pirgozi1@gmail.com
  const { data: user } = await supabase.auth.admin.listUsers();
  const pirgoziUser = user?.users?.find((u) => u.email === 'pirgozi1@gmail.com');

  if (!pirgoziUser) {
    console.error('❌ User pirgozi1@gmail.com not found');
    process.exit(1);
  }

  console.log(`👤 User: ${pirgoziUser.email} (${pirgoziUser.id})`);

  // Get user's household
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', pirgoziUser.id)
    .single();

  if (!membership) {
    console.error('❌ No household found');
    process.exit(1);
  }

  // Get all loans
  const { data: loans, error: loansError } = await supabase
    .from('loans')
    .select('id, lender')
    .eq('household_id', membership.household_id);

  if (loansError || !loans || loans.length === 0) {
    console.error('❌ No loans found:', loansError);
    process.exit(1);
  }

  console.log(`\n📋 Found ${loans.length} loan(s):`);
  loans.forEach((loan) => {
    console.log(`   - ${loan.lender} (${loan.id})`);
  });

  // Regenerate schedule for each loan
  for (const loan of loans) {
    await regenerateLoanSchedule(loan.id);
  }

  console.log('\n✅ All done!');
}

main().catch(console.error);

