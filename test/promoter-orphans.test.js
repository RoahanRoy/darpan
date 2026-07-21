/* Checks on the state_sector_budgets promoter's findOrphans().

   The bug this exists to prevent reached the page once. Promoting Delhi's
   2026-27 paper left two 2025-26 rows behind — Education under its old
   spelling, because PRS added an Oxford comma, and Police, because Delhi
   Police is a central subject and left the paper. The state rendered twelve
   sectors from two fiscal years, with Education twice.

   The promoter cannot see that: it upserts on (state, sector), so a row
   nobody proposed is a row it never looks at. findOrphans is the thing that
   looks, and these are the cases it has to get right.

   No real database — the client is stubbed, because what is being tested is
   the set arithmetic, not the query. */

import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost/none';

const { findOrphans } = await import('../ingest/promoters/state-sector-budgets.js');

/** A client that answers findOrphans's one query with `live`. */
function clientWith(live) {
  return {
    async query(_sql, [slugs]) {
      return { rows: live.filter((r) => slugs.includes(r.state_slug)) };
    },
  };
}

const row = (state_slug, sector, extra = {}) => ({
  id: `${state_slug}:${sector}`,
  state_slug,
  sector,
  next_budget_cr: 100,
  source_slug: 'prs-old',
  provision_note: null,
  ...extra,
});

test('a run that republishes every live sector strands nothing', async () => {
  const live = [row('bihar', 'Police'), row('bihar', 'Energy')];
  const payloads = [
    { state_slug: 'bihar', sector: 'Police' },
    { state_slug: 'bihar', sector: 'Energy' },
  ];

  assert.deepEqual(await findOrphans(clientWith(live), payloads), []);
});

test('a sector renamed by the publisher strands the old spelling', async () => {
  // The Oxford comma that produced two Delhi Educations.
  const live = [row('delhi', 'Education, Sports, Arts and Culture')];
  const payloads = [{ state_slug: 'delhi', sector: 'Education, Sports, Arts, and Culture' }];

  const orphans = await findOrphans(clientWith(live), payloads);
  assert.equal(orphans.length, 1);
  assert.equal(orphans[0].sector, 'Education, Sports, Arts and Culture');
});

test('a sector that left the paper is stranded', async () => {
  const live = [row('delhi', 'Police'), row('delhi', 'Energy')];
  const payloads = [{ state_slug: 'delhi', sector: 'Energy' }];

  const orphans = await findOrphans(clientWith(live), payloads);
  assert.deepEqual(orphans.map((o) => o.sector), ['Police']);
});

test('a new sector in the paper is not an orphan — it is just new', async () => {
  const live = [row('delhi', 'Energy')];
  const payloads = [
    { state_slug: 'delhi', sector: 'Energy' },
    { state_slug: 'delhi', sector: 'Housing' },
  ];

  assert.deepEqual(await findOrphans(clientWith(live), payloads), []);
});

/* The check has to be scoped per state. Every state's paper omits sectors
   some other state publishes, so comparing against a global sector list
   would report most of the country as orphaned on every single run. */
test('another state\'s sectors are never stranded by this state\'s run', async () => {
  const live = [row('bihar', 'Police'), row('kerala', 'Police')];
  const payloads = [{ state_slug: 'bihar', sector: 'Police' }];

  assert.deepEqual(await findOrphans(clientWith(live), payloads), []);
});

test('a run covering several states strands only what each one dropped', async () => {
  const live = [
    row('bihar', 'Police'),
    row('bihar', 'Energy'),
    row('kerala', 'Transport'),
  ];
  const payloads = [
    { state_slug: 'bihar', sector: 'Police' },
    { state_slug: 'kerala', sector: 'Housing' },
  ];

  const orphans = await findOrphans(clientWith(live), payloads);
  assert.deepEqual(
    orphans.map((o) => `${o.state_slug}|${o.sector}`).sort(),
    ['bihar|Energy', 'kerala|Transport']
  );
});

/* The reviewer's gloss is the only hand-made field on these rows, and the
   retire path refuses to delete one without being told to. It can only do
   that if findOrphans carries the note back. */
test('a stranded row carries its provision note back for the guard to see', async () => {
  const live = [row('delhi', 'Police', { provision_note: 'Rs 183 crore for FSLs.' })];
  const payloads = [{ state_slug: 'delhi', sector: 'Energy' }];

  const [orphan] = await findOrphans(clientWith(live), payloads);
  assert.equal(orphan.provision_note, 'Rs 183 crore for FSLs.');
});
