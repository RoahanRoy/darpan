/* Derives budget-gap findings from the published sector table.

   Usage:
     npm run findings:derive              propose for states that have none
     npm run findings:derive -- --restate rebuild proposals for every state
     npm run findings:derive -- --state bihar    just one

   Writes proposals into ingest/findings.json. It does NOT touch the database
   — `npm run findings:apply` (scripts/sync.js) does that, after a person has
   read the file.

   Why this is not an ingestion adapter.

   Everything in ingest/adapters/ reads a document nobody here controls and
   stages what it found for review, because a parse can be wrong in ways the
   figures do not reveal. These findings read state_sector_budgets, which is
   data that already went through that gate: every figure was parsed from a
   PRS paper, validated, and approved by a person before it landed. Running it
   through staging again would mean writing a raw_documents row for a document
   that was never fetched, and asking a reviewer to re-approve figures they
   already approved.

   What genuinely needs review here is the prose, not the arithmetic — so this
   follows the pattern ingest/glosses.json already set: generate into a file in
   git, where the sentences are diffable and survive db:reset, and apply from
   there.

   On what counts as a finding.

   Only arithmetic on published figures, and every row is written with
   computed_from_source = TRUE so the page marks it as our sum rather than the
   document's sentence. The CAG observations in db/seed.sql are the other kind
   — quoted from a source's own summary — and nothing here can produce those.

   Two guards keep the arithmetic from overstating:

     - A percentage off a small base is noise. Nagaland's Housing head moves
       +357%, which sounds enormous and is Rs 71 crore. So a move must also be
       worth at least 1% of everything the state budgets across these sectors
       before it is reported at all.
     - A sector cut mid-year and then restored is one story, not two. Delhi's
       Police line fell 66% and came back 274%; reported separately those read
       as an underspend and an expansion, and the point is that they are the
       same money. */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../ingest/lib/db.js';
import { findingsFor } from '../ingest/findings-rules.js';

const here = dirname(fileURLToPath(import.meta.url));
const STORE = join(here, '..', 'ingest', 'findings.json');

const args = process.argv.slice(2);
const restate = args.includes('--restate');
const onlyState = args.includes('--state') ? args[args.indexOf('--state') + 1] : null;

const { rows } = await pool.query(`
  SELECT st.slug AS state, src.slug AS source_slug, b.sector, b.display_order,
         b.budgeted_cr::float8 AS be, b.revised_cr::float8 AS re,
         b.next_budget_cr::float8 AS nbe
  FROM state_sector_budgets b
  JOIN states st ON st.id = b.state_id
  JOIN sources src ON src.id = b.source_id
  ORDER BY st.slug, b.display_order
`);

const { rows: existing } = await pool.query(`
  SELECT DISTINCT st.slug FROM findings f JOIN states st ON st.id = f.state_id
`);
const hasFindings = new Set(existing.map((r) => r.slug));

const byState = new Map();
for (const r of rows) {
  if (!byState.has(r.state)) byState.set(r.state, []);
  byState.get(r.state).push(r);
}

let store = { findings: {} };
try {
  store = JSON.parse(await readFile(STORE, 'utf8'));
} catch {
  // First run — the store does not exist yet.
}

let written = 0;
const skipped = [];

for (const [state, sectors] of byState) {
  if (onlyState && state !== onlyState) continue;
  // A state whose findings were written by hand is left alone unless asked.
  // db/seed.sql's CAG items are quoted from a document and cannot be
  // regenerated, so overwriting them would be a straight loss.
  if (!restate && hasFindings.has(state)) {
    skipped.push(state);
    continue;
  }
  const derived = findingsFor(sectors);
  store.findings[state] = derived;
  written += derived.length;
  console.log(`${state} (${sectors[0].source_slug})`);
  for (const f of derived) console.log(`   [${f.kind}] ${f.headline}`);
}

store._comment =
  'Budget-gap findings derived from state_sector_budgets by scripts/derive-findings.js. ' +
  'Every row is arithmetic on published figures — computed_from_source is true throughout, ' +
  'and the page marks these as our sum rather than the document\'s own words. Kept in git ' +
  'because db:reset would otherwise destroy prose no adapter can regenerate. ' +
  'Apply with: npm run findings:apply';

store.findings = Object.fromEntries(
  Object.entries(store.findings).sort(([a], [b]) => a.localeCompare(b))
);

await writeFile(STORE, JSON.stringify(store, null, 2) + '\n');

console.log(
  `\nwrote ${written} finding(s) for ${Object.keys(store.findings).length} state(s) to ingest/findings.json`
);
if (skipped.length) {
  console.log(`left alone (already have findings): ${skipped.join(', ')}`);
}
console.log('review the file, then: npm run findings:apply -- --dry');

await pool.end();
