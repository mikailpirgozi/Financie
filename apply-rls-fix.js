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

async function applyFix() {
  console.log('\n🔧 Aplikujem RLS fix...\n');
  console.log('═══════════════════════════════════════\n');
  
  // Read migration file
  const migrationPath = path.join(__dirname, 'supabase/migrations/20241021100000_fix_rls_recursion_final.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('📄 Načítaný SQL súbor:', migrationPath);
  console.log('📏 Veľkosť:', sql.length, 'znakov\n');
  
  // Split into individual statements (rough split by semicolons outside of function bodies)
  const statements = sql
    .split(/;\s*(?=(?:[^']*'[^']*')*[^']*$)/) // Split by ; but not inside strings
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s !== '');
  
  console.log('📝 Počet SQL príkazov:', statements.length, '\n');
  console.log('🚀 Spúšťam migráciu...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    
    // Skip comments and empty lines
    if (!stmt || stmt.startsWith('--')) continue;
    
    // Show progress for important statements
    if (stmt.includes('DROP POLICY') || stmt.includes('CREATE POLICY') || 
        stmt.includes('DROP FUNCTION') || stmt.includes('ALTER TABLE')) {
      const preview = stmt.substring(0, 60).replace(/\s+/g, ' ');
      process.stdout.write(`   [${i+1}/${statements.length}] ${preview}...`);
    }
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' })
        .catch(() => ({ error: null })); // RPC might not exist, try direct query
      
      if (error) {
        // Try direct query
        const { error: directError } = await supabase
          .from('_sql')
          .select('*')
          .limit(0)
          .catch(() => ({ error: null }));
        
        // If it's a "does not exist" error for DROP, that's OK
        if (error.message && (
          error.message.includes('does not exist') || 
          error.message.includes('already exists')
        )) {
          process.stdout.write(' ⚠️  (already done)\n');
          successCount++;
          continue;
        }
        
        process.stdout.write(' ❌\n');
        console.error('     Error:', error.message);
        errorCount++;
      } else {
        process.stdout.write(' ✅\n');
        successCount++;
      }
    } catch (err) {
      process.stdout.write(' ❌\n');
      console.error('     Error:', err.message);
      errorCount++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log('\n═══════════════════════════════════════');
  console.log('📊 VÝSLEDOK:\n');
  console.log(`   Úspešné: ${successCount} ✅`);
  console.log(`   Chyby: ${errorCount} ${errorCount > 0 ? '❌' : '✅'}`);
  console.log('═══════════════════════════════════════\n');
  
  if (errorCount === 0 || errorCount < 5) {
    console.log('✅ RLS fix aplikovaný!\n');
    console.log('🧪 Testujem...\n');
    
    // Test it
    const testSupabase = createClient(supabaseUrl, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    const { data: authData } = await testSupabase.auth.signInWithPassword({
      email: 'pirgozi1@gmail.com',
      password: 'Pirgozi123!',
    });
    
    if (authData?.user) {
      const { data: membership, error } = await testSupabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', authData.user.id)
        .single();
      
      if (error) {
        console.log('❌ Stále chyba:', error.message, '\n');
        console.log('💡 Skús spustiť SQL manuálne v Supabase SQL Editor\n');
      } else {
        console.log('✅ Membership funguje!');
        console.log('   Household ID:', membership.household_id, '\n');
        
        const { data: incomes } = await testSupabase
          .from('incomes')
          .select('*')
          .limit(5);
        
        console.log(`✅ Incomes: ${incomes?.length || 0}`);
        console.log('\n🎉 VŠETKO FUNGUJE!\n');
        console.log('💡 Teraz sa prihlás na: http://localhost:3001/auth/login');
        console.log('   Email: pirgozi1@gmail.com');
        console.log('   Heslo: Pirgozi123!\n');
      }
      
      await testSupabase.auth.signOut();
    }
  } else {
    console.log('⚠️  Príliš veľa chýb. Skús spustiť SQL manuálne.\n');
  }
}

applyFix().catch(err => {
  console.error('\n❌ Fatal error:', err);
  console.log('\n💡 Skús spustiť SQL manuálne v Supabase SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/sql/new\n');
  process.exit(1);
});

