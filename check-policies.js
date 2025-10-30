#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPolicies() {
  console.log('🔍 Checking RLS policies for household_members table...\n');
  
  const { data, error } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies
        WHERE tablename = 'household_members'
        ORDER BY policyname;
      `
    });
  
  if (error) {
    console.error('Error:', error);
    
    // Try alternative method
    console.log('\nTrying direct query...\n');
    
    const { data: policies, error: err2 } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'household_members');
    
    if (err2) {
      console.error('Also failed:', err2);
    } else {
      console.log('Policies:', JSON.stringify(policies, null, 2));
    }
  } else {
    console.log('Policies:', JSON.stringify(data, null, 2));
  }
}

checkPolicies();

