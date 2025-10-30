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

async function diagnoseAndFix() {
  const targetEmail = 'pirgozi1@gmail.com';
  
  console.log(`\n🔍 Diagnostika a oprava pre: ${targetEmail}\n`);
  console.log('═══════════════════════════════════════\n');
  
  // 1. Auth user
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const user = authUsers.users.find(u => u.email === targetEmail);
  
  if (!user) {
    console.error('❌ User neexistuje v auth.users!');
    console.log('\n💡 Riešenie: Zaregistruj sa na /auth/register\n');
    return;
  }
  
  console.log(`✅ Auth user existuje`);
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Created: ${user.created_at}\n`);
  
  // 2. Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (!profile) {
    console.log('⚠️  Profile neexistuje - vytváram...');
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        display_name: 'Mikail'
      });
    
    if (profileError) {
      console.error('❌ Chyba pri vytváraní profilu:', profileError);
      return;
    }
    console.log('✅ Profile vytvorený\n');
  } else {
    console.log('✅ Profile existuje');
    console.log(`   Display name: ${profile.display_name}\n`);
  }
  
  // 3. Household membership
  const { data: membership } = await supabase
    .from('household_members')
    .select('*, households(*)')
    .eq('user_id', user.id);
  
  let householdId;
  
  if (!membership || membership.length === 0) {
    console.log('⚠️  Household neexistuje - vytváram...');
    
    // Vytvor household
    const { data: newHousehold, error: householdError } = await supabase
      .from('households')
      .insert({ name: 'Mikail\'s Household' })
      .select()
      .single();
    
    if (householdError) {
      console.error('❌ Chyba pri vytváraní household:', householdError);
      return;
    }
    
    householdId = newHousehold.id;
    console.log(`✅ Household vytvorený: ${householdId}`);
    
    // Pridaj usera do household
    const { error: memberError } = await supabase
      .from('household_members')
      .insert({
        household_id: householdId,
        user_id: user.id,
        role: 'owner'
      });
    
    if (memberError) {
      console.error('❌ Chyba pri pridávaní do household:', memberError);
      return;
    }
    console.log('✅ User pridaný ako owner\n');
  } else {
    householdId = membership[0].household_id;
    console.log(`✅ Household existuje: ${membership[0].households.name}`);
    console.log(`   ID: ${householdId}`);
    console.log(`   Role: ${membership[0].role}\n`);
  }
  
  // 4. Categories
  const { data: existingCategories } = await supabase
    .from('categories')
    .select('*')
    .eq('household_id', householdId);
  
  if (!existingCategories || existingCategories.length === 0) {
    console.log('⚠️  Kategórie neexistujú - vytváram...');
    
    const categories = [
      { household_id: householdId, kind: 'expense', name: 'Potraviny' },
      { household_id: householdId, kind: 'expense', name: 'Bývanie' },
      { household_id: householdId, kind: 'expense', name: 'Doprava' },
      { household_id: householdId, kind: 'expense', name: 'Zdravie' },
      { household_id: householdId, kind: 'expense', name: 'Zábava' },
      { household_id: householdId, kind: 'expense', name: 'Oblečenie' },
      { household_id: householdId, kind: 'income', name: 'Mzda' },
      { household_id: householdId, kind: 'income', name: 'Podnikanie' },
      { household_id: householdId, kind: 'income', name: 'Investície' },
    ];
    
    const { error: catError } = await supabase
      .from('categories')
      .insert(categories);
    
    if (catError) {
      console.error('❌ Chyba pri vytváraní kategórií:', catError);
      return;
    }
    console.log('✅ Kategórie vytvorené (9)\n');
  } else {
    console.log(`✅ Kategórie existujú (${existingCategories.length})`);
    existingCategories.forEach(c => {
      console.log(`   - ${c.name} (${c.kind})`);
    });
    console.log();
  }
  
  // 5. Demo data - Incomes
  const { data: existingIncomes } = await supabase
    .from('incomes')
    .select('*')
    .eq('household_id', householdId);
  
  if (!existingIncomes || existingIncomes.length === 0) {
    console.log('⚠️  Príjmy neexistujú - vytváram demo data...');
    
    // Získaj kategórie
    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .eq('household_id', householdId);
    
    const salaryCategory = categories.find(c => c.name === 'Mzda');
    const businessCategory = categories.find(c => c.name === 'Podnikanie');
    
    if (salaryCategory && businessCategory) {
      const today = new Date();
      const incomes = [
        {
          household_id: householdId,
          category_id: salaryCategory.id,
          amount: 2500.00,
          source: 'Mzda',
          note: 'Mesačná mzda - október',
          date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        {
          household_id: householdId,
          category_id: salaryCategory.id,
          amount: 2500.00,
          source: 'Mzda',
          note: 'Mesačná mzda - september',
          date: new Date(today.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        {
          household_id: householdId,
          category_id: salaryCategory.id,
          amount: 2500.00,
          source: 'Mzda',
          note: 'Mesačná mzda - august',
          date: new Date(today.getTime() - 65 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        {
          household_id: householdId,
          category_id: businessCategory.id,
          amount: 450.00,
          source: 'Freelance',
          note: 'Freelance projekt',
          date: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      ];
      
      const { error: incomeError } = await supabase
        .from('incomes')
        .insert(incomes);
      
      if (incomeError) {
        console.error('❌ Chyba pri vytváraní príjmov:', incomeError);
      } else {
        console.log('✅ Demo príjmy vytvorené (4)\n');
      }
    }
  } else {
    console.log(`✅ Príjmy existujú (${existingIncomes.length})\n`);
  }
  
  // 6. Demo data - Expenses
  const { data: existingExpenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('household_id', householdId);
  
  if (!existingExpenses || existingExpenses.length === 0) {
    console.log('⚠️  Výdavky neexistujú - vytváram demo data...');
    
    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .eq('household_id', householdId);
    
    const foodCategory = categories.find(c => c.name === 'Potraviny');
    const housingCategory = categories.find(c => c.name === 'Bývanie');
    const transportCategory = categories.find(c => c.name === 'Doprava');
    
    if (foodCategory && housingCategory && transportCategory) {
      const today = new Date();
      const expenses = [
        // Potraviny
        { household_id: householdId, category_id: foodCategory.id, amount: 85.50, merchant: 'Tesco', note: 'Týždenný nákup', date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        { household_id: householdId, category_id: foodCategory.id, amount: 42.30, merchant: 'Kaufland', note: 'Doplnenie', date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        { household_id: householdId, category_id: foodCategory.id, amount: 78.90, merchant: 'Billa', note: 'Nákup', date: new Date(today.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        { household_id: householdId, category_id: foodCategory.id, amount: 95.20, merchant: 'Tesco', note: 'Týždenný nákup', date: new Date(today.getTime() - 16 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        { household_id: householdId, category_id: foodCategory.id, amount: 38.50, merchant: 'Lidl', note: 'Ovocie a zelenina', date: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        
        // Bývanie
        { household_id: householdId, category_id: housingCategory.id, amount: 650.00, merchant: 'Prenajímateľ', note: 'Nájom za október', date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        { household_id: householdId, category_id: housingCategory.id, amount: 120.00, merchant: 'ZSE', note: 'Elektrina a plyn', date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        { household_id: housingCategory, category_id: housingCategory.id, amount: 45.00, merchant: 'Orange', note: 'Internet a TV', date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        
        // Doprava
        { household_id: householdId, category_id: transportCategory.id, amount: 65.00, merchant: 'Shell', note: 'Tankovanie', date: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        { household_id: householdId, category_id: transportCategory.id, amount: 58.00, merchant: 'OMV', note: 'Tankovanie', date: new Date(today.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        { household_id: householdId, category_id: transportCategory.id, amount: 25.00, merchant: 'Parkovisko', note: 'Parkovné - centrum', date: new Date(today.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
      ];
      
      const { error: expenseError } = await supabase
        .from('expenses')
        .insert(expenses);
      
      if (expenseError) {
        console.error('❌ Chyba pri vytváraní výdavkov:', expenseError);
      } else {
        console.log('✅ Demo výdavky vytvorené (11)\n');
      }
    }
  } else {
    console.log(`✅ Výdavky existujú (${existingExpenses.length})\n`);
  }
  
  // 7. Demo data - Loans
  const { data: existingLoans } = await supabase
    .from('loans')
    .select('*')
    .eq('household_id', householdId);
  
  if (!existingLoans || existingLoans.length === 0) {
    console.log('⚠️  Úvery neexistujú - vytváram demo úver...');
    
    const loan = {
      household_id: householdId,
      lender: 'Slovenská sporiteľňa',
      loan_type: 'annuity',
      principal: 150000.00,
      annual_rate: 3.5,
      rate_type: 'fixed',
      day_count_convention: '30E/360',
      start_date: '2023-01-01',
      term_months: 360,
      status: 'active'
    };
    
    const { error: loanError } = await supabase
      .from('loans')
      .insert(loan);
    
    if (loanError) {
      console.error('❌ Chyba pri vytváraní úveru:', loanError);
    } else {
      console.log('✅ Demo úver vytvorený (hypotéka 150 000 €)\n');
    }
  } else {
    console.log(`✅ Úvery existujú (${existingLoans.length})\n`);
  }
  
  // Final summary
  console.log('═══════════════════════════════════════');
  console.log('📊 FINÁLNY STAV:\n');
  
  const { data: finalIncomes } = await supabase
    .from('incomes')
    .select('*')
    .eq('household_id', householdId);
  
  const { data: finalExpenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('household_id', householdId);
  
  const { data: finalLoans } = await supabase
    .from('loans')
    .select('*')
    .eq('household_id', householdId);
  
  const { data: finalCategories } = await supabase
    .from('categories')
    .select('*')
    .eq('household_id', householdId);
  
  console.log(`   User ID: ${user.id}`);
  console.log(`   Household ID: ${householdId}`);
  console.log(`   Kategórie: ${finalCategories?.length || 0}`);
  console.log(`   Príjmy: ${finalIncomes?.length || 0}`);
  console.log(`   Výdavky: ${finalExpenses?.length || 0}`);
  console.log(`   Úvery: ${finalLoans?.length || 0}`);
  console.log('═══════════════════════════════════════\n');
  
  if (finalIncomes?.length > 0 && finalExpenses?.length > 0 && finalCategories?.length > 0) {
    console.log('✅ HOTOVO! Účet je plne funkčný.\n');
    console.log('💡 Môžeš sa prihlásiť na: http://localhost:3000/auth/login');
    console.log('   Email: pirgozi1@gmail.com\n');
  } else {
    console.log('⚠️  Niektoré dáta chýbajú. Skontroluj chyby vyššie.\n');
  }
}

diagnoseAndFix().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});

