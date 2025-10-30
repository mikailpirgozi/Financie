#!/usr/bin/env node

/**
 * Skript na vytvorenie households pre existujúcich používateľov
 * Použitie: node create-households.js
 */

const fs = require('fs');
const path = require('path');

// Použijem Supabase z apps/web/node_modules
const supabasePath = path.join(__dirname, 'apps', 'web', 'node_modules', '@supabase', 'supabase-js');
const { createClient } = require(supabasePath);

// Načítaj .env.local
const envPath = path.join(__dirname, 'apps', 'web', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Chýbajú environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  console.error('\nSkontroluj apps/web/.env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createHouseholdsForExistingUsers() {
  console.log('🔍 Hľadám používateľov bez household...\n');

  try {
    // Získaj všetkých používateľov
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      throw new Error(`Chyba pri načítaní používateľov: ${usersError.message}`);
    }

    console.log(`📊 Celkový počet používateľov: ${users.length}\n`);

    let created = 0;
    let skipped = 0;

    for (const user of users) {
      // Skontroluj, či používateľ má household
      const { data: membership } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .single();

      if (membership) {
        console.log(`⏭️  ${user.email} - už má household`);
        skipped++;
        continue;
      }

      console.log(`\n🔨 Vytváram household pre: ${user.email}`);

      const displayName = user.user_metadata?.display_name || user.email;

      // Vytvor alebo aktualizuj profil
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          display_name: displayName
        });

      if (profileError) {
        console.error(`   ❌ Chyba pri vytváraní profilu: ${profileError.message}`);
        continue;
      }

      // Vytvor household
      const { data: household, error: householdError } = await supabase
        .from('households')
        .insert({
          name: `${displayName}'s Household`
        })
        .select()
        .single();

      if (householdError) {
        console.error(`   ❌ Chyba pri vytváraní household: ${householdError.message}`);
        continue;
      }

      console.log(`   ✅ Household vytvorený: ${household.id}`);

      // Pridaj používateľa do household
      const { error: memberError } = await supabase
        .from('household_members')
        .insert({
          household_id: household.id,
          user_id: user.id,
          role: 'owner'
        });

      if (memberError) {
        console.error(`   ❌ Chyba pri pridávaní do household: ${memberError.message}`);
        continue;
      }

      // Vytvor default kategórie
      const categories = [
        { household_id: household.id, kind: 'expense', name: 'Potraviny' },
        { household_id: household.id, kind: 'expense', name: 'Bývanie' },
        { household_id: household.id, kind: 'expense', name: 'Doprava' },
        { household_id: household.id, kind: 'expense', name: 'Zdravie' },
        { household_id: household.id, kind: 'expense', name: 'Zábava' },
        { household_id: household.id, kind: 'income', name: 'Mzda' },
        { household_id: household.id, kind: 'income', name: 'Podnikanie' },
        { household_id: household.id, kind: 'income', name: 'Investície' },
      ];

      const { error: categoriesError } = await supabase
        .from('categories')
        .insert(categories);

      if (categoriesError) {
        console.error(`   ⚠️  Chyba pri vytváraní kategórií: ${categoriesError.message}`);
      } else {
        console.log(`   ✅ Vytvorených ${categories.length} kategórií`);
      }

      created++;
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Hotovo!`);
    console.log(`   Vytvorených households: ${created}`);
    console.log(`   Preskočených (už mali): ${skipped}`);
    console.log(`   Celkom: ${users.length}`);
    console.log('='.repeat(50) + '\n');

    // Zobraz prehľad
    console.log('📋 Prehľad používateľov:\n');
    const { data: overview } = await supabase
      .from('profiles')
      .select(`
        email,
        display_name,
        household_members!inner (
          role,
          households (
            name
          )
        )
      `);

    if (overview) {
      overview.forEach(user => {
        const household = user.household_members[0]?.households;
        console.log(`   ${user.email}`);
        console.log(`   └─ ${household?.name || 'Žiadna domácnosť'} (${user.household_members[0]?.role || 'N/A'})\n`);
      });
    }

  } catch (error) {
    console.error('\n❌ Kritická chyba:', error.message);
    process.exit(1);
  }
}

// Spusti
console.log('🚀 Spúšťam vytvorenie households...\n');
createHouseholdsForExistingUsers()
  .then(() => {
    console.log('✅ Skript dokončený úspešne!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Skript zlyhal:', error);
    process.exit(1);
  });

