import fs from 'fs';
import https from 'https';

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoanZzdmV6aW5yYnhlcm9wZXlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODg1MDk4MywiZXhwIjoyMDc0NDI2OTgzfQ.xaUOEBEoCx2fDOY2T5B7MDh6RpjO4lYH1hFaWPYSSaM';
const DB_PASSWORD = 'R9Tbg1yq2eqMbSTb';

const sql = fs.readFileSync('essential-functions.sql', 'utf8');

console.log('📦 Applying essential functions to production...\n');

// Use psql if available, otherwise show instructions
import { exec } from 'child_process';

const psqlCommand = `PGPASSWORD="${DB_PASSWORD}" psql -h db.hhjvsvezinrbxeropeyl.supabase.co -U postgres -d postgres -p 5432 -f essential-functions.sql`;

exec(psqlCommand, (error, stdout, stderr) => {
  if (error) {
    console.log('❌ psql not available or connection failed\n');
    console.log('Please paste the contents of essential-functions.sql into the Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/hhjvsvezinrbxeropeyl/sql/new\n');
    process.exit(1);
  }

  if (stderr) {
    console.log('Output:', stderr);
  }
  if (stdout) {
    console.log(stdout);
  }

  console.log('\n✅ Functions applied successfully!\n');
  process.exit(0);
});
