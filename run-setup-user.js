#!/usr/bin/env node

/**
 * Skript na vytvorenie household a demo dát pre pirgozi1@gmail.com
 */

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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupUser() {
  const targetEmail = 'pirgozi1@gmail.com';
  
  console.log(`🔍 Setting up user: ${targetEmail}\n`);
  
  // 1. Nájdi usera v auth.users pomocou admin API
  let userId;
  
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('❌ Error fetching users from auth:', authError);
    process.exit(1);
  }
  
  const user = authUsers.users.find(u => u.email === targetEmail);
  
  if (!user) {
    console.error('❌ User not found in auth.users');
    console.error(`   Please register ${targetEmail} in the app first.`);
    console.error('   Visit: https://your-app-url.vercel.app/auth/register');
    process.exit(1);
  }
  
  userId = user.id;
  console.log(`✅ Found user: ${targetEmail} (${userId})\n`);
  
  // 2. Vytvor/aktualizuj profil
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: targetEmail,
      display_name: 'Mikail'
    }, { onConflict: 'id' });
  
  if (profileError) {
    console.error('⚠️  Warning creating profile:', profileError);
  } else {
    console.log(`✅ Profile created/updated\n`);
  }
  
  // 3. Skontroluj household
  const { data: existingHousehold } = await supabase
    .from('household_members')
    .select('household_id, households(name)')
    .eq('user_id', userId)
    .limit(1)
    .single();
  
  let householdId;
  
  if (existingHousehold) {
    householdId = existingHousehold.household_id;
    console.log(`✅ User already has household: ${householdId}\n`);
  } else {
    // Vytvor household
    const { data: newHousehold, error: householdError } = await supabase
      .from('households')
      .insert({ name: "Mikail's Household" })
      .select()
      .single();
    
    if (householdError) {
      console.error('❌ Error creating household:', householdError);
      process.exit(1);
    }
    
    householdId = newHousehold.id;
    console.log(`✅ Created household: ${householdId}`);
    
    // Pridaj usera do household
    const { error: memberError } = await supabase
      .from('household_members')
      .insert({ household_id: householdId, user_id: userId, role: 'owner' });
    
    if (memberError) {
      console.error('❌ Error adding user to household:', memberError);
      process.exit(1);
    }
    
    console.log(`✅ Added user as owner\n`);
  }
  
  // 3. Vytvor kategórie
  const categories = [
    { kind: 'expense', name: 'Potraviny' },
    { kind: 'expense', name: 'Bývanie' },
    { kind: 'expense', name: 'Doprava' },
    { kind: 'expense', name: 'Zdravie' },
    { kind: 'expense', name: 'Zábava' },
    { kind: 'expense', name: 'Oblečenie' },
    { kind: 'income', name: 'Mzda' },
    { kind: 'income', name: 'Podnikanie' },
    { kind: 'income', name: 'Investície' }
  ];
  
  for (const cat of categories) {
    const { error } = await supabase
      .from('categories')
      .upsert({ household_id: householdId, ...cat }, { onConflict: 'household_id,name' });
    
    if (error && error.code !== '23505') { // Ignore duplicate errors
      console.error(`⚠️  Warning creating category ${cat.name}:`, error);
    }
  }
  
  console.log(`✅ Created ${categories.length} categories\n`);
  
  // 4. Získaj ID kategórií
  const { data: cats } = await supabase
    .from('categories')
    .select('id, name')
    .eq('household_id', householdId);
  
  const catMap = {};
  cats.forEach(c => { catMap[c.name] = c.id; });
  
  // 5. Pridaj demo príjmy
  const today = new Date();
  const incomes = [
    { 
      household_id: householdId, 
      category_id: catMap['Mzda'], 
      amount: '2500.00', 
      source: 'Mesačná mzda - október', 
      note: 'Demo príjem',
      date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    { 
      household_id: householdId, 
      category_id: catMap['Mzda'], 
      amount: '2500.00', 
      source: 'Mesačná mzda - september', 
      note: 'Demo príjem',
      date: new Date(today.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    { 
      household_id: householdId, 
      category_id: catMap['Mzda'], 
      amount: '2500.00', 
      source: 'Mesačná mzda - august', 
      note: 'Demo príjem',
      date: new Date(today.getTime() - 65 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    { 
      household_id: householdId, 
      category_id: catMap['Podnikanie'], 
      amount: '450.00', 
      source: 'Freelance projekt', 
      note: 'Demo príjem',
      date: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  ];
  
  const { error: incomeError } = await supabase
    .from('incomes')
    .insert(incomes);
  
  if (incomeError && incomeError.code !== '23505') {
    console.error('⚠️  Warning creating incomes:', incomeError);
  } else {
    console.log(`✅ Created ${incomes.length} demo incomes`);
  }
  
  // 6. Pridaj demo výdavky
  const expenses = [
    { household_id: householdId, category_id: catMap['Potraviny'], amount: '85.50', merchant: 'Tesco', note: 'Týždenný nákup', date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    { household_id: householdId, category_id: catMap['Potraviny'], amount: '42.30', merchant: 'Kaufland', note: 'Doplnenie', date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    { household_id: householdId, category_id: catMap['Potraviny'], amount: '78.90', merchant: 'Billa', note: 'Nákup', date: new Date(today.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    { household_id: householdId, category_id: catMap['Potraviny'], amount: '95.20', merchant: 'Tesco', note: 'Týždenný nákup', date: new Date(today.getTime() - 16 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    { household_id: householdId, category_id: catMap['Potraviny'], amount: '38.50', merchant: 'Lidl', note: 'Ovocie a zelenina', date: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    { household_id: householdId, category_id: catMap['Bývanie'], amount: '650.00', merchant: 'Prenajímateľ', note: 'Nájom za október', date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    { household_id: householdId, category_id: catMap['Bývanie'], amount: '120.00', merchant: 'SPP/ZSE', note: 'Elektrina a plyn', date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    { household_id: householdId, category_id: catMap['Bývanie'], amount: '45.00', merchant: 'Telekom', note: 'Internet a TV', date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    { household_id: householdId, category_id: catMap['Doprava'], amount: '65.00', merchant: 'Shell', note: 'Tankovanie', date: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    { household_id: householdId, category_id: catMap['Doprava'], amount: '58.00', merchant: 'OMV', note: 'Tankovanie', date: new Date(today.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    { household_id: householdId, category_id: catMap['Doprava'], amount: '25.00', merchant: 'Parkovisko', note: 'Parkovné centrum', date: new Date(today.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
  ];
  
  const { error: expenseError } = await supabase
    .from('expenses')
    .insert(expenses);
  
  if (expenseError && expenseError.code !== '23505') {
    console.error('⚠️  Warning creating expenses:', expenseError);
  } else {
    console.log(`✅ Created ${expenses.length} demo expenses`);
  }
  
  // 7. Pridaj demo úver
  const { error: loanError } = await supabase
    .from('loans')
    .insert({
      household_id: householdId,
      lender: 'Slovenská sporiteľňa',
      loan_type: 'annuity',
      principal: '150000.00',
      annual_rate: 3.5,
      rate_type: 'fixed',
      day_count_convention: '30E/360',
      start_date: '2023-01-01',
      term_months: 360,
      status: 'active'
    });
  
  if (loanError && loanError.code !== '23505') {
    console.error('⚠️  Warning creating loan:', loanError);
  } else {
    console.log(`✅ Created demo loan (hypotéka)\n`);
  }
  
  // 8. Overiť výsledok
  const { data: summary } = await supabase
    .from('household_members')
    .select(`
      household_id,
      role,
      households(name),
      profiles(email, display_name)
    `)
    .eq('user_id', userId)
    .single();
  
  console.log('📊 Summary:');
  console.log(`   Email: ${summary.profiles.email}`);
  console.log(`   Household: ${summary.households.name}`);
  console.log(`   Role: ${summary.role}`);
  console.log(`   Incomes: ${incomes.length}`);
  console.log(`   Expenses: ${expenses.length}`);
  console.log(`   Loans: 1`);
  console.log('\n✅ Setup complete! User can now login and see demo data.');
}

setupUser().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

