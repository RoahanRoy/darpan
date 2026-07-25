/* Checks on the store-diff logic that decides what db:sync writes.

   These functions are the part that can silently do the wrong thing: a diff
   that misses a change leaves the site stale, and one that sees a change where
   there is none rewrites prose for no reason. Both are quiet failures — the
   apply succeeds either way — so they are worth pinning without a database.

   No database here: every function takes rows and a store and returns what
   differs. scripts/sync.js is the half that talks to Neon. */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  changedScopes,
  LEAK_STATUSES,
  columnDiff,
  groupBySlug,
  shapeOf,
  STORES,
  storeById,
} from '../scripts/lib/stores.js';

const newsFields = storeById('news').fields;
const newestFirst = storeById('news').sort;

test('a state whose rows match in dated order is unchanged', () => {
  const store = {
    goa: [
      { headline: 'B', published_on: '2026-03-01', summary: '', outlet: 'x', url: 'u2' },
      { headline: 'A', published_on: '2026-03-10', summary: '', outlet: 'x', url: 'u1' },
    ],
  };
  // Live rows are already newest-first, the order the table holds them in.
  const live = [
    { slug: 'goa', headline: 'A', published_on: '2026-03-10', summary: '', outlet: 'x', url: 'u1' },
    { slug: 'goa', headline: 'B', published_on: '2026-03-01', summary: '', outlet: 'x', url: 'u2' },
  ];
  const changed = changedScopes({ store, live, fields: newsFields, sort: newestFirst });
  assert.deepEqual(changed, []);
});

test('reordering the store without changing dates does not count as a change', () => {
  // The sort is what makes this true: the store lists these oldest-first, the
  // table holds them newest-first, and they must still compare equal.
  const store = {
    goa: [
      { headline: 'old', published_on: '2026-01-01', summary: '', outlet: 'x', url: 'a' },
      { headline: 'new', published_on: '2026-09-09', summary: '', outlet: 'x', url: 'b' },
    ],
  };
  const live = [
    { slug: 'goa', headline: 'new', published_on: '2026-09-09', summary: '', outlet: 'x', url: 'b' },
    { slug: 'goa', headline: 'old', published_on: '2026-01-01', summary: '', outlet: 'x', url: 'a' },
  ];
  assert.deepEqual(changedScopes({ store, live, fields: newsFields, sort: newestFirst }), []);
});

test('a changed summary marks the state changed', () => {
  const store = {
    goa: [{ headline: 'A', published_on: '2026-03-10', summary: 'new wording', outlet: 'x', url: 'u1' }],
  };
  const live = [
    { slug: 'goa', headline: 'A', published_on: '2026-03-10', summary: 'old wording', outlet: 'x', url: 'u1' },
  ];
  assert.deepEqual(changedScopes({ store, live, fields: newsFields, sort: newestFirst }), ['goa']);
});

test('a state in the store with no live rows is a change; one absent from the store is not', () => {
  const store = {
    goa: [{ headline: 'A', published_on: '2026-03-10', summary: '', outlet: 'x', url: 'u1' }],
  };
  // bihar is live but unmentioned by the store — it must never be touched.
  const live = [
    { slug: 'bihar', headline: 'Z', published_on: '2026-02-02', summary: '', outlet: 'y', url: 'z1' },
  ];
  assert.deepEqual(changedScopes({ store, live, fields: newsFields, sort: newestFirst }), ['goa']);
});

/* The reported-loss fields (migration 005). What these pin down is that the
   figure and the scheme are part of what makes two items the same item: a
   correction to an amount is exactly the kind of edit that must reach the
   database, and it changes nothing else on the row. */

test('a corrected reported_amount marks the state changed', () => {
  const item = {
    category: 'loss',
    scheme_name: 'Gruha Lakshmi',
    headline: 'A',
    published_on: '2026-06-26',
    summary: 's',
    outlet: 'x',
    url: 'u1',
  };
  const store = { goa: [{ ...item, reported_amount: '₹115 crore' }] };
  const live = [{ slug: 'goa', ...item, reported_amount: '₹15 crore' }];
  assert.deepEqual(changedScopes({ store, live, fields: newsFields, sort: newestFirst }), ['goa']);
});

