import 'dotenv/config';
import pg from 'pg';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const required = ['SUPER_ADMIN_NAME', 'SUPER_ADMIN_EMAIL', 'SUPER_ADMIN_PASSWORD'];
const missing = required.filter((key) => !process.env[key]);
const connectionString = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) missing.unshift('MIGRATION_DATABASE_URL or DATABASE_URL');

if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

if (process.env.SUPER_ADMIN_PASSWORD.length < 12) {
  console.error('SUPER_ADMIN_PASSWORD must be at least 12 characters.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString, ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: true } : undefined });

try {
  const { rows: existing } = await pool.query("SELECT id FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1");
  if (existing.length) throw new Error('A super-admin account already exists; refusing to create another.');

  const salt = randomBytes(16);
  const derived = await scrypt(process.env.SUPER_ADMIN_PASSWORD, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  const passwordHash = `scrypt$32768$8$1$${salt.toString('hex')}$${derived.toString('hex')}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO users (full_name, email, role, status, password_hash)
       VALUES ($1, lower($2), 'SUPER_ADMIN', 'ACTIVE', $3) RETURNING id, department`,
      [process.env.SUPER_ADMIN_NAME.trim(), process.env.SUPER_ADMIN_EMAIL.trim().toLowerCase(), passwordHash],
    );
    // Every account belongs to a nominal roll entry, the first admin included.
    await client.query(
      `INSERT INTO nominal_roll (staff_number, full_name, email, role, department, user_id)
       VALUES ($1, $2, lower($3), 'SUPER_ADMIN', $4, $5)`,
      [
        (process.env.SUPER_ADMIN_STAFF_NUMBER?.trim() || `PENDING-${rows[0].id.slice(0, 8)}`).toUpperCase(),
        process.env.SUPER_ADMIN_NAME.trim(),
        process.env.SUPER_ADMIN_EMAIL.trim(),
        rows[0].department ?? 'General Administration',
        rows[0].id,
      ],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  console.log('Super-admin account created. Remove the bootstrap credentials from the environment now.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Failed to create the super-admin account.');
  process.exitCode = 1;
} finally {
  await pool.end();
}
