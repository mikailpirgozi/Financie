#!/usr/bin/env node

/**
 * Regenerate loan schedule via API endpoint
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Get all loans for pirgozi1@gmail.com
  const { data: user } = await supabase.auth.admin.listUsers();
  const pirgoziUser = user?.users?.find((u) => u.email === 'pirgozi1@gmail.com');

  if (!pirgoziUser) {
    console.error('❌ User pirgozi1@gmail.com not found');
    process.exit(1);
  }

  console.log(`👤 User: ${pirgoziUser.email} (${pirgoziUser.id})`);

  // Get user's household
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', pirgoziUser.id)
    .single();

  if (!membership) {
    console.error('❌ No household found');
    process.exit(1);
  }

  // Get all loans
  const { data: loans, error: loansError } = await supabase
    .from('loans')
    .select('id, lender')
    .eq('household_id', membership.household_id);

  if (loansError || !loans || loans.length === 0) {
    console.error('❌ No loans found:', loansError);
    process.exit(1);
  }

  console.log(`\n📋 Found ${loans.length} loan(s):`);
  loans.forEach((loan) => {
    console.log(`   - ${loan.lender} (${loan.id})`);
  });

  console.log('\n✅ Kalendár môžete regenerovať priamo v UI kliknutím na tlačidlo "Vygenerovať kalendár"');
  console.log('   alebo navštívte: http://localhost:3000/dashboard/loans/' + loans[0].id);
}

main().catch(console.error);