test('an item that names no scheme and no amount compares equal to NULL columns', () => {
  // Not every loss story names a scheme or carries a figure. The store leaves
  // the keys out; the database holds NULL. Those must not read as different.
  const store = {
    goa: [
      { category: 'loss', headline: 'A', published_on: '2026-06-28', summary: 's', outlet: 'x', url: 'u1' },
    ],
  };
  const live = [
    {
      slug: 'goa', category: 'loss', scheme_name: null, reported_amount: null,
      headline: 'A', published_on: '2026-06-28', summary: 's', outlet: 'x', url: 'u1',
    },
  ];
  assert.deepEqual(changedScopes({ store, live, fields: newsFields, sort: newestFirst }), []);
});

test('news values() writes the declared category and NULLs the fields left out', () => {
  const s = storeById('news');
  const row = s.values({
    category: 'loss',
    headline: 'A', summary: 's', outlet: 'x', url: 'u1', published_on: '2026-06-28',
  });
  assert.deepEqual(row, ['loss', null, null, 'A', 's', 'x', 'u1', '2026-06-28']);
});

test('news validate() refuses a category the schema would reject', () => {
  const s = storeById('news');
  const bad = [
    { category: 'scam', url: 'u1' },
    { category: 'budget', url: 'u2' },
    { category: 'loss', url: 'u3' },
  ];
  assert.deepEqual(s.validate(bad, 'goa'), [
    "goa: category must be 'budget' or 'loss': u1",
  ]);
});

test('findings compare without a sort, in store order', () => {
  const s = storeById('findings');
  const store = {
    goa: [
      { kind: 'gap', tag_label: 't', headline: 'h1', body: 'b1', source_slug: 'prs-goa' },
      { kind: 'gap', tag_label: 't', headline: 'h2', body: 'b2', source_slug: 'prs-goa' },
    ],
  };
  const same = [
    { slug: 'goa', kind: 'gap', tag_label: 't', headline: 'h1', body: 'b1', source_slug: 'prs-goa' },
    { slug: 'goa', kind: 'gap', tag_label: 't', headline: 'h2', body: 'b2', source_slug: 'prs-goa' },
  ];
  assert.deepEqual(changedScopes({ store, live: same, fields: s.fields, sort: s.sort }), []);

  // Same rows, opposite order: findings have no sort, so order is meaningful
  // and this is a real difference.
  const swapped = [same[1], same[0]].map((r) => ({ ...r }));
  assert.deepEqual(changedScopes({ store, live: swapped, fields: s.fields, sort: s.sort }), ['goa']);
});

/* Paper leaks (migration 006). The store's own shape is ordinary; what is
   worth pinning is the sort, because these are dated only to the year and a
   year alone does not order two incidents. */

test('leaks sort newest year first, ties broken by exam name', () => {
  const s = storeById('leaks');
  const sorted = s.sort([
    { occurred_year: 2021, exam_name: 'REET' },
    { occurred_year: 2024, exam_name: 'UGC-NET' },
    { occurred_year: 2021, exam_name: 'JEE (Main)' },
  ]);
  assert.deepEqual(
    sorted.map((l) => `${l.occurred_year} ${l.exam_name}`),
    ['2024 UGC-NET', '2021 JEE (Main)', '2021 REET']
  );
});

test('two leaks from one year compare equal however the store lists them', () => {
  // Without the exam-name tiebreak this is the failure: a total order that
  // is not total lets equal rows swap and reports a change nobody made.
  const s = storeById('leaks');
  const a = { exam_name: 'A', conducting_body: 'x', occurred_year: 2022, leak_status: 'confirmed', outcome: 'o', summary: 's', outlet: 'p', url: 'u1' };
  const b = { exam_name: 'B', conducting_body: 'x', occurred_year: 2022, leak_status: 'confirmed', outcome: 'o', summary: 's', outlet: 'p', url: 'u2' };
  const live = [{ slug: 'goa', ...a }, { slug: 'goa', ...b }];

  assert.deepEqual(changedScopes({ store: { goa: [a, b] }, live, fields: s.fields, sort: s.sort }), []);
  assert.deepEqual(changedScopes({ store: { goa: [b, a] }, live, fields: s.fields, sort: s.sort }), []);
});

