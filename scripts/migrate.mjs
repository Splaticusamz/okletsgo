#!/usr/bin/env node
/**
 * Migration script: creates the kv table and seeds it from events.db.json if present.
 *
 * Usage: node scripts/migrate.mjs
 * Requires DATABASE_URL or POSTGRES_URL in env (or .env.local).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)="?(.*?)"?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

const { neon } = await import('@neondatabase/serverless');
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) { console.error('❌ DATABASE_URL not set'); process.exit(1); }

const sql = neon(url);

console.log('Creating kv table...');
await sql`
  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;
console.log('✓ kv table ready');

// Seed from events.db.json if exists and kv is empty
const rows = await sql`SELECT key FROM kv WHERE key = 'db'`;
if (rows.length === 0) {
  const dbJsonPath = path.join(__dirname, '..', 'data', 'events.db.json');
  if (fs.existsSync(dbJsonPath)) {
    console.log('Seeding from events.db.json...');
    const data = JSON.parse(fs.readFileSync(dbJsonPath, 'utf-8'));
    await sql`INSERT INTO kv (key, value) VALUES ('db', ${JSON.stringify(data)}::jsonb)`;
    console.log(`✓ Seeded ${data.events?.length ?? 0} events, ${data.venues?.length ?? 0} venues`);
  } else {
    console.log('No events.db.json found, inserting empty db...');
    const empty = { events: [], venues: [], imageCandidates: [], assets: [], publishBatches: [], batchActions: [], newsletterDrafts: [], newsletterSettings: {} };
    await sql`INSERT INTO kv (key, value) VALUES ('db', ${JSON.stringify(empty)}::jsonb)`;
    console.log('✓ Empty db seeded');
  }
} else {
  console.log('✓ db row already exists, skipping seed');
}

console.log('🎉 Migration complete');
