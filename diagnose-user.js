#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.join(__dirname, 'apps/web/.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function diagnose() {
  const targetEmail = 'pirgozi1@gmail.com';
  
  console.log(`🔍 Diagnostika pre: ${targetEmail}\n`);
  
  // 1. Auth user
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const user = authUsers.users.find(u => u.email === targetEmail);
  
  if (!user) {
    console.error('❌ User neexistuje v auth.users!');
    return;
  }
  
  console.log(`✅ Auth user: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Created: ${user.created_at}\n`);
  
  // 2. Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  console.log('📋 Profile:', profile ? '✅ Existuje' : '❌ Neexistuje');
  if (profile) {
    console.log(`   Display name: ${profile.display_name}`);
    console.log(`   Email: ${profile.email}\n`);
  }
  
  // 3. Household membership
  const { data: membership } = await supabase
    .from('household_members')
    .select('*, households(*)')
    .eq('user_id', user.id);
  
  console.log(`🏠 Household membership: ${membership?.length || 0}`);
  if (membership && membership.length > 0) {
    membership.forEach(m => {
      console.log(`   Household: ${m.households.name} (${m.household_id})`);
      console.log(`   Role: ${m.role}\n`);
    });
  } else {
    console.log('   ❌ User nie je v žiadnej domácnosti!\n');
    return;
  }
  
  const householdId = membership[0].household_id;
  
  // 4. Categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('household_id', householdId);
  
  console.log(`📂 Kategórie: ${categories?.length || 0}`);
  if (categories) {
    categories.forEach(c => {
      console.log(`   - ${c.name} (${c.kind})`);
    });
  }
  console.log();
  
  // 5. Incomes
  const { data: incomes, error: incomesError } = await supabase
    .from('incomes')
    .select('*')
    .eq('household_id', householdId);
  
  console.log(`💰 Príjmy: ${incomes?.length || 0}`);
  if (incomesError) {
    console.error('   Error:', incomesError);
  }
  if (incomes && incomes.length > 0) {
    incomes.forEach(i => {
      console.log(`   - ${i.source}: ${i.amount} (${i.date})`);
    });
  }
  console.log();
  
  // 6. Expenses
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('*')
    .eq('household_id', householdId);
  
  console.log(`💸 Výdavky: ${expenses?.length || 0}`);
  if (expensesError) {
    console.error('   Error:', expensesError);
  }
  if (expenses && expenses.length > 0) {
    expenses.forEach(e => {
      console.log(`   - ${e.merchant}: ${e.amount} (${e.date})`);
    });
  }
  console.log();
  
  // 7. Loans
  const { data: loans, error: loansError } = await supabase
    .from('loans')
    .select('*')
    .eq('household_id', householdId);
  
  console.log(`🏦 Úvery: ${loans?.length || 0}`);
  if (loansError) {
    console.error('   Error:', loansError);
  }
  if (loans && loans.length > 0) {
    loans.forEach(l => {
      console.log(`   - ${l.lender}: ${l.principal} @ ${l.annual_rate}%`);
    });
  }
  console.log();
  
  // 8. Test RLS - skúsime ako anon user
  console.log('🔒 Test RLS (ako anon user):');
  const anonSupabase = createClient(supabaseUrl, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  // Simulujeme prihlásenie
  const { data: session } = await anonSupabase.auth.signInWithPassword({
    email: targetEmail,
    password: 'test123' // Toto nebude fungovať, ale ukáže nám RLS
  });
  
  if (!session) {
    console.log('   ⚠️  Nemôžem sa prihlásiť (potrebuješ heslo)');
    console.log('   Skúsim priamo dotaz s RLS...\n');
  }
  
  // Test priameho dotazu (bez auth)
  const { data: testLoans, error: testError } = await anonSupabase
    .from('loans')
    .select('*')
    .eq('household_id', householdId);
  
  if (testError) {
    console.log('   ❌ RLS blokuje prístup (očakávané bez auth)');
    console.log(`   Error: ${testError.message}\n`);
  } else {
    console.log(`   ✅ Vrátilo ${testLoans?.length || 0} úverov\n`);
  }
  
  console.log('═══════════════════════════════════════');
  console.log('📊 SÚHRN:');
  console.log(`   User ID: ${user.id}`);
  console.log(`   Household ID: ${householdId}`);
  console.log(`   Kategórie: ${categories?.length || 0}`);
  console.log(`   Príjmy: ${incomes?.length || 0}`);
  console.log(`   Výdavky: ${expenses?.length || 0}`);
  console.log(`   Úvery: ${loans?.length || 0}`);
  console.log('═══════════════════════════════════════\n');
}

diagnose().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

