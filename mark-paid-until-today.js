#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, 'apps/web/.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function markPaidUntilToday() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`Marking all installments until ${today} as paid...`);
    
    // Update all pending installments with due_date <= today
    const { data, error } = await supabase
      .from('loan_schedules')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString()
      })
      .eq('status', 'pending')
      .lte('due_date', today)
      .select();
    
    if (error) {
      console.error('Error:', error);
      process.exit(1);
    }
    
    console.log(`✅ Successfully marked ${data?.length || 0} installments as paid`);
    
    // Show summary
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select(`
        id,
        lender,
        loan_schedules (
          installment_no,
          due_date,
          status,
          total_due
        )
      `);
    
    if (!loansError && loans) {
      console.log('\n📊 Summary by loan:');
      loans.forEach(loan => {
        const paidCount = loan.loan_schedules.filter(s => s.status === 'paid').length;
        const totalCount = loan.loan_schedules.length;
        console.log(`  ${loan.lender}: ${paidCount}/${totalCount} installments paid`);
      });
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

markPaidUntilToday();

