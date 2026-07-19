/* Applies pending migrations from db/migrations to DATABASE_URL.

   Usage:
     npm run db:migrate            apply everything pending
     npm run db:migrate -- --dry   list what would run, touch nothing

   This replaces the previous runner, which executed schema.sql — a file that
   opened with DROP TABLE ... CASCADE for every table. That made a routine
   `npm run db:migrate` against the wrong DATABASE_URL an unrecoverable event.
   Nothing in db/migrations may destroy data; rebuilding from scratch is
   db/reset.js, which is gated behind two explicit confirmations.

   Guarantees, in the order they matter:

     1. Each file runs inside its own transaction. A migration that fails
        halfway leaves no partial schema, and the ones after it do not run.
     2. Applied files are checksummed. Editing a migration that has already
        run makes this refuse to proceed, because the database no longer
        matches the file that claims to describe it. Fix forward with a new
        migration instead.
     3. A session-level advisory lock serialises concurrent runners, so a
        deploy and a local run cannot interleave.

   Migrations must be idempotent where they reasonably can be (IF NOT EXISTS),
   because 001 has to be a no-op against the database schema.sql already
   built. */

import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../ingest/lib/db.js';

// Any 64-bit constant works; it only has to be the same in every runner.
const LOCK_KEY = 8_171_042_615_003;

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, 'migrations');
const dryRun = process.argv.includes('--dry');

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

/** Migration files in lexical order, which the NNN_ prefix makes numeric. */
async function loadMigrations() {
  const names = (await readdir(dir)).filter((n) => n.endsWith('.sql')).sort();

  for (const name of names) {
    if (!/^\d{3}_[a-z0-9_]+\.sql$/.test(name)) {
      throw new Error(
        `migration "${name}" is misnamed. Use NNN_lower_snake_case.sql so ` +
          `lexical order and apply order cannot disagree.`
      );
    }
  }

  return Promise.all(
    names.map(async (name) => {
      const sql = await readFile(join(dir, name), 'utf8');
      return { name, sql, checksum: sha256(sql) };
    })
  );
}

const client = await pool.connect();

try {
  await client.query(`SELECT pg_advisory_lock($1)`, [LOCK_KEY]);

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      checksum   TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const migrations = await loadMigrations();
  const { rows: appliedRows } = await client.query(
    `SELECT name, checksum FROM schema_migrations`
  );
  const applied = new Map(appliedRows.map((r) => [r.name, r.checksum]));

  // Verify history before applying anything: a tampered migration is a
  // reason to stop, not a reason to run the next one.
  for (const m of migrations) {
    const previous = applied.get(m.name);
    if (previous && previous !== m.checksum) {
      throw new Error(
        `${m.name} has changed since it was applied.\n` +
          `  recorded ${previous}\n  on disk   ${m.checksum}\n` +
          `The database no longer matches this file. Add a new migration ` +
          `rather than editing an applied one.`
      );
    }
  }

  const pending = migrations.filter((m) => !applied.has(m.name));

  if (pending.length === 0) {
    console.log(`up to date — ${migrations.length} migration(s) applied`);
  } else if (dryRun) {
    console.log(`would apply ${pending.length} migration(s):`);
    for (const m of pending) console.log(`  ${m.name}`);
  } else {
    for (const m of pending) {
      await client.query('BEGIN');
      try {
        await client.query(m.sql);
        await client.query(
          `INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)`,
          [m.name, m.checksum]
        );
        await client.query('COMMIT');
        console.log(`applied ${m.name}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`${m.name} failed and was rolled back: ${err.message}`);
      }
    }
  }

  // Row counts as a sanity check — an empty public table set after a
  // migration means the schema is there but the seed is not.
  const { rows } = await client.query(
    `SELECT (SELECT count(*) FROM sources) AS sources,
            (SELECT count(*) FROM states) AS states,
            (SELECT count(*) FROM districts) AS districts,
            (SELECT count(*) FROM state_sector_budgets) AS sector_rows,
            (SELECT count(*) FROM state_scheme_allocations) AS scheme_allocations,
            (SELECT count(*) FROM district_scheme_progress) AS district_progress,
            (SELECT count(*) FROM union_ministry_budgets) AS union_ministries,
            (SELECT count(*) FROM union_scheme_allocations) AS union_schemes,
            (SELECT count(*) FROM findings WHERE state_id IS NOT NULL) AS state_findings,
            (SELECT count(*) FROM findings WHERE state_id IS NULL) AS union_findings`
  );
  console.log('row counts:', rows[0]);
} catch (err) {
  console.error(`migrate failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.query(`SELECT pg_advisory_unlock($1)`, [LOCK_KEY]).catch(() => {});
  client.release();
  await pool.end();
}
