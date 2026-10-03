import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import pg from 'pg';

const connectionString = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('MIGRATION_DATABASE_URL or DATABASE_URL is required.');
  process.exit(1);
}

const migrationsDir = fileURLToPath(new URL('../db/migrations', import.meta.url));
const files = (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort();
if (!files.length) {
  console.error(`No .sql migrations found in ${migrationsDir}.`);
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });

try {
  // Every file is written to be idempotent, so re-running is safe.
  for (const name of files) {
    const sql = await readFile(join(migrationsDir, name), 'utf8');
    await pool.query(sql);
    console.log(`Applied ${name}`);
  }
  console.log('PostgreSQL account and super-admin schema is ready.');
} catch (error) {
  console.error(`Migration failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
