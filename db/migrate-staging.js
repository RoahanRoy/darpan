/* Applies staging.sql to DATABASE_URL. Usage: npm run db:staging

   Kept separate from db:migrate on purpose. schema.sql drops and recreates
   the public tables; the staging tables hold review history that must survive
   a reseed, so they are created if-not-exists and never dropped here. */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../ingest/lib/db.js';

const here = dirname(fileURLToPath(import.meta.url));

try {
  await pool.query(await readFile(join(here, 'staging.sql'), 'utf8'));
  console.log('applied staging.sql');

  const { rows } = await pool.query(
    `SELECT (SELECT count(*) FROM ingestion_runs) AS runs,
            (SELECT count(*) FROM raw_documents) AS documents,
            (SELECT count(*) FROM staged_facts WHERE status = 'pending') AS pending`
  );
  console.log('staging:', rows[0]);
} finally {
  await pool.end();
}
