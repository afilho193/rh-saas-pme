import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// DATABASE_URL is set locally (backend/.env); POSTGRES_URL is what Vercel's Supabase
// integration injects automatically (the pooled connection string, port 6543 via
// PgBouncer — required in a serverless environment where every invocation could
// otherwise open its own direct connection).
const rawConnectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const isHostedPostgres = rawConnectionString?.includes('sslmode=require');

// pg-connection-string v3+ treats `sslmode=require` in the URL as an alias for
// `verify-full` and does full chain validation regardless of the `ssl` option passed
// below — Supabase's pooler cert chain fails that (self-signed intermediate), so the
// query string is stripped and SSL is configured explicitly instead.
const connectionString = isHostedPostgres
  ? rawConnectionString.split('?')[0]
  : rawConnectionString;

const pool = new Pool({
  connectionString,
  ssl: isHostedPostgres ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;
