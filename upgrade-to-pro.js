#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iusvjfqqxwmxbkwmfqnv.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
  console.log('Usage: SUPABASE_SERVICE_ROLE_KEY=your_key node upgrade-to-pro.js pirgozi@gmail.com pro');
  process.exit(1);
}

const email = process.argv[2];
const plan = process.argv[3] || 'pro'; // pro or premium

if (!email) {
  console.error('❌ Email is required');
  console.log('Usage: SUPABASE_SERVICE_ROLE_KEY=your_key node upgrade-to-pro.js pirgozi@gmail.com pro');
  process.exit(1);
}

if (!['free', 'pro', 'premium'].includes(plan)) {
  console.error('❌ Invalid plan. Must be: free, pro, or premium');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function upgradePlan() {
  console.log(`🔍 Looking for user: ${email}`);
  
  // Get user
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, subscription_plan')
    .eq('email', email)
    .single();
  
  if (profileError || !profile) {
    console.error('❌ User not found:', profileError?.message);
    return;
  }
  
  console.log(`📊 Current plan: ${profile.subscription_plan}`);
  
  // Get current loan count
  const { data: memberships } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', profile.id);
  
  if (memberships && memberships.length > 0) {
    const householdIds = memberships.map(m => m.household_id);
    const { count } = await supabase
      .from('loans')
      .select('id', { count: 'exact', head: true })
      .in('household_id', householdIds);
    
    console.log(`💰 Current loans: ${count}`);
  }
  
  // Update plan
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ subscription_plan: plan })
    .eq('id', profile.id);
  
  if (updateError) {
    console.error('❌ Failed to update plan:', updateError.message);
    return;
  }
  
  console.log(`✅ Successfully upgraded to ${plan.toUpperCase()} plan!`);
  console.log(`🎉 You now have unlimited loans!`);
}

upgradePlan();

