/* Pooled Neon connection for the ingestion CLIs.
   The HTTP driver in api/_lib/db.js is single-statement and per-request;
   ingestion needs multi-statement transactions, so it opens a real pool the
   way db/migrate.js does. */

import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local first.');
  process.exit(1);
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** Runs `fn` inside a transaction, rolling back on any throw. */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
