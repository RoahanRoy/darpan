/* Applies db/seed.sql to DATABASE_URL. Usage: npm run db:seed

   seed.sql is written for an empty database — plain INSERTs, no ON CONFLICT —
   so running it twice raises a unique-violation rather than duplicating rows.
   That is the safe failure, but it is a confusing one, so this checks first
   and says what it found.

   The whole file runs in one transaction: a seed that fails partway would
   leave sector budgets without the sources they cite, which is the one state
   this project must never be in. */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, withTransaction } from '../ingest/lib/db.js';

const here = dirname(fileURLToPath(import.meta.url));

try {
  const { rows } = await pool.query(
    `SELECT to_regclass('public.sources') IS NOT NULL AS ready`
  );
  if (!rows[0].ready) {
    throw new Error('the public tables do not exist yet — run `npm run db:migrate` first.');
  }

  const { rows: counts } = await pool.query(`SELECT count(*)::int AS n FROM sources`);
  if (counts[0].n > 0) {
    throw new Error(
      `sources already holds ${counts[0].n} row(s). seed.sql only applies to an ` +
        `empty database; use \`npm run db:reset\` to rebuild from scratch.`
    );
  }

  const sql = await readFile(join(here, 'seed.sql'), 'utf8');
  await withTransaction((client) => client.query(sql));
  console.log('applied seed.sql');

  const { rows: after } = await pool.query(
    `SELECT (SELECT count(*) FROM sources) AS sources,
            (SELECT count(*) FROM states) AS states,
            (SELECT count(*) FROM districts) AS districts,
            (SELECT count(*) FROM findings) AS findings`
  );
  console.log('row counts:', after[0]);
} catch (err) {
  console.error(`seed failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
