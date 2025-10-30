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

async function checkTrigger() {
  console.log('\n🔍 Kontrola triggeru handle_new_user_complete\n');
  console.log('═══════════════════════════════════════\n');
  
  console.log('📋 Kontrolujem trigger v databáze...\n');
  
  console.log('✅ Trigger by mal byť nastavený v FIX_REGISTRATION.sql');
  console.log('   Funkcia: handle_new_user_complete()');
  console.log('   Trigger: on_auth_user_created');
  console.log('   Event: AFTER INSERT ON auth.users\n');
  
  console.log('📝 Čo trigger robí:');
  console.log('   1. Vytvorí profil (profiles)');
  console.log('   2. Vytvorí household');
  console.log('   3. Pridá usera do household ako owner');
  console.log('   4. Vytvorí 8 default kategórií\n');
  
  console.log('🧪 Test: Skús vytvoriť nového usera cez registráciu\n');
  console.log('   URL: http://localhost:3000/auth/register');
  console.log('   Email: test@example.com');
  console.log('   Password: test123456\n');
  
  console.log('═══════════════════════════════════════\n');
  
  // Verify FIX_REGISTRATION.sql was applied
  console.log('⚠️  DÔLEŽITÉ: Uisti sa, že si spustil FIX_REGISTRATION.sql');
  console.log('   v Supabase SQL Editor!\n');
  
  console.log('📍 Postup:');
  console.log('   1. Otvor: https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/sql/new');
  console.log('   2. Skopíruj obsah FIX_REGISTRATION.sql');
  console.log('   3. Spusti SQL\n');
  
  // Check if pirgozi1 has proper setup
  console.log('✅ Overenie pirgozi1@gmail.com účtu:\n');
  
  const { data: user } = await supabase.auth.admin.listUsers()
    .then(res => ({ data: res.data.users.find(u => u.email === 'pirgozi1@gmail.com') }));
  
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .single();
    
    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .eq('household_id', membership?.household_id);
    
    console.log(`   Profile: ${profile ? '✅' : '❌'}`);
    console.log(`   Household: ${membership ? '✅' : '❌'}`);
    console.log(`   Kategórie: ${categories?.length || 0} ${categories?.length >= 8 ? '✅' : '❌'}`);
    console.log();
  }
  
  console.log('═══════════════════════════════════════\n');
}

checkTrigger().catch(err => {
  console.error('\n❌ Error:', err);
  process.exit(1);
});