test('the union scope is just another key, and its rows are not a state\'s', () => {
  const s = storeById('leaks');
  assert.equal(s.unscopedKey, 'union');

  const union = { exam_name: 'NEET-UG', conducting_body: 'NTA', occurred_year: 2026, leak_status: 'confirmed', outcome: 'Cancelled', summary: 's', outlet: 'p', url: 'u1' };
  const state = { exam_name: 'REET', conducting_body: 'BSER', occurred_year: 2021, leak_status: 'confirmed', outcome: 'Cancelled', summary: 's', outlet: 'p', url: 'u2' };

  // liveSql labels a NULL state_id 'union', so a scope that differs is
  // reported on its own without touching the other.
  const live = [{ slug: 'union', ...union }, { slug: 'rajasthan', ...state }];
  const store = { union: [union], rajasthan: [{ ...state, outcome: 'Held' }] };
  assert.deepEqual(
    changedScopes({ store, live, fields: s.fields, sort: s.sort }),
    ['rajasthan']
  );
});

test('leaks validate() refuses a year that is not an integer', () => {
  const s = storeById('leaks');
  const bad = [
    { exam_name: 'REET', occurred_year: '2021', leak_status: 'confirmed' },
    { exam_name: 'UPTET', occurred_year: 2021, leak_status: 'confirmed' },
  ];
  assert.deepEqual(s.validate(bad, 'rajasthan'), [
    'rajasthan: occurred_year must be an integer: REET',
  ]);
});

/* leak_status is what stops the block asserting that every row under
   "Question papers leaked" was a leak (migration 009). The column has a CHECK
   and is NOT NULL, so a bad value would be caught either way — but only after
   the scope's existing rows had been deleted inside the transaction, and the
   error would name a constraint rather than an exam. */
test('leaks validate() refuses an unknown or missing leak_status', () => {
  const s = storeById('leaks');
  const bad = [
    { exam_name: 'REET', occurred_year: 2021, leak_status: 'confirmed' },
    { exam_name: 'UPTET', occurred_year: 2021, leak_status: 'probably' },
    { exam_name: 'RO/ARO', occurred_year: 2024 },
  ];
  assert.deepEqual(s.validate(bad, 'uttar-pradesh'), [
    'uttar-pradesh: leak_status must be one of confirmed, alleged, suspected, denied: UPTET (2021)',
    'uttar-pradesh: leak_status must be one of confirmed, alleged, suspected, denied: RO/ARO (2024)',
  ]);
});

/* The four values are spelled in three places — the CHECK in migration 009,
   LEAK_STATUSES here, and the label map in PaperLeaks.jsx. This pins the set
   so that adding a fifth is a deliberate act in all of them rather than a
   value that reaches the page and renders as its own raw column text. */
test('the leak statuses are exactly the four the migration allows', () => {
  assert.deepEqual([...LEAK_STATUSES].sort(), ['alleged', 'confirmed', 'denied', 'suspected']);
});

/* The ministry breakdown repeats `basis` and the document on every one of a
   ministry's lines, because the store is a flat list per scope with nowhere
   else to put them (migration 010). That repetition is only safe because
   applying the store refuses when it has drifted — an editor who rewrote the
   sentence and missed two rows would otherwise leave a ministry saying two
   different things about what its own figures mean, and the page, which reads
   the first line, would print whichever won the sort. */
test('ministry-lines validate() refuses lines that disagree about the document', () => {
  const s = storeById('ministry-lines');
  const doc = {
    basis: 'Two departments.',
    document_title: 'DFG 2025-26: Jal Shakti',
    document_url: 'https://example.org/x.pdf',
    document_date: '2025-02-10',
  };
  const ok = [
    { label: 'A', parent_label: null, ...doc },
    { label: 'B', parent_label: null, ...doc },
  ];
  assert.deepEqual(s.validate(ok, 'jal-shakti'), []);

  const drifted = [
    { label: 'A', parent_label: null, ...doc },
    { label: 'B', parent_label: null, ...doc, basis: 'Two departments, sort of.' },
  ];
  assert.deepEqual(s.validate(drifted, 'jal-shakti'), [
    'jal-shakti: lines disagree about basis (2 values)',
  ]);
});

/* A line under a head that is not in the same ministry renders nowhere:
   MinistryLines builds the table from the top-level rows and hangs children
   off them, so an orphan is silently absent rather than misplaced. It is
   caught here instead, where it names the line. */
