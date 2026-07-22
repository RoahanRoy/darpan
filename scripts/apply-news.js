/* Applies ingest/budget-news.json to the state_budget_news table.

   Usage:
     npm run news:apply            write them
     npm run news:apply -- --dry   say what would change, write nothing
     npm run news:check            fail if the store and the database differ

   Like scripts/apply-findings.js, a news item has no natural key beyond the
   (state, url) pair the table enforces, so applying the store idempotently
   means replacing a state's rows rather than editing them in place. The delete
   is bounded to the states the store names — a state absent from the store is
   never touched — and everything for a named state is rewritten from the file,
   which is the whole point of keeping the file authoritative.

   Unlike findings, there is no second class of rows to protect: every news row
   originates here. There is no adapter that writes this table, so there is
   nothing a re-apply could clobber that the file does not already hold. */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, withTransaction } from '../ingest/lib/db.js';

const here = dirname(fileURLToPath(import.meta.url));
const STORE = join(here, '..', 'ingest', 'budget-news.json');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const checkOnly = args.includes('--check');

const { news } = JSON.parse(await readFile(STORE, 'utf8'));

const { rows: stateRows } = await pool.query(`SELECT id, slug FROM states`);
const stateId = new Map(stateRows.map((r) => [r.slug, r.id]));

// Refuse the whole run on a bad state slug rather than landing the ones that
// happen to resolve — a half-applied store is harder to reason about than one
// that did not apply at all.
const unknown = Object.keys(news).filter((slug) => !stateId.has(slug));
if (unknown.length) {
  console.error(`the store names states that do not exist: ${unknown.join(', ')}`);
  await pool.end();
  process.exit(1);
}

/* Newest first, matching how the page reads them. The store may list items in
   any order; sorting here means the display_order written to the table is the
   dated order, so the API can ORDER BY it without re-sorting. */
function ordered(list) {
  return [...list].sort((a, b) => b.published_on.localeCompare(a.published_on));
}

/** What is live now, for the states the store covers. */
const { rows: live } = await pool.query(
  `SELECT st.slug, n.headline, n.summary, n.outlet, n.url, n.published_on::text
   FROM state_budget_news n
   JOIN states st ON st.id = n.state_id
   WHERE st.slug = ANY($1)
   ORDER BY st.slug, n.display_order`,
  [Object.keys(news)]
);

const liveByState = new Map();
for (const r of live) {
  if (!liveByState.has(r.slug)) liveByState.set(r.slug, []);
  liveByState.get(r.slug).push(r);
}

const shape = (n) =>
  JSON.stringify([n.headline, n.summary, n.outlet, n.url, n.published_on]);

const changed = [];
for (const [slug, list] of Object.entries(news)) {
  const now = (liveByState.get(slug) ?? []).map(shape).join('\n');
  const want = ordered(list).map(shape).join('\n');
  if (now !== want) changed.push(slug);
}

const total = Object.values(news).reduce((n, l) => n + l.length, 0);

if (checkOnly) {
  console.log(
    `${total} news item(s) in the store across ${Object.keys(news).length} state(s) · ` +
      `${live.length} row(s) live`
  );
  if (changed.length) {
    console.error(`${changed.length} state(s) differ from the store: ${changed.join(', ')}`);
  } else {
    console.log('database matches ingest/budget-news.json');
  }
  process.exitCode = changed.length ? 1 : 0;
} else if (dryRun) {
  for (const slug of changed) {
    const had = (liveByState.get(slug) ?? []).length;
    console.log(`${slug}: would replace ${had} item(s) with ${news[slug].length}`);
    for (const n of ordered(news[slug])) console.log(`    ${n.published_on}  ${n.headline}`);
  }
  console.log(`\n${changed.length} state(s) would change; nothing written`);
} else {
  const written = await withTransaction(async (client) => {
    let n = 0;
    for (const slug of changed) {
      await client.query(`DELETE FROM state_budget_news WHERE state_id = $1`, [
        stateId.get(slug),
      ]);
      let order = 0;
      for (const item of ordered(news[slug])) {
        await client.query(
          `INSERT INTO state_budget_news
             (state_id, headline, summary, outlet, url, published_on, display_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            stateId.get(slug), item.headline, item.summary, item.outlet,
            item.url, item.published_on, ++order,
          ]
        );
        n++;
      }
    }
    return n;
  });
  console.log(`wrote ${written} news item(s) across ${changed.length} state(s)`);
}

await pool.end();
