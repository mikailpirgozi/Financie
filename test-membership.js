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
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testMembership() {
  console.log('\n🔍 Test household membership pre pirgozi1@gmail.com\n');
  console.log('═══════════════════════════════════════\n');
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Sign in
  console.log('1️⃣ Prihlasovanie...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'pirgozi1@gmail.com',
    password: 'Pirgozi123!',
  });
  
  if (authError) {
    console.error('❌ Chyba pri prihlásení:', authError.message);
    console.log('\n💡 Skús sa prihlásiť manuálne na http://localhost:3001/auth/login');
    console.log('   a skontroluj heslo.\n');
    return;
  }
  
  console.log('✅ Prihlásený ako:', authData.user.email);
  console.log('   User ID:', authData.user.id, '\n');
  
  // Test household_members query
  console.log('2️⃣ Načítavam household membership...');
  const { data: membership, error: memberError } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', authData.user.id)
    .single();
  
  if (memberError) {
    console.error('❌ Chyba pri načítaní membership:', memberError);
    console.log('\n🔍 Debug info:');
    console.log('   Code:', memberError.code);
    console.log('   Message:', memberError.message);
    console.log('   Details:', memberError.details);
    console.log('   Hint:', memberError.hint, '\n');
    
    // Try without single()
    console.log('3️⃣ Skúšam bez .single()...');
    const { data: allMemberships, error: allError } = await supabase
      .from('household_members')
      .select('*')
      .eq('user_id', authData.user.id);
    
    if (allError) {
      console.error('❌ Stále chyba:', allError.message, '\n');
    } else {
      console.log('✅ Memberships:', allMemberships?.length || 0);
      if (allMemberships && allMemberships.length > 0) {
        allMemberships.forEach(m => {
          console.log(`   - Household: ${m.household_id}`);
          console.log(`     Role: ${m.role}`);
        });
      }
      console.log();
    }
  } else {
    console.log('✅ Membership nájdený!');
    console.log('   Household ID:', membership.household_id, '\n');
  }
  
  // Test RLS policies
  console.log('4️⃣ Test RLS policies...');
  
  // Test incomes
  const { data: incomes, error: incomesError } = await supabase
    .from('incomes')
    .select('*')
    .limit(5);
  
  console.log(`   Incomes: ${incomes?.length || 0} ${incomesError ? '❌' : '✅'}`);
  if (incomesError) console.log('     Error:', incomesError.message);
  
  // Test expenses
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('*')
    .limit(5);
  
  console.log(`   Expenses: ${expenses?.length || 0} ${expensesError ? '❌' : '✅'}`);
  if (expensesError) console.log('     Error:', expensesError.message);
  
  // Test loans
  const { data: loans, error: loansError } = await supabase
    .from('loans')
    .select('*')
    .limit(5);
  
  console.log(`   Loans: ${loans?.length || 0} ${loansError ? '❌' : '✅'}`);
  if (loansError) console.log('     Error:', loansError.message);
  
  console.log('\n═══════════════════════════════════════\n');
  
  await supabase.auth.signOut();
}

testMembership().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});

