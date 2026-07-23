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
