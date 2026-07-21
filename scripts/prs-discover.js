/* Finds the most recent PRS Budget Analysis PDF for every state that has one,
   and writes ingest/prs-targets.json.

   Usage:
     node scripts/prs-discover.js           rewrite the manifest
     node scripts/prs-discover.js --check   fail if it would change

   The URLs cannot be constructed. db/seed.sql cites
   .../uttarakhand/2025/Uttarakhand_Budget_Analysis_2025-26.pdf, and the 2026
   papers are named .../karnataka/2026/Budget_Analysis_2026-27-KA.pdf — same
   publisher, same series, different convention. Guessing a filename gets a
   404 dressed as an HTML page, which pdf-parse would then fail on with a
   message about the document being unreadable rather than about the URL being
   wrong. So the index is read and the link is taken from it.

   The manifest is checked in so that a run is reproducible and so that a
   change in what PRS publishes shows up as a diff — a state appearing, or a
   paper being replaced with a differently-named one — before any ingestion
   happens. */

import { writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'ingest', 'prs-targets.json');

const INDEX = 'https://prsindia.org/budgets/states';
const ORIGIN = 'https://prsindia.org';

const checkOnly = process.argv.includes('--check');

/** Fiscal years sort correctly as strings: '2026-27' > '2025-26'. */
const latest = (years) => years.sort().at(-1);

/* States where the newest analysis is not the one to ingest.

   "Latest" and "ingestable" are not the same thing. PRS decides each year
   what tables a paper carries, and a state can publish a newer analysis that
   drops the one table this project reads. Taking the newest paper regardless
   then replaces a state's figures with nothing.

   Jammu and Kashmir is the case that forced this. Its 2026-27 analysis has
   five tables and no sector-wise expenditure breakdown at all — the adapter
   reads the document perfectly and correctly reports there is nothing in it
   — while the 2025-26 paper carries the table as Table 5. Without a pin the
   manifest points at the 2026-27 paper, every run fails, and J&K stays blank.

   A pin is deliberately a code change rather than a hand-edit to the
   manifest, which is regenerated wholesale and would silently lose it. Each
   one should be revisited when PRS publishes again: `--check` reports any pin
   the index has since moved past, so a paper that regains the table is not
   held back forever by a note nobody reread. */
const PINNED = {
  'jammu-and-kashmir': {
    fiscalYear: '2025-26',
    why: 'the 2026-27 analysis publishes no sector-wise expenditure table',
  },
};

async function text(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.text();
}

/** state slug → every fiscal year PRS has published an analysis for. */
async function readIndex() {
  const html = await text(INDEX);
  const byState = new Map();

  const LINK = /\/budgets\/states\/([a-z-]+?)-budget-analysis-(\d{4}-\d{2,4})/g;
  for (const m of html.matchAll(LINK)) {
    const [, state, fy] = m;
    // PRS wrote 2019-2020 once. Normalising keeps the sort honest, since
    // '2019-2020' sorts above '2020-21' as a string.
    const year = fy.length === 9 ? `${fy.slice(0, 5)}${fy.slice(7)}` : fy;
    if (!byState.has(state)) byState.set(state, new Set());
    byState.get(state).add(year);
  }

  if (byState.size < 25) {
    throw new Error(
      `only ${byState.size} states found on ${INDEX}, expected around 30. ` +
        'The index page has probably been rebuilt.'
    );
  }

  return byState;
}

/** The PDF a given analysis page links to, or null if it links none. */
async function findPdf(state, fy) {
  const page = `${ORIGIN}/budgets/states/${state}-budget-analysis-${fy}`;
  const html = await text(page).catch(() => null);
  if (!html) return null;

  // Bounded to the budget_state tree on purpose. These pages also carry a
  // sidebar link to whatever PRS published most recently — a Finance
  // Commission summary, at the time of writing — and that is a real PDF that
  // would parse and produce complete nonsense.
  const m = html.match(/href="((?:https:\/\/prsindia\.org)?\/files\/budget\/budget_state\/[^"]+\.pdf)"/i);
  if (!m) return null;

  // Jammu and Kashmir's file is Budget_Analysis_2026-27-J&K.pdf, which
  // reaches us as J&amp;K out of the HTML. Left encoded it is a 404.
  const href = m[1].replace(/&amp;/g, '&');

  return { page, pdf: href.startsWith('http') ? href : ORIGIN + href };
}

const index = await readIndex();
const targets = [];
const missing = [];
const stale = [];

for (const state of [...index.keys()].sort()) {
  const years = [...index.get(state)];
  const newest = latest(years);
  const pin = PINNED[state];

  /* A pin names a year, so it can only be honoured if PRS still publishes
     that year's page. If it does not, the pin is stale and quietly falling
     back to the newest paper would resurrect exactly the failure the pin
     exists to prevent — so it is reported instead. */
  if (pin && !years.includes(pin.fiscalYear)) {
    stale.push(`${state}: pinned to ${pin.fiscalYear}, which the index no longer lists`);
  }

  const fy = pin && years.includes(pin.fiscalYear) ? pin.fiscalYear : newest;

  if (pin && fy !== newest) {
    stale.push(
      `${state}: pinned to ${fy} (${pin.why}); ${newest} is now published — ` +
        'recheck whether it carries the table'
    );
  }

  const found = await findPdf(state, fy);

  if (!found) {
    // Worth reporting rather than skipping silently: a state whose newest
    // page has no PDF is a state we would otherwise quietly stop updating.
    missing.push(`${state} ${fy}`);
    process.stderr.write(`  ${state.padEnd(20)} ${fy}  no PDF linked\n`);
    continue;
  }

  targets.push({
    state,
    fiscalYear: fy,
    page: found.page,
    url: found.pdf,
    // Carried into the manifest so the diff explains itself: a reader seeing
    // one state a year behind the rest should not have to find this script.
    ...(PINNED[state] ? { pinned: PINNED[state].why } : {}),
  });
  process.stderr.write(
    `  ${state.padEnd(20)} ${fy}  ${found.pdf.split('/').pop()}` +
      `${PINNED[state] ? '  (pinned)' : ''}\n`
  );
}

for (const s of stale) process.stderr.write(`  ! ${s}\n`);

const manifest = {
  _comment:
    'GENERATED by scripts/prs-discover.js. The latest PRS Budget Analysis per ' +
    'state, except where a `pinned` entry says otherwise — a newer paper that ' +
    'drops the sector table is not usable, see PINNED in the script. `state` ' +
    'is the PRS slug and must match a states.slug before ingest/run-states.js ' +
    'will use it.',
  index: INDEX,
  discoveredOn: new Date().toISOString().slice(0, 10),
  targets,
  ...(missing.length ? { noPdfLinked: missing } : {}),
};

const json = JSON.stringify(manifest, null, 2) + '\n';

if (checkOnly) {
  const existing = await readFile(OUT, 'utf8').catch(() => null);
  const strip = (t) => (t ?? '').replace(/"discoveredOn": "[^"]*",?\n/, '');
  if (strip(existing) === strip(json)) {
    console.log('ingest/prs-targets.json matches prsindia.org');
  } else {
    console.error(
      'ingest/prs-targets.json is out of date — run `node scripts/prs-discover.js` ' +
        'and review the diff.'
    );
    process.exitCode = 1;
  }
} else {
  await writeFile(OUT, json);
  console.log(
    `wrote ingest/prs-targets.json — ${targets.length} states` +
      (missing.length ? `, ${missing.length} with no PDF linked` : '')
  );
}
