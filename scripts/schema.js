/* Keeps db/schema.sql honest: a readable rendering of the schema the
   migrations produce.

   Usage:
     npm run schema:check   rebuild the snapshot and fail if the file drifted
     npm run schema:dump    write db/schema.sql from $DATABASE_URL

   Migration files are checksummed, so nobody can change one after it has run.
   That proves the files are unchanged — not that they still add up to the
   schema you think. db/schema.sql closes the gap: it is what the migrations
   produce when applied to an empty database, rendered by pg_dump and kept in
   git so every schema change shows up as a readable diff next to the migration
   that caused it, and so a reviewer can see the shape of the database without
   connecting to one.

   The snapshot is generated FROM THE MIGRATIONS, never from production. That
   is deliberate. Production was first built by an older schema file and later
   adopted 001_baseline through IF NOT EXISTS (db/README.md), so it carries
   history a clean migration run does not — a column ordering an ALTER never
   reached, say. Snapshotting production would bake that history into the file
   and make the check a comparison against an accident. Snapshotting the
   migrations makes db/schema.sql a statement about what the migrations mean,
   which is the thing under version control. Production is kept in step with
   the migrations by migrate.yml applying them on every push, not by this file.

   normalize() is the only part with any logic in it, and it is pure so it can
   be tested without a database (test/schema.test.js). pg_dump wraps its output
   in a header that changes every run — a timestamp, a server version, a random
   \restrict token — and stripping that is what lets two dumps of one schema
   compare equal. */

import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { argv } from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = join(root, 'db', 'schema.sql');

/* Strips everything pg_dump emits that is noise for a diff: the header
   comments (which carry a timestamp and version), the per-object `-- Name:`
   comments, the session SET lines, the search_path reset, the \restrict and
   \unrestrict wrappers pg 18 adds with a token that changes every run, and
   blank lines. What remains is the DDL, and two identical schemas leave
   identical DDL behind. schema_migrations is the runner's own bookkeeping
   table, not part of the schema the migrations describe, so it is dropped
   too — it is excluded at dump time as well, but a snapshot taken some other
   way might carry it. */
export function normalize(sql) {
  const drop = /^(--|SET |SELECT pg_catalog\.set_config|\\restrict|\\unrestrict|\s*$)/;
  return sql
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .filter((line) => !drop.test(line))
    .join('\n')
    .trim();
}

function dumpSchema(url) {
  let out;
  try {
    out = execFileSync(
      'pg_dump',
      [
        url,
        '--schema-only',
        '--no-owner',
        '--no-privileges',
        '--exclude-table=schema_migrations',
      ],
      { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
    );
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error('pg_dump is not on PATH. It is the PostgreSQL client, and');
      console.error('it must match the server major version (Neon serves 18).');
      process.exit(1);
    }
    console.error(err.stderr || err.message);
    process.exit(1);
  }
  return normalize(out) + '\n';
}

async function main() {
  const command = argv[2];
  if (command !== 'dump' && command !== 'check') {
    console.error('usage: node scripts/schema.js <dump|check>');
    process.exit(2);
  }

  // Loaded here, not at import, so requiring normalize() for a test does not
  // demand a DATABASE_URL or a .env file.
  const dotenv = (await import('dotenv')).default;
  dotenv.config({ path: '.env.local', quiet: true });
  dotenv.config({ quiet: true });

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  // The pooler cannot hold pg_dump's snapshot; the direct endpoint is the same
  // host without the -pooler suffix. A no-op for a plain (container) URL.
  const u = new URL(process.env.DATABASE_URL);
  u.hostname = u.hostname.replace('-pooler', '');
  const fresh = dumpSchema(u.toString());

  if (command === 'dump') {
    await writeFile(SNAPSHOT, fresh);
    console.log(`wrote db/schema.sql (${fresh.split('\n').length} lines)`);
    return;
  }

  let committed;
  try {
    committed = await readFile(SNAPSHOT, 'utf8');
  } catch {
    // Bootstrap: the first time this runs there is nothing to compare against.
    // Write it and pass, rather than failing a check for a file that could not
    // have existed yet. The next run holds it to the standard.
    await writeFile(SNAPSHOT, fresh);
    console.log('db/schema.sql did not exist — wrote it. Commit it to enable the check.');
    return;
  }

  if (committed === fresh) {
    console.log(`db/schema.sql matches the migrations (${fresh.split('\n').length} lines)`);
    return;
  }

  // Report the first divergence rather than the whole file: the point is to
  // send someone to `schema:dump`, and the CI job uploads both files whole for
  // anyone who wants the full diff.
  const a = committed.split('\n');
  const b = fresh.split('\n');
  const at = a.findIndex((line, i) => line !== b[i]);

  console.error('db/schema.sql is out of date. Run `npm run schema:dump` and commit the result.');
  console.error(`  committed: ${a.length} lines   from migrations: ${b.length} lines`);
  if (at >= 0) {
    console.error(`  first difference at line ${at + 1}:`);
    console.error(`    committed:       ${a[at] ?? '(end of file)'}`);
    console.error(`    from migrations: ${b[at] ?? '(end of file)'}`);
  }
  process.exit(1);
}

// Only run the CLI when invoked directly, so `import { normalize }` is free of
// side effects.
if (argv[1] && import.meta.url === pathToFileURL(argv[1]).href) {
  await main();
}
