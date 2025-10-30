#!/usr/bin/env node

/**
 * Jednoduchý skript na vytvorenie households pre existujúcich používateľov
 * Použitie: node create-households-simple.js
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
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Chýbajú environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createHouseholdsViaSQL() {
  console.log('🔍 Spúšťam SQL skript na vytvorenie households...\n');

  const sql = `
    DO $$
    DECLARE
      user_record RECORD;
      new_household_id UUID;
      user_display_name TEXT;
    BEGIN
      FOR user_record IN 
        SELECT u.id, u.email, u.raw_user_meta_data
        FROM auth.users u
        WHERE NOT EXISTS (
          SELECT 1 FROM public.household_members hm
          WHERE hm.user_id = u.id
        )
      LOOP
        user_display_name := COALESCE(
          user_record.raw_user_meta_data->>'display_name',
          user_record.email
        );
        
        INSERT INTO public.profiles (id, email, display_name)
        VALUES (user_record.id, user_record.email, user_display_name)
        ON CONFLICT (id) DO UPDATE
        SET 
          email = EXCLUDED.email,
          display_name = COALESCE(profiles.display_name, EXCLUDED.display_name);
        
        INSERT INTO public.households (name)
        VALUES (user_display_name || '''s Household')
        RETURNING id INTO new_household_id;
        
        INSERT INTO public.household_members (household_id, user_id, role)
        VALUES (new_household_id, user_record.id, 'owner');
        
        INSERT INTO public.categories (household_id, kind, name)
        VALUES
          (new_household_id, 'expense', 'Potraviny'),
          (new_household_id, 'expense', 'Bývanie'),
          (new_household_id, 'expense', 'Doprava'),
          (new_household_id, 'expense', 'Zdravie'),
          (new_household_id, 'expense', 'Zábava'),
          (new_household_id, 'income', 'Mzda'),
          (new_household_id, 'income', 'Podnikanie'),
          (new_household_id, 'income', 'Investície');
      END LOOP;
    END $$;
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { query: sql });
    
    if (error) {
      console.error('❌ Chyba:', error.message);
      console.log('\n📋 Skopíruj tento SQL a spusti ho v Supabase Dashboard > SQL Editor:\n');
      console.log(sql);
      console.log('\nAlebo použi súbor: CREATE_HOUSEHOLD_FOR_EXISTING_USERS.sql');
      return;
    }

    console.log('✅ Households vytvorené!');
  } catch (error) {
    console.error('❌ Chyba:', error.message);
    console.log('\n📋 Musíš spustiť SQL manuálne cez Supabase Dashboard:');
    console.log('   1. Otvor https://supabase.com/dashboard');
    console.log('   2. Vyber projekt');
    console.log('   3. Choď do SQL Editor');
    console.log('   4. Skopíruj obsah súboru: CREATE_HOUSEHOLD_FOR_EXISTING_USERS.sql');
    console.log('   5. Spusti query');
  }
}

createHouseholdsViaSQL();

