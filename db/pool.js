import pg from 'pg';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const isLocalHost = (connectionString) => {
  try {
    return LOCAL_HOSTS.has(new URL(connectionString).hostname);
  } catch {
    return false;
  }
};

/**
 * One pool factory for the server and the scripts, so the same code talks to a local PostgreSQL
 * during development and to Supabase when deployed. Nothing here picks a database: DATABASE_URL does.
 * TLS is turned on for any non-local host (Supabase requires it), on Vercel, or with DATABASE_SSL=true;
 * PGSSLMODE=require additionally verifies the server certificate.
 */
export const createPool = (connectionString) => {
  const ssl = process.env.PGSSLMODE === 'require'
    ? { rejectUnauthorized: true }
    : process.env.DATABASE_SSL === 'true' || process.env.VERCEL || (connectionString && !isLocalHost(connectionString))
      ? { rejectUnauthorized: false }
      : undefined;
  // A serverless instance serves one request at a time; the Supabase pooler multiplexes the rest.
  return new pg.Pool({ connectionString, ssl, max: process.env.VERCEL ? 1 : 10 });
};
