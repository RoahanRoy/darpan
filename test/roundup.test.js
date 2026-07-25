/* The front page's roundup, and the promise attached to it.

   Two different things are pinned here. The arithmetic in
   scripts/lib/roundup.js decides whether a workflow opens an issue, so it is
   worth testing that it says "due" on the right day and not a day either
   side. And the shipped file itself is checked — that every item really does
   fall inside the twelve months the block claims, which is the sort of thing
   that rots quietly during a refresh and shows up on a public front page. */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  daysBetween,
  itemsOutsideWindow,
  reviewStatus,
  windowMonths,
} from '../scripts/lib/roundup.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = JSON.parse(
  await readFile(join(root, 'ingest', 'policy-roundup.json'), 'utf8')
);
const items = file.roundup.india;

const review = { covers_from: '2025-07-26', covers_to: '2026-07-25', next_review_by: '2026-10-25' };

test('a review is due on its date, not the day after', () => {
  // Off-by-one here is a month of silence: the next run is the 1st.
  assert.equal(reviewStatus(review, '2026-10-24').due, false);
  assert.equal(reviewStatus(review, '2026-10-25').due, true);
  assert.equal(reviewStatus(review, '2026-10-26').daysOverdue, 1);
});

test('days are counted without parsing a date string into a zone', () => {
  assert.equal(daysBetween('2026-01-01', '2026-01-31'), 30);
  assert.equal(daysBetween('2026-02-28', '2026-03-01'), 1); // 2026 is not a leap year
  assert.equal(daysBetween('2025-12-31', '2026-01-01'), 1);
  assert.equal(daysBetween('2026-07-25', '2026-07-25'), 0);
});

test('an item on either boundary is inside the window; one past it is not', () => {
  const at = (d) => ({ happened_on: d, headline: d });
  assert.deepEqual(itemsOutsideWindow([at('2025-07-26'), at('2026-07-25')], review), []);
  assert.deepEqual(itemsOutsideWindow([at('2025-07-25')], review), ['2025-07-25 2025-07-25']);
  assert.deepEqual(itemsOutsideWindow([at('2026-07-26')], review), ['2026-07-26 2026-07-26']);
});

test('the shipped roundup declares a twelve-month window and stays inside it', () => {
  assert.equal(windowMonths(file.review), 12);
  assert.deepEqual(itemsOutsideWindow(items, file.review), []);
});

test('the next review is a quarter after the window closes', () => {
  // Three months, not "some time later": the block tells readers it is
  // reviewed quarterly, and this is the only place that claim is enforced.
  assert.equal(daysBetween(file.review.covers_to, file.review.next_review_by) >= 89, true);
  assert.equal(daysBetween(file.review.covers_to, file.review.next_review_by) <= 93, true);
});

test('every roundup item carries a source and says what it lands on', () => {
  // `impact` is the one line here that is not restated from a press release,
  // and the one a hurried refresh would drop first.
  for (const i of items) {
    assert.ok(i.headline?.length > 10, `headline missing: ${i.happened_on}`);
    assert.ok(i.summary?.length > 40, `summary too thin: ${i.headline}`);
    assert.ok(i.impact?.length > 40, `impact too thin: ${i.headline}`);
    assert.ok(i.outlet?.length, `outlet missing: ${i.headline}`);
    assert.match(i.url, /^https:\/\//, `url must be https: ${i.headline}`);
    assert.match(i.happened_on, /^\d{4}-\d{2}-\d{2}$/, `bad date: ${i.headline}`);
    assert.ok(i.region_label?.length, `region_label missing: ${i.headline}`);
  }
});
