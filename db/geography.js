/* Applies db/geography.sql to DATABASE_URL. Usage: npm run db:geography

   Unlike db/seed.js, this is safe to run repeatedly: geography.sql upserts on
   lgd_code, so a re-run after `node scripts/fetch-lgd-geography.js` lands
   whatever LGD has changed and leaves everything else alone.

   It is separate from the migration runner on purpose. A migration is applied
   once and checksummed forever, which is right for a schema change and wrong
   for a district list — the list is expected to change, several times a year,
   and each change should be an ordinary diff-and-apply rather than a new
   numbered file. It is separate from db/seed.js for the opposite reason: the
   seed is figures, refuses to run twice, and must not be coupled to a table
   that gets refreshed.

   The whole file is one transaction, inside geography.sql itself. */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../ingest/lib/db.js';

const here = dirname(fileURLToPath(import.meta.url));

try {
  const { rows: ready } = await pool.query(
    `SELECT to_regclass('public.districts') IS NOT NULL AS tables,
            EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'districts' AND column_name = 'lgd_code'
            ) AS migrated`
  );

  if (!ready[0].tables) {
    throw new Error('the public tables do not exist yet — run `npm run db:migrate` first.');
  }
  if (!ready[0].migrated) {
    throw new Error(
      'districts has no lgd_code column, so this file has nothing to key on. ' +
        'Run `npm run db:migrate` to apply 003 first.'
    );
  }

  const before = await counts();
  const sql = await readFile(join(here, 'geography.sql'), 'utf8');
  await pool.query(sql);
  const after = await counts();

  console.log(
    `states    ${before.states} → ${after.states}\n` +
      `districts ${before.districts} → ${after.districts}`
  );

  // A district vanishing means an upsert moved a row rather than adding one,
  // or something outside this file deleted rows. Either way it is worth
  // saying out loud, because published figures hang off district ids.
  if (after.districts < before.districts) {
    console.warn('! the district count went DOWN — check what moved before deploying');
  }
} catch (err) {
  console.error(`geography failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}

async function counts() {
  const { rows } = await pool.query(
    `SELECT (SELECT count(*)::int FROM states)    AS states,
            (SELECT count(*)::int FROM districts) AS districts`
  );
  return rows[0];
}
