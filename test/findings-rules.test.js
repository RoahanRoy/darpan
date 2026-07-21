/* Checks on the rules that turn a sector table into findings.

   These sentences carry figures and years, and they are generated rather than
   quoted, so nothing external will contradict them if they are wrong. A
   plausible sentence with the wrong year in it is the failure mode worth
   guarding: it reads perfectly and cites a real document.

   No database — findingsFor is given rows and returns sentences. */

import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost/none';

const { findingsFor, fiscalYears } = await import('../ingest/findings-rules.js');

const row = (sector, be, re, nbe, source_slug = 'prs-testland-2026-27') => ({
  state: 'testland', source_slug, sector, be, re, nbe,
});

/* The four columns mean different years in different papers, and the only
   thing that says which is the fiscal year in the source slug. Verified
   against the papers themselves: the West Bengal 2026-27 analysis heads its
   sector table "2024-25 Actuals / 2025-26 BE", and the Tamil Nadu 2025-26
   analysis heads the same table "2023-24 Actuals / 2024-25 BE". */
test('a 2026-27 paper reports 2025-26 as the year that was revised', () => {
  assert.deepEqual(fiscalYears('prs-west-bengal-2026-27'), {
    next: '2026-27', current: '2025-26', prev: '2024-25',
  });
});

test('a 2025-26 paper shifts every column back one year', () => {
  assert.deepEqual(fiscalYears('prs-tamil-nadu-2025-26'), {
    next: '2025-26', current: '2024-25', prev: '2023-24',
  });
});

test('a decade boundary keeps two digits on the second year', () => {
  assert.equal(fiscalYears('prs-x-2009-10').current, '2008-09');
  assert.equal(fiscalYears('prs-x-2100-01').next, '2100-01');
});

test('a source slug carrying no fiscal year is refused rather than guessed', () => {
  assert.throws(() => fiscalYears('prs-uk'), /cannot read a fiscal year/);
});

/* A percentage off a small base is the way arithmetic overstates. Nagaland's
   Housing head really does move +357%, and it is Rs 375 crore — worth
   reporting there because the state's whole sector budget is Rs 11,905 crore.
   The same percentage inside a large state would not be. */
test('a large percentage on an immaterial sum is not reported', () => {
  const rows = [
    row('Housing', 100, 10, 90),          // -90% then +800%, on a trivial base
    row('Energy', 10000, 10000, 10000),   // the rest of the budget
  ];
  const headlines = findingsFor(rows).map((f) => f.headline);
  assert.ok(!headlines.some((h) => h.startsWith('Housing revised')), headlines.join(' | '));
});

test('the same shape of move is reported when it is material to the state', () => {
  const rows = [row('Housing', 1000, 100, 900), row('Energy', 1000, 1000, 1000)];
  const headlines = findingsFor(rows).map((h) => h.headline);
  assert.ok(headlines.some((h) => /^Housing revised down 90%, then budgeted up 800%/.test(h)),
    headlines.join(' | '));
});

/* Cut and restored is one story. Reported as two it reads as an underspend
   and an unrelated expansion, when the point is that it is the same money
   going back where it came from. */
test('a sector cut then restored produces one finding, not two', () => {
  const rows = [row('Housing', 1000, 300, 950), row('Energy', 1000, 1000, 1000)];
  const housing = findingsFor(rows).filter((f) => f.headline.startsWith('Housing'));
  assert.equal(housing.length, 1);
  assert.match(housing[0].headline, /revised down 70%, then budgeted up 217%/);
  assert.equal(housing[0].kind, 'underspend');
});

test('an aggregate revised far above budget is reported, not only shortfalls', () => {
  // Bihar's real shape: these heads were revised up 49% against budget.
  const rows = [row('Energy', 100000, 149000, 110000)];
  const [first] = findingsFor(rows);
  assert.equal(first.kind, 'allocation');
  assert.match(first.headline, /^2025-26 spending was revised 49% above budget/);
});

test('an aggregate revised below budget is reported as a shortfall', () => {
  const rows = [row('Energy', 100000, 80000, 90000)];
  const [first] = findingsFor(rows);
  assert.equal(first.kind, 'shortfall');
  assert.match(first.headline, /^2025-26 spending was revised 20% below budget/);
});

/* The revised estimate is what the government expected to spend, not what it
   spent — actuals arrive a year later. Saying "spent" would assert something
   no column in the table supports. */
test('the aggregate finding says revised, never spent', () => {
  const [first] = findingsFor([row('Energy', 100000, 80000, 90000)]);
  assert.doesNotMatch(first.headline, /\bspent\b/);
});

/* Every state has to come out with something. A state whose budget simply
   held together has no gap to report, and an empty feed would read as
   missing data rather than as a quiet year. */
test('a state with no gaps at all still gets its largest head', () => {
  const rows = [row('Energy', 1000, 1000, 1000), row('Police', 500, 500, 500)];
  const out = findingsFor(rows);
  assert.equal(out.length, 1);
  assert.equal(out[0].headline, 'Energy takes 67% of sector spending in 2026-27');
  assert.equal(out[0].tag_label, 'Largest head');
});

test('every finding is marked as computed and cites the paper it came from', () => {
  for (const f of findingsFor([row('Energy', 1000, 600, 1400)])) {
    assert.equal(f.computed_from_source, true);
    assert.equal(f.source_slug, 'prs-testland-2026-27');
  }
});

/* The feed shows five at most. Kerala and West Bengal both generate more. */
test('a state with many gaps is capped rather than flooding its feed', () => {
  const rows = Array.from({ length: 12 }, (_, i) => row(`Sector ${i}`, 1000, 400, 1600));
  assert.ok(findingsFor(rows).length <= 5);
});

/* The kinds are constrained by a CHECK on the findings table. A kind outside
   the four would be rejected by Postgres at apply time, on a run that has
   already deleted the rows it was replacing. */
test('only kinds the findings table accepts are ever produced', () => {
  const allowed = new Set(['audit', 'underspend', 'allocation', 'shortfall']);
  const rows = [
    row('Housing', 1000, 300, 950), row('Energy', 1000, 900, 1500),
    row('Police', 1000, 700, 800), row('Transport', 5000, 4000, 4200),
  ];
  for (const f of findingsFor(rows)) assert.ok(allowed.has(f.kind), f.kind);
});
