/* Destroys the public tables and rebuilds them from migrations + seed.

   Usage:
     ALLOW_DESTRUCTIVE_RESET=1 npm run db:reset -- --expect-host <db host>

   This is the only script in the project that deletes published data, and it
   is deliberately awkward to run. The failure it guards against is specific
   and has a name: pointing a rebuild at production because DATABASE_URL was
   whatever the last shell exported. So there are two independent gates, and
   neither can be satisfied by muscle memory:

     1. ALLOW_DESTRUCTIVE_RESET=1 in the environment — the deliberate act.
     2. --expect-host must equal the host in DATABASE_URL — proof that the
        operator knows which database they are actually connected to.

   Neon's point-in-time restore is the fallback if this is run in error. It is
   not a backup, and it has a retention window. Take a real dump first if the
   data matters.

   Staging tables (ingestion_runs, raw_documents, staged_facts) are NOT
   dropped. They hold the review history that proves how each published figure
   was approved, and that record has to outlive any rebuild of the tables it
   describes. Migration 002 creates them IF NOT EXISTS, so re-applying it over
   surviving tables is a no-op. */

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../ingest/lib/db.js';

const here = dirname(fileURLToPath(import.meta.url));

// CASCADE covers the foreign keys between these, so declaration order does
// not matter. Staging tables are absent from this list on purpose.
const PUBLIC_TABLES = [
  'union_scheme_allocations',
  'union_ministry_budgets',
  'union_budget_headlines',
  'district_scheme_progress',
  'state_scheme_allocations',
  'state_sector_budgets',
  'state_budget_headlines',
  'findings',
  'districts',
  'states',
  'sources',
];

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
}

/** Runs a sibling script in its own process, so it owns its pool and status. */
function run(script) {
  const { status } = spawnSync(process.execPath, [join(here, script)], {
    stdio: 'inherit',
  });
  if (status !== 0) {
    throw new Error(`${script} exited ${status} — the database is left empty.`);
  }
}

async function dropPublicTables() {
  if (process.env.ALLOW_DESTRUCTIVE_RESET !== '1') {
    throw new Error(
      'refusing to run without ALLOW_DESTRUCTIVE_RESET=1.\n' +
        '  This drops every published row. See the header of db/reset.js.'
    );
  }

  const expected = argValue('--expect-host');
  if (!expected) {
    throw new Error(
      'refusing to run without --expect-host <host>.\n' +
        '  Pass the host of the database you intend to destroy, so a stale ' +
        'DATABASE_URL cannot silently point this at production.'
    );
  }

  const actual = new URL(process.env.DATABASE_URL).host;
  if (actual !== expected) {
    throw new Error(
      `--expect-host does not match DATABASE_URL.\n` +
        `  expected ${expected}\n  actual   ${actual}\n` +
        `  Nothing was dropped.`
    );
  }

  console.log(`resetting public tables on ${actual}`);

  // One transaction: either every public table goes or none does. A
  // half-dropped schema is harder to reason about than either end state, and
  // it would leave the migration ledger disagreeing with reality.
  //
  // The ledger goes with them so the runner rebuilds from 001. Dropping it
  // rather than emptying it keeps its definition in one place — migrate.js
  // recreates it — and works whether or not a migration has ever run here.
  await pool.query(
    `BEGIN;
     DROP TABLE IF EXISTS ${PUBLIC_TABLES.join(', ')} CASCADE;
     DROP TABLE IF EXISTS schema_migrations;
     COMMIT;`
  );
  console.log(`dropped ${PUBLIC_TABLES.length} table(s) and cleared the migration ledger`);
}

let dropped = false;
try {
  await dropPublicTables();
  dropped = true;
} catch (err) {
  console.error(`reset failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}

// Rebuilt in child processes rather than in-process, so each script keeps its
// own pool and its own exit status instead of this one reimplementing both.
if (dropped) {
  try {
    run('migrate.js');
    run('seed.js');
    console.log('reset complete');
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}
