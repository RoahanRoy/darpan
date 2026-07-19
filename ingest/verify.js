/* Asserts the PRS adapter reproduces the figures a human read off the same
   PDFs and typed into db/seed.sql. Usage: npm run ingest:verify

   This is the regression test that makes automated parsing defensible at all.
   The expectations below are not the adapter's own output blessed after the
   fact — they were transcribed by hand in commit 13266a9, before this parser
   existed. If PRS changes the layout, or a regex drifts, this fails loudly
   rather than quietly staging wrong numbers for a reviewer to rubber-stamp.

   Hits the network. No database needed. */

import { run } from './adapters/prs-state-budget.js';

const CASES = [
  {
    stateSlug: 'uttarakhand',
    fiscalYear: '2025-26',
    url: 'https://prsindia.org/files/budget/budget_state/uttarakhand/2025/Uttarakhand_Budget_Analysis_2025-26.pdf',
    documentDate: '2025-03-30',
    // sector → [2023-24 actuals, 2024-25 BE, 2024-25 RE, 2025-26 BE]
    sectors: {
      'Education, Sports, Arts, and Culture': [10268, 11700, 11931, 12466],
      'Agriculture and Allied Activities': [3690, 4450, 4451, 5051],
      'Health and Family Welfare': [4597, 4574, 4383, 4748],
      'Social Welfare and Nutrition': [4348, 4572, 5380, 4509],
      'Rural Development': [3713, 4552, 4259, 4363],
      'Water Supply and Sanitation': [1731, 1186, 1220, 3131],
      Police: [2323, 2667, 2615, 2856],
      Transport: [2570, 2894, 2878, 2648],
      'Irrigation and Flood Control': [1162, 2175, 1822, 1926],
      Energy: [673, 1263, 911, 1403],
    },
  },
  {
    stateSlug: 'delhi',
    fiscalYear: '2025-26',
    url: 'https://prsindia.org/files/budget/budget_state/delhi/2025/Delhi_Budget_Analysis_2025-26.pdf',
    documentDate: '2025-03-31',
    sectors: {
      'Education, Sports, Arts, and Culture': [14681, 16146, 15924, 19039],
    },
  },
];

let failures = 0;

function fail(msg) {
  failures++;
  console.error(`  ✗ ${msg}`);
}

for (const c of CASES) {
  console.log(`\n${c.stateSlug} ${c.fiscalYear}`);
  let result;
  try {
    result = await run(c);
  } catch (err) {
    fail(`adapter threw: ${err.message}`);
    continue;
  }

  if (result.document.documentDate !== c.documentDate) {
    fail(`document date: got ${result.document.documentDate}, expected ${c.documentDate}`);
  } else {
    console.log(`  ✓ document date ${c.documentDate}`);
  }

  const parsed = new Map(
    result.facts.map((f) => [
      f.payload.sector,
      [
        f.payload.actuals_prev_cr,
        f.payload.budgeted_cr,
        f.payload.revised_cr,
        f.payload.next_budget_cr,
      ],
    ])
  );

  for (const [sector, expected] of Object.entries(c.sectors)) {
    const got = parsed.get(sector);
    if (!got) {
      fail(`missing sector "${sector}" (parsed: ${[...parsed.keys()].join(' | ')})`);
      continue;
    }
    if (got.join(',') !== expected.join(',')) {
      fail(`"${sector}": got [${got}], expected [${expected}]`);
      continue;
    }
    console.log(`  ✓ ${sector} [${got}]`);
  }
}

console.log(failures === 0 ? '\nall checks passed' : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
