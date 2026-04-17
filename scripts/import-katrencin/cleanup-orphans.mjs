// Delete storage objects under documents/{household_id}/loans/{ORPHAN_LOAN_ID}/
// after the corresponding loan row was deleted.
//
// Required env vars (loaded from .env at repo root):
//   SUPABASE_URL, SUPABASE_ANON_KEY, KATRENCIN_CLIENT_PASSWORD
//
// Required CLI args:
//   --household=<uuid>            household id of the client
//   --loan=<uuid>[,<uuid>...]     orphan loan ids whose folders to wipe
//
// Example:
//   node cleanup-orphans.mjs --household=7412... --loan=f3f4e390-...,abcd-...

import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'node:url';
dotenvConfig({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const CLIENT_EMAIL = process.env.KATRENCIN_CLIENT_EMAIL ?? 'matus@allingroup.sk';
const CLIENT_PASSWORD = process.env.KATRENCIN_CLIENT_PASSWORD;
const STORAGE_BUCKET = process.env.STORAGE_BUCKET ?? 'documents';

for (const [k, v] of Object.entries({
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  KATRENCIN_CLIENT_PASSWORD: CLIENT_PASSWORD,
})) {
  if (!v) throw new Error(`Missing required env var: ${k}`);
}

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => a.replace(/^--/, '').split('=')),
);
const HOUSEHOLD_ID = args.household;
const ORPHAN_LOAN_IDS = (args.loan ?? '').split(',').filter(Boolean);

if (!HOUSEHOLD_ID || !ORPHAN_LOAN_IDS.length) {
  console.error('Usage: node cleanup-orphans.mjs --household=<uuid> --loan=<uuid>[,<uuid>...]');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
await supabase.auth.signInWithPassword({
  email: CLIENT_EMAIL,
  password: CLIENT_PASSWORD,
});

for (const loanId of ORPHAN_LOAN_IDS) {
  const prefix = `${HOUSEHOLD_ID}/loans/${loanId}`;
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(prefix);
  if (error) throw error;
  if (!data || !data.length) {
    console.log(`No files in ${prefix}`);
    continue;
  }
  const paths = data.map(f => `${prefix}/${f.name}`);
  const { error: delErr } = await supabase.storage.from(STORAGE_BUCKET).remove(paths);
  if (delErr) throw delErr;
  console.log(`Deleted ${paths.length} files under ${prefix}`);
}
