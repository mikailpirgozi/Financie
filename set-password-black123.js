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

async function setPassword() {
  const targetEmail = 'pirgozi1@gmail.com';
  const newPassword = 'Black123';
  
  console.log('\n🔐 Nastavujem heslo na: Black123\n');
  
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const user = authUsers.users.find(u => u.email === targetEmail);
  
  if (!user) {
    console.error('❌ User neexistuje!');
    return;
  }
  
  const { error } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: newPassword }
  );
  
  if (error) {
    console.error('❌ Chyba:', error.message);
    return;
  }
  
  console.log('✅ Heslo zmenené!\n');
  console.log('═══════════════════════════════════════');
  console.log('📋 Prihlasovacie údaje:\n');
  console.log(`   Email: ${targetEmail}`);
  console.log(`   Heslo: ${newPassword}`);
  console.log('\n   URL: http://localhost:3001/auth/login');
  console.log('═══════════════════════════════════════\n');
}

setPassword().catch(err => {
  console.error('\n❌ Error:', err);
  process.exit(1);
});

