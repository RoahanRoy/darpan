/* Checks on repairSectorName().

   Four sector names reached the published page mis-assembled, and every one
   of them read as a plausible row: correct figures, correct source, a name
   that was simply wrong. The cause is that a provision sentence running off
   the end of a line without a full stop looks exactly like a wrapped sector
   name — Title-Case, no digits, no terminator — so the parser took the
   sentence's tail as part of the next row's heading.

   The four cases below are the real ones, transcribed from the papers. They
   are the test because they are the evidence: each is junk prefixed to a
   genuine head, which is what makes trimming to the head safe.

   No database and no PDF — this is pure string work. */

import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost/none';

const { repairSectorName, isKnownSector } = await import(
  '../ingest/adapters/prs-state-budget.js'
);

test('a clean head is returned untouched, with nothing trimmed', () => {
  const { name, trimmed } = repairSectorName('Health and Family Welfare');
  assert.equal(name, 'Health and Family Welfare');
  assert.equal(trimmed, null);
});

/* Maharashtra 2026-27: "Rs 26,500 crore has been allocated to" ran on into
   "Mukhyamantri Mazi Ladaki Bahin Yojana", which the parser then glued to
   the front of the next row's heading. */
test("Maharashtra's scheme name is trimmed off Rural Development", () => {
  const { name, trimmed } = repairSectorName(
    'Mukhyamantri Mazi Ladaki Bahin Yojana Rural Development'
  );
  assert.equal(name, 'Rural Development');
  assert.equal(trimmed, 'Mukhyamantri Mazi Ladaki Bahin Yojana');
});

test("Kerala's CM Sthree Suraksha Padhathi is trimmed off Health and Family Welfare", () => {
  const { name, trimmed } = repairSectorName(
    'Sthree Suraksha Padhathi Health and Family Welfare'
  );
  assert.equal(name, 'Health and Family Welfare');
  assert.equal(trimmed, 'Sthree Suraksha Padhathi');
});

test("Telangana's lowercase run-on is trimmed off Health and Family Welfare", () => {
  const { name, trimmed } = repairSectorName(
    'Telangana Limited for agricultural subsidies Health and Family Welfare'
  );
  assert.equal(name, 'Health and Family Welfare');
  assert.equal(trimmed, 'Telangana Limited for agricultural subsidies');
});

test("Tamil Nadu's TANGEDCO is trimmed off Rural Development", () => {
  const { name, trimmed } = repairSectorName('TANGEDCO Rural Development');
  assert.equal(name, 'Rural Development');
  assert.equal(trimmed, 'TANGEDCO');
});

/* The trimmed text is not cosmetic — it is the end of the previous row's
   provision sentence and gets restored there, so it has to come back whole. */
test('the trimmed text is returned so it can be put back on the previous row', () => {
  const { trimmed } = repairSectorName('Namo Shetkari Nidhi Yojana Transport');
  assert.equal(trimmed, 'Namo Shetkari Nidhi Yojana');
});

/* Trimming to a suffix must not eat a head that legitimately contains a
   shorter one. "Rural Development" ends "Urban Development"? No — but
   "Development" alone would match both, which is why heads are matched whole
   rather than by their last word. */
test('a head is not confused with another head that shares its ending', () => {
  assert.equal(repairSectorName('Urban Development').name, 'Urban Development');
  assert.equal(repairSectorName('Rural Development').name, 'Rural Development');
});

/* A head PRS has not published before must survive untouched. Forcing it into
   the nearest known head would be inventing a figure's label. */
test('an unrecognised name is left alone rather than forced into a head', () => {
  const { name, trimmed } = repairSectorName('Disaster Management');
  assert.equal(name, 'Disaster Management');
  assert.equal(trimmed, null);
  assert.equal(isKnownSector('Disaster Management'), false);
});

test('whitespace is normalised before matching', () => {
  assert.equal(repairSectorName('  Police  ').name, 'Police');
  assert.equal(repairSectorName('TANGEDCO   Rural   Development').name, 'Rural Development');
});

test('isKnownSector recognises every head the papers use', () => {
  for (const head of [
    'Education, Sports, Arts, and Culture', 'Health and Family Welfare',
    'Social Welfare and Nutrition', 'Welfare of SC, ST, OBC, and Minorities',
    'Agriculture and Allied Activities', 'Irrigation and Flood Control',
    'Water Supply and Sanitation', 'Rural Development', 'Urban Development',
    'Roads and Bridges', 'Transport', 'Housing', 'Police', 'Energy',
  ]) {
    assert.equal(isKnownSector(head), true, head);
  }
});
