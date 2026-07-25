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
  changedStates,
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
  const changed = changedStates({ store, live, fields: newsFields, sort: newestFirst });
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
  assert.deepEqual(changedStates({ store, live, fields: newsFields, sort: newestFirst }), []);
});

test('a changed summary marks the state changed', () => {
  const store = {
    goa: [{ headline: 'A', published_on: '2026-03-10', summary: 'new wording', outlet: 'x', url: 'u1' }],
  };
  const live = [
    { slug: 'goa', headline: 'A', published_on: '2026-03-10', summary: 'old wording', outlet: 'x', url: 'u1' },
  ];
  assert.deepEqual(changedStates({ store, live, fields: newsFields, sort: newestFirst }), ['goa']);
});

test('a state in the store with no live rows is a change; one absent from the store is not', () => {
  const store = {
    goa: [{ headline: 'A', published_on: '2026-03-10', summary: '', outlet: 'x', url: 'u1' }],
  };
  // bihar is live but unmentioned by the store — it must never be touched.
  const live = [
    { slug: 'bihar', headline: 'Z', published_on: '2026-02-02', summary: '', outlet: 'y', url: 'z1' },
  ];
  assert.deepEqual(changedStates({ store, live, fields: newsFields, sort: newestFirst }), ['goa']);
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
  assert.deepEqual(changedStates({ store, live, fields: newsFields, sort: newestFirst }), ['goa']);
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
  assert.deepEqual(changedStates({ store, live, fields: newsFields, sort: newestFirst }), []);
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
  assert.deepEqual(changedStates({ store, live: same, fields: s.fields, sort: s.sort }), []);

  // Same rows, opposite order: findings have no sort, so order is meaningful
  // and this is a real difference.
  const swapped = [same[1], same[0]].map((r) => ({ ...r }));
  assert.deepEqual(changedStates({ store, live: swapped, fields: s.fields, sort: s.sort }), ['goa']);
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
  const a = { exam_name: 'A', conducting_body: 'x', occurred_year: 2022, outcome: 'o', summary: 's', outlet: 'p', url: 'u1' };
  const b = { exam_name: 'B', conducting_body: 'x', occurred_year: 2022, outcome: 'o', summary: 's', outlet: 'p', url: 'u2' };
  const live = [{ slug: 'goa', ...a }, { slug: 'goa', ...b }];

  assert.deepEqual(changedStates({ store: { goa: [a, b] }, live, fields: s.fields, sort: s.sort }), []);
  assert.deepEqual(changedStates({ store: { goa: [b, a] }, live, fields: s.fields, sort: s.sort }), []);
});

test('the union scope is just another key, and its rows are not a state\'s', () => {
  const s = storeById('leaks');
  assert.equal(s.unscopedKey, 'union');

  const union = { exam_name: 'NEET-UG', conducting_body: 'NTA', occurred_year: 2026, outcome: 'Cancelled', summary: 's', outlet: 'p', url: 'u1' };
  const state = { exam_name: 'REET', conducting_body: 'BSER', occurred_year: 2021, outcome: 'Cancelled', summary: 's', outlet: 'p', url: 'u2' };

  // liveSql labels a NULL state_id 'union', so a scope that differs is
  // reported on its own without touching the other.
  const live = [{ slug: 'union', ...union }, { slug: 'rajasthan', ...state }];
  const store = { union: [union], rajasthan: [{ ...state, outcome: 'Held' }] };
  assert.deepEqual(
    changedStates({ store, live, fields: s.fields, sort: s.sort }),
    ['rajasthan']
  );
});

test('leaks validate() refuses a year that is not an integer', () => {
  const s = storeById('leaks');
  const bad = [
    { exam_name: 'REET', occurred_year: '2021' },
    { exam_name: 'UPTET', occurred_year: 2021 },
  ];
  assert.deepEqual(s.validate(bad, 'rajasthan'), [
    'rajasthan: occurred_year must be an integer: REET',
  ]);
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
