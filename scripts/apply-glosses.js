/* Applies ingest/glosses.json to the provision_note column.

   Usage:
     npm run gloss:apply            write them
     npm run gloss:apply -- --dry   say what would change, write nothing
     npm run gloss:check            fail if the store and the database differ

   Why a checked-in file rather than the database alone.

   provision_note is the one field on a sector row that no adapter can
   regenerate. Every figure in state_sector_budgets can be rebuilt by pointing
   the adapter at the same PDF again; the gloss is a sentence somebody wrote
   after reading the paper, and re-running the pipeline produces nothing but
   nulls. Left only in Neon it is invisible to review, absent from any diff,
   and destroyed by db:reset — which is exactly the kind of loss the rest of
   this project is arranged to prevent. db/seed.sql already keeps the glosses
   for the two hand-entered states in git for the same reason; this is that,
   for the states that arrive by ingestion.

   Keyed by state slug and sector name rather than by row id, because ids are
   assigned by whichever promote happened to run first and change whenever a
   state is re-ingested. A key that no longer matches any row is reported, not
   skipped: PRS renames sectors — the Oxford comma it added to "Education,
   Sports, Arts, and Culture" is what stranded a row once already — and a
   silently-dropped gloss is how that goes unnoticed a second time. */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../ingest/lib/db.js';

const here = dirname(fileURLToPath(import.meta.url));
const STORE = join(here, '..', 'ingest', 'glosses.json');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const checkOnly = args.includes('--check');

const { glosses } = JSON.parse(await readFile(STORE, 'utf8'));

const { rows: live } = await pool.query(`
  SELECT b.id, s.slug || '|' || b.sector AS key, b.provision_note
  FROM state_sector_budgets b
  JOIN states s ON s.id = b.state_id
`);

const byKey = new Map(live.map((r) => [r.key, r]));

const toWrite = [];
const unmatched = [];

for (const [key, text] of Object.entries(glosses)) {
  const row = byKey.get(key);
  if (!row) {
    unmatched.push(key);
    continue;
  }
  if (row.provision_note !== text) toWrite.push({ id: row.id, key, text });
}

// A row with no gloss is not an error — three states publish no provision
// text at all — but it is worth counting, so the gap is a number somebody
// can watch rather than something noticed by looking at the page.
const ungloss = live.filter((r) => !glosses[r.key]).map((r) => r.key);

if (checkOnly) {
  const problems = toWrite.length || unmatched.length;
  console.log(
    `${live.length} live rows · ${Object.keys(glosses).length} glosses in the store · ` +
      `${ungloss.length} rows with none`
  );
  if (toWrite.length) {
    console.error(`${toWrite.length} row(s) differ from the store:`);
    for (const w of toWrite) console.error(`  ${w.key}`);
  }
  if (unmatched.length) {
    console.error(`${unmatched.length} gloss(es) match no row:`);
    for (const k of unmatched) console.error(`  ${k}`);
  }
  if (!problems) console.log('database matches ingest/glosses.json');
  process.exitCode = problems ? 1 : 0;
} else {
  for (const w of toWrite) {
    if (dryRun) {
      console.log(`would set ${w.key}\n    ${w.text}`);
      continue;
    }
    await pool.query(`UPDATE state_sector_budgets SET provision_note = $2 WHERE id = $1`, [
      w.id,
      w.text,
    ]);
  }
  console.log(
    dryRun
      ? `${toWrite.length} row(s) would change; ${ungloss.length} have no gloss`
      : `wrote ${toWrite.length} gloss(es); ${ungloss.length} rows have none`
  );
}

if (unmatched.length && !checkOnly) {
  console.error(`\n${unmatched.length} gloss(es) match no live row — sector renamed?`);
  for (const k of unmatched) console.error(`  ${k}`);
  process.exitCode = 1;
}

await pool.end();
