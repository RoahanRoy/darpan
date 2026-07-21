/* Applies ingest/findings.json to the findings table.

   Usage:
     npm run findings:apply            write them
     npm run findings:apply -- --dry   say what would change, write nothing
     npm run findings:check            fail if the store and the database differ

   What this is allowed to delete, and what it must not.

   A finding has no natural key — the table is a serial id and a sentence — so
   applying the store idempotently means replacing a state's rows rather than
   updating them in place. That makes the scope of the delete the only thing
   standing between a re-run and the loss of prose nobody can regenerate.

   So the delete is bounded to computed_from_source = TRUE, for states named
   in the store. Those rows are arithmetic this project did on published
   figures: scripts/derive-findings.js can rebuild any of them from the sector
   table at any time, so deleting one costs nothing.

   Everything with computed_from_source = FALSE is quoted from a document's own
   summary — the CAG observations in db/seed.sql, which exist nowhere else —
   and is never touched here, whatever the store says about that state. A
   state can hold both kinds at once and only one kind is this script's to
   manage. */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, withTransaction } from '../ingest/lib/db.js';

const here = dirname(fileURLToPath(import.meta.url));
const STORE = join(here, '..', 'ingest', 'findings.json');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const checkOnly = args.includes('--check');

const { findings } = JSON.parse(await readFile(STORE, 'utf8'));

const { rows: stateRows } = await pool.query(`SELECT id, slug FROM states`);
const stateId = new Map(stateRows.map((r) => [r.slug, r.id]));

const { rows: sourceRows } = await pool.query(`SELECT id, slug FROM sources`);
const sourceId = new Map(sourceRows.map((r) => [r.slug, r.id]));

// Refuse the whole run on a bad reference rather than landing the states that
// happen to resolve. A half-applied store is harder to reason about than one
// that did not apply at all.
const unresolved = [];
for (const [slug, list] of Object.entries(findings)) {
  if (!stateId.has(slug)) unresolved.push(`no such state: ${slug}`);
  for (const f of list) {
    if (!sourceId.has(f.source_slug)) {
      unresolved.push(`${slug}: no such source: ${f.source_slug}`);
    }
  }
}
if (unresolved.length) {
  console.error('the store references rows that do not exist:');
  for (const u of unresolved) console.error(`  ${u}`);
  await pool.end();
  process.exit(1);
}

/** What is live now, for the states the store covers, computed rows only. */
const { rows: live } = await pool.query(
  `SELECT st.slug, f.kind, f.tag_label, f.headline, f.body, src.slug AS source_slug
   FROM findings f
   JOIN states st ON st.id = f.state_id
   JOIN sources src ON src.id = f.source_id
   WHERE f.computed_from_source AND st.slug = ANY($1)
   ORDER BY st.slug, f.display_order`,
  [Object.keys(findings)]
);

const liveByState = new Map();
for (const r of live) {
  if (!liveByState.has(r.slug)) liveByState.set(r.slug, []);
  liveByState.get(r.slug).push(r);
}

const shape = (f) =>
  JSON.stringify([f.kind, f.tag_label, f.headline, f.body, f.source_slug]);

const changed = [];
for (const [slug, list] of Object.entries(findings)) {
  const now = (liveByState.get(slug) ?? []).map(shape).join('\n');
  const want = list.map(shape).join('\n');
  if (now !== want) changed.push(slug);
}

const total = Object.values(findings).reduce((n, l) => n + l.length, 0);

if (checkOnly) {
  console.log(
    `${total} finding(s) in the store across ${Object.keys(findings).length} state(s) · ` +
      `${live.length} computed row(s) live`
  );
  if (changed.length) {
    console.error(`${changed.length} state(s) differ from the store: ${changed.join(', ')}`);
  } else {
    console.log('database matches ingest/findings.json');
  }
  process.exitCode = changed.length ? 1 : 0;
} else if (dryRun) {
  for (const slug of changed) {
    const had = (liveByState.get(slug) ?? []).length;
    console.log(`${slug}: would replace ${had} computed finding(s) with ${findings[slug].length}`);
    for (const f of findings[slug]) console.log(`    [${f.kind}] ${f.headline}`);
  }
  console.log(`\n${changed.length} state(s) would change; nothing written`);
} else {
  const written = await withTransaction(async (client) => {
    let n = 0;
    for (const slug of changed) {
      await client.query(
        `DELETE FROM findings WHERE state_id = $1 AND computed_from_source`,
        [stateId.get(slug)]
      );
      /* Hand-written findings for this state keep their display_order, so
         computed rows are appended after them rather than interleaved. A
         quoted CAG observation should lead a state's feed; our arithmetic
         should follow it. */
      const { rows: after } = await client.query(
        `SELECT COALESCE(max(display_order), 0) AS n FROM findings WHERE state_id = $1`,
        [stateId.get(slug)]
      );
      let order = Number(after[0].n);
      for (const f of findings[slug]) {
        await client.query(
          `INSERT INTO findings
             (state_id, kind, tag_label, headline, body, computed_from_source,
              source_id, display_order)
           VALUES ($1,$2,$3,$4,$5,TRUE,$6,$7)`,
          [
            stateId.get(slug), f.kind, f.tag_label, f.headline, f.body,
            sourceId.get(f.source_slug), ++order,
          ]
        );
        n++;
      }
    }
    return n;
  });
  console.log(`wrote ${written} finding(s) across ${changed.length} state(s)`);
}

await pool.end();
