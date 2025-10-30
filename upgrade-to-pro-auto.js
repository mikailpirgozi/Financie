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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in apps/web/.env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function upgradeToPro() {
  const targetEmail = process.argv[2] || 'pirgozi1@gmail.com';
  const targetPlan = process.argv[3] || 'pro'; // or 'premium'
  
  console.log('🚀 Upgrading to PRO plan...\n');
  console.log(`📧 Email: ${targetEmail}`);
  console.log(`📦 Target plan: ${targetPlan.toUpperCase()}\n`);
  
  // 1. Get current profile
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, subscription_plan')
    .eq('email', targetEmail);
  
  if (profileError || !profiles || profiles.length === 0) {
    console.error('❌ User not found:', profileError?.message);
    
    // Try listing all profiles
    console.log('\n🔍 Available users:');
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('email, subscription_plan')
      .limit(10);
    
    if (allProfiles) {
      allProfiles.forEach(p => console.log(`   • ${p.email} (${p.subscription_plan})`));
    }
    console.log('\nUsage: node upgrade-to-pro-auto.js [email] [plan]');
    console.log('Example: node upgrade-to-pro-auto.js pirgozi1@gmail.com pro');
    process.exit(1);
  }
  
  const profile = profiles[0];
  
  console.log(`✅ Found user: ${profile.id}`);
  console.log(`📊 Current plan: ${profile.subscription_plan}\n`);
  
  // 2. Get current loan count
  const { data: memberships } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', profile.id);
  
  let currentLoans = 0;
  if (memberships && memberships.length > 0) {
    const householdIds = memberships.map(m => m.household_id);
    const { count } = await supabase
      .from('loans')
      .select('id', { count: 'exact', head: true })
      .in('household_id', householdIds);
    
    currentLoans = count || 0;
  }
  
  console.log(`💰 Current loans: ${currentLoans}`);
  console.log(`📏 Current limit: ${profile.subscription_plan === 'free' ? '5' : 'unlimited'}\n`);
  
  // 3. Upgrade plan
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      subscription_plan: targetPlan,
      updated_at: new Date().toISOString()
    })
    .eq('id', profile.id);
  
  if (updateError) {
    console.error('❌ Failed to upgrade:', updateError.message);
    process.exit(1);
  }
  
  // 4. Verify the change
  const { data: updated } = await supabase
    .from('profiles')
    .select('email, subscription_plan, updated_at')
    .eq('id', profile.id)
    .single();
  
  console.log('═══════════════════════════════════════');
  console.log('✅ SUCCESS! Upgrade complete!\n');
  console.log(`📧 Email: ${updated.email}`);
  console.log(`📦 New plan: ${updated.subscription_plan.toUpperCase()}`);
  console.log(`🕐 Updated: ${new Date(updated.updated_at).toLocaleString('sk-SK')}\n`);
  
  console.log('📊 New limits:');
  console.log('   • Loans: UNLIMITED ♾️');
  console.log('   • Members: UNLIMITED ♾️');
  console.log('   • Households: 3');
  console.log('   • Categories: UNLIMITED ♾️\n');
  
  console.log('🎉 You can now create unlimited loans!');
  console.log('💡 Refresh your browser and try creating a new loan.\n');
  console.log('═══════════════════════════════════════\n');
}

upgradeToPro().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

