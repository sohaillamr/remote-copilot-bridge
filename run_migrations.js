const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  // Try multiple connection approaches
  const hosts = [
    { host: 'db.htigtkfuxyzsnotrjcyz.supabase.co', port: 5432, user: 'postgres' },
    { host: 'aws-0-us-east-1.pooler.supabase.com', port: 6543, user: 'postgres.htigtkfuxyzsnotrjcyz' },
    { host: 'aws-0-eu-west-1.pooler.supabase.com', port: 6543, user: 'postgres.htigtkfuxyzsnotrjcyz' },
    { host: 'aws-0-us-west-1.pooler.supabase.com', port: 6543, user: 'postgres.htigtkfuxyzsnotrjcyz' },
    { host: 'aws-0-ap-southeast-1.pooler.supabase.com', port: 6543, user: 'postgres.htigtkfuxyzsnotrjcyz' },
  ];

  let client;
  let connected = false;

  for (const h of hosts) {
    try {
      console.log(`Trying ${h.host}:${h.port}...`);
      client = new Client({
        host: h.host,
        port: h.port,
        database: 'postgres',
        user: h.user,
        password: '9JpxF48l2VbtagFE',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      });
      await client.connect();
      connected = true;
      console.log(`Connected via ${h.host}!\n`);
      break;
    } catch (err) {
      console.log(`  Failed: ${err.message}`);
      try { await client.end(); } catch {}
    }
  }

  if (!connected) {
    console.error('\nCould not connect to database. Please run migrations manually.');
    console.log('Go to: https://supabase.com/dashboard → SQL Editor');
    console.log('Then paste and run these files:');
    console.log('  1. supabase/migrations/001_schema.sql');
    console.log('  2. supabase/migrations/002_admin_functions.sql');
    return;
  }

  try {
    console.log('Connecting to Supabase database...');
    await client.connect();
    console.log('Connected!\n');

    const migrations = [
      '001_schema.sql',
      '002_admin_functions.sql'
    ];

    for (const file of migrations) {
      const filePath = path.join(__dirname, 'supabase', 'migrations', file);
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`Running ${file}...`);
      await client.query(sql);
      console.log(`  ✓ ${file} completed\n`);
    }

    console.log('All migrations completed successfully!');
  } catch (err) {
    console.error('Migration error:', err.message);
    if (err.message.includes('already exists')) {
      console.log('(This usually means migrations were already applied)');
    }
  } finally {
    await client.end();
  }
}

runMigrations();