test('ministry-lines validate() refuses a line whose parent is not a head', () => {
  const s = storeById('ministry-lines');
  const doc = { basis: 'b', document_title: 't', document_url: 'u', document_date: '2025-02-10' };
  const bad = [
    { label: 'Police', parent_label: null, ...doc },
    { label: 'CAPF', parent_label: 'Police', ...doc },
    { label: 'Delhi Police', parent_label: 'Polce', ...doc },
  ];
  assert.deepEqual(s.validate(bad, 'home-affairs'), [
    'home-affairs: Delhi Police sits under "Polce", which is not a head here',
  ]);
});

/* NUMERIC comes back from Postgres as a string and the diff compares shapes
   as text, so a figure written as a JSON number would differ from the live
   row forever: every run would report the ministry changed, write it, and
   report it changed again. The leaks store has the mirror image of this trap
   with occurred_year, which must be a number. */
test('ministry-lines validate() refuses a money figure written as a number', () => {
  const s = storeById('ministry-lines');
  const doc = { basis: 'b', document_title: 't', document_url: 'u', document_date: '2025-02-10' };
  const bad = [
    { label: 'Salaries', parent_label: null, ...doc, next_budget_cr: 177923, revised_cr: null },
    { label: 'Pension', parent_label: null, ...doc, next_budget_cr: '160795.00' },
  ];
  assert.deepEqual(s.validate(bad, 'defence'), [
    'defence: Salaries.next_budget_cr must be a string, not number',
  ]);
});

/* The scope of a ministry store is a ministry, which is the first store whose
   keys are not states at all. sync.js resolves them against the table named
   here, so getting this wrong would look for ministry slugs in `states` and
   refuse every one of them. */
test('the ministry stores name the scope and column they actually write', () => {
  const lines = storeById('ministry-lines');
  assert.equal(lines.scopeTable, 'union_ministry_budgets');
  assert.equal(lines.scopeColumn, 'ministry_id');
  assert.ok(lines.refs.includes('union_ministry_budgets'));

  // Both halves of one file, so an edit to either is one diff to review.
  assert.equal(storeById('scheme-ministries').file, lines.file);
});

test('columnDiff separates a stale value from a missing row and a missing gloss', () => {
  const store = {
    'goa|Health': 'the health gloss',
    'goa|Roads': 'a gloss for a sector that no longer exists',
  };
  const live = [
    { id: 1, key: 'goa|Health', provision_note: 'an older wording' }, // toWrite
    { id: 2, key: 'goa|Education', provision_note: null },            // ungiven
  ];
  const { toWrite, unmatched, ungiven } = columnDiff({ store, live, column: 'provision_note' });

  assert.deepEqual(toWrite, [{ id: 1, key: 'goa|Health', text: 'the health gloss' }]);
  assert.deepEqual(unmatched, ['goa|Roads']);
  assert.deepEqual(ungiven, ['goa|Education']);
});

test('columnDiff leaves an already-correct value out of toWrite', () => {
  const store = { 'goa|Health': 'exact' };
  const live = [{ id: 1, key: 'goa|Health', provision_note: 'exact' }];
  const { toWrite, unmatched } = columnDiff({ store, live, column: 'provision_note' });
  assert.deepEqual(toWrite, []);
  assert.deepEqual(unmatched, []);
});

test('groupBySlug keeps rows in the order given', () => {
  const grouped = groupBySlug([
    { slug: 'a', n: 1 },
    { slug: 'b', n: 2 },
    { slug: 'a', n: 3 },
  ]);
  assert.deepEqual(grouped.get('a').map((r) => r.n), [1, 3]);
  assert.deepEqual(grouped.get('b').map((r) => r.n), [2]);
});

test('shapeOf treats an absent field and an explicit null alike', () => {
  const shape = shapeOf(['a', 'b']);
  assert.equal(shape({ a: 1, b: null }), shape({ a: 1 }));
  assert.notEqual(shape({ a: 1, b: 0 }), shape({ a: 1 }));
});

test('every store is one of the two known strategies', () => {
  for (const s of STORES) {
    assert.ok(['rows', 'column'].includes(s.strategy), `${s.id} has an unknown strategy`);
    if (s.strategy === 'rows') assert.ok(s.columns && s.values, `${s.id} rows store is incomplete`);
    if (s.strategy === 'column') assert.ok(s.column, `${s.id} column store names no column`);
  }
});
