const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function runMigrations() {
  // Required:
  // - SUPABASE_DB_HOST
  // - SUPABASE_DB_PORT
  // - SUPABASE_DB_USER
  // - SUPABASE_DB_PASSWORD
  // Optional:
  // - SUPABASE_DB_NAME (default: postgres)
  const client = new Client({
    host: required('SUPABASE_DB_HOST'),
    port: Number(process.env.SUPABASE_DB_PORT || required('SUPABASE_DB_PORT')),
    database: process.env.SUPABASE_DB_NAME || 'postgres',
    user: required('SUPABASE_DB_USER'),
    password: required('SUPABASE_DB_PASSWORD'),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
    const migrations = fs
      .readdirSync(migrationsDir)
      .filter((f) => /^\d+_.*\.sql$/.test(f))
      .sort();

    for (const file of migrations) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`Running ${file}...`);
      await client.query(sql);
      console.log(`  ✓ ${file} completed`);
    }

    console.log('All migrations completed successfully.');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

runMigrations();
