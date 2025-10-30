#!/usr/bin/env node

/**
 * Automatické spustenie migrácií cez Supabase Management API
 */

const fs = require('fs');
const path = require('path');

// Načítaj SQL súbor
const sqlFile = path.join(__dirname, 'ALL_MIGRATIONS.sql');
const sql = fs.readFileSync(sqlFile, 'utf-8');

// Supabase projekt details
const PROJECT_REF = 'agccohbrvpjknlhltqzc';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnY2NvaGJydnBqa25saGx0cXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NTY2NSwiZXhwIjoyMDc2NTcxNjY1fQ.M4RS5G9jLArClhQtNXT5WMW22d-fQlu33WJKktSSJxM';

console.log('🚀 Spúšťam migrácie...\n');
console.log(`📊 Projekt: ${PROJECT_REF}`);
console.log(`📄 SQL súbor: ${sqlFile}`);
console.log(`📏 Veľkosť: ${(sql.length / 1024).toFixed(2)} KB\n`);

// Rozdeľ SQL na jednotlivé príkazy
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`📝 Počet SQL príkazov: ${statements.length}\n`);

// Funkcia na spustenie SQL cez Supabase REST API
async function executeSql(statement, index) {
  const url = `https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec_sql`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: statement }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    return { success: true, index };
  } catch (error) {
    return { success: false, index, error: error.message };
  }
}

// Alternatívny prístup: použiť postgres REST endpoint
async function executeViaPgRest(sqlContent) {
  const url = `https://${PROJECT_REF}.supabase.co/rest/v1/`;
  
  console.log('⚠️  REST API prístup nie je dostupný pre priame SQL.\n');
  console.log('📋 MANUÁLNY POSTUP:\n');
  console.log('1. Choď na: https://supabase.com/dashboard/project/agccohbrvpjknlhltqzc/sql');
  console.log('2. Klikni "New Query"');
  console.log('3. Otvor súbor: ALL_MIGRATIONS.sql');
  console.log('4. Skopíruj CELÝ obsah (Cmd+A, Cmd+C)');
  console.log('5. Vlož do SQL Editora (Cmd+V)');
  console.log('6. Klikni "Run" (alebo Cmd+Enter)');
  console.log('7. Počkaj na "Success ✅"\n');
  
  console.log('✅ Po dokončení:');
  console.log('   - Obnoviť stránku (F5)');
  console.log('   - Skúsiť registráciu znova\n');
}

// Spusti
executeViaPgRest(sql);

