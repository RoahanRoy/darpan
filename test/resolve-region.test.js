/* Checks on resolveRegion(), which decides what a URL is asking for.

   The case worth pinning hardest is the bare path. It used to redirect to
   Uttarakhand, so every reader who typed the domain landed on one state's
   figures with that state's name in the picker and no indication the choice
   was not theirs. With two states that read as a front page; with all
   thirty-six it reads as an answer to a question nobody asked. */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveRegion } from '../src/lib/resolveRegion.js';

const REGIONS = [
  {
    slug: 'uttarakhand',
    name: 'Uttarakhand',
    hasRecords: true,
    districts: [{ slug: 'uttarkashi' }, { slug: 'dehradun' }],
  },
  { slug: 'bihar', name: 'Bihar', hasRecords: false, districts: [{ slug: 'patna' }] },
  { slug: 'ladakh', name: 'Ladakh', hasRecords: false, districts: [] },
];

test('before regions load, nothing is decided', () => {
  assert.deepEqual(resolveRegion([], null, null), { status: 'pending' });
});

test('a bare path asks for a state instead of picking one', () => {
  assert.deepEqual(resolveRegion(REGIONS, null, null), { status: 'choose' });
});

test('a bare path does not resolve even when an area is somehow named', () => {
  // Cannot arise from parseRoute, but the guard must not depend on that.
  assert.equal(resolveRegion(REGIONS, null, 'dehradun').status, 'choose');
});

test('a state we do not list is reported, never substituted', () => {
  const r = resolveRegion(REGIONS, 'westeros', null);
  assert.equal(r.status, 'unknown-state');
  assert.equal(r.state, undefined);
});

test('a state with no area canonicalises to the preferred one', () => {
  const r = resolveRegion(REGIONS, 'uttarakhand', null);
  assert.equal(r.status, 'canonicalise');
  assert.equal(r.area.slug, 'dehradun');
});

test('a state without the preferred area falls back to its own first', () => {
  const r = resolveRegion(REGIONS, 'bihar', null);
  assert.equal(r.status, 'canonicalise');
  assert.equal(r.area.slug, 'patna');
});

test('a state with no areas loaded says so rather than redirecting', () => {
  assert.equal(resolveRegion(REGIONS, 'ladakh', null).status, 'no-areas');
});

test('an area belonging to another state is not accepted', () => {
  // Dehradun is real, but not in Bihar. Resolving it would put Uttarakhand's
  // delivery figures under Bihar's budget.
  const r = resolveRegion(REGIONS, 'bihar', 'dehradun');
  assert.equal(r.status, 'unknown-area');
  assert.equal(r.state.slug, 'bihar');
});

test('a state and one of its own areas resolve', () => {
  const r = resolveRegion(REGIONS, 'uttarakhand', 'dehradun');
  assert.equal(r.status, 'ok');
  assert.equal(r.state.slug, 'uttarakhand');
  assert.equal(r.area.slug, 'dehradun');
});

test('a state with no published figures still resolves — the page says so', () => {
  // Every state is clickable on the map, so this path is reachable by design.
  // Refusing it here would make the map's grey states dead ends again.
  const r = resolveRegion(REGIONS, 'bihar', 'patna');
  assert.equal(r.status, 'ok');
});
