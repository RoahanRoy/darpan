/* The number formatters, which decide how every figure on the site reads.

   These are worth pinning because the failure mode is silent: a formatter
   that rounds or groups wrongly still renders a plausible-looking number, and
   a plausible wrong number is precisely what this project exists not to
   publish. Indian grouping (1,01,175 rather than 101,175) depends on the ICU
   data in the Node build, so it is asserted rather than assumed. */

import assert from 'node:assert/strict';
import { test } from 'node:test';

// api/_lib/db.js opens a Neon client at import time and requires the URL to
// be present. Nothing here connects — the tests touch only pure functions —
// but the module still has to load, so it gets a syntactically valid dummy.
process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost/none';
const { formatCrore, formatCount, pct } = await import('../api/_lib/db.js');

test('formatCrore groups in the Indian system', () => {
  assert.equal(formatCrore(101175), '₹1,01,175 Cr');
  assert.equal(formatCrore(999), '₹999 Cr');
});

test('formatCrore shows whole crore', () => {
  // Sub-crore precision is noise at this scale, but it must round rather
  // than truncate or the column will not sum to the published total.
  assert.equal(formatCrore(1203.6), '₹1,204 Cr');
  assert.equal(formatCrore(1203.2), '₹1,203 Cr');
});

test('formatCrore separates symbol and unit with a non-breaking space', () => {
  // A normal space lets "₹1,203" and "Cr" wrap onto separate lines, which
  // reads as a different number entirely.
  assert.ok(formatCrore(1203).includes(' '));
  assert.ok(!formatCrore(1203).includes(' '));
});

test('formatCount switches to lakh and crore at the Indian thresholds', () => {
  assert.equal(formatCount(4321), '4,321');
  assert.equal(formatCount(99_999), '99,999');
  assert.equal(formatCount(100_000), '1.00 L');
  assert.equal(formatCount(120_000), '1.20 L');
  assert.equal(formatCount(9_999_999), '100.00 L');
  assert.equal(formatCount(10_000_000), '1.00 Cr');
  assert.equal(formatCount(21_000_000), '2.10 Cr');
});

test('pct rounds to whole percent', () => {
  assert.equal(pct(50, 200), 25);
  assert.equal(pct(2, 3), 67);
});

test('pct returns 0 rather than Infinity or NaN on a zero or absent whole', () => {
  // Reached whenever a sector was budgeted nothing. Infinity would render as
  // a bar wider than its track; NaN would render as "NaN%".
  assert.equal(pct(5, 0), 0);
  assert.equal(pct(5, null), 0);
  assert.equal(pct(5, undefined), 0);
});

test('pct accepts the numeric strings the pg driver returns for NUMERIC', () => {
  // node-postgres hands NUMERIC back as a string to avoid float loss, so the
  // formatters must not assume they were given numbers.
  assert.equal(pct('50', '200'), 25);
});
