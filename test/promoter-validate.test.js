/* Checks on the state_sector_budgets promoter's validate().

   The split between `errors` and `warnings` is the thing worth pinning. It
   decides whether one odd row stops an entire state's ingestion or gets put
   in front of a reviewer, and getting it backwards fails in two opposite and
   equally bad ways: a broken parse landing silently, or thirty states never
   updating because one paper's arithmetic is off.

   No database — validate() is pure. */

import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost/none';

const { validate } = await import('../ingest/promoters/state-sector-budgets.js');

/** A row whose figures agree with the percentage the paper prints. */
function sound(overrides = {}) {
  return {
    state_slug: 'gujarat',
    sector: 'Transport',
    actuals_prev_cr: 22902,
    budgeted_cr: 24980,
    revised_cr: 23782,
    next_budget_cr: 29929,
    _published_pct_change: 26, // (29929 - 23782) / 23782 = 25.8%
    ...overrides,
  };
}

test('a sound row raises nothing', () => {
  const { errors, warnings } = validate(sound());
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('a missing sector name is an error, because the parse is broken', () => {
  const { errors } = validate(sound({ sector: null }));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /sector missing/);
});

test('a negative figure is an error', () => {
  const { errors } = validate(sound({ revised_cr: -1 }));
  assert.match(errors.join(), /negative/);
});

test('budgeted and revised are both required — the gap is the point', () => {
  const { errors } = validate(sound({ revised_cr: null }));
  assert.match(errors.join(), /budgeted_cr and revised_cr are both required/);
});

/* Gujarat 2026-27, Urban Development. The paper prints 23%; its four figures
   give 11%, and the paper's own annexure of 2024-25 actuals confirms our
   reading of the first column. So the figures are right and the printed
   percentage is wrong — which a reviewer can establish and this cannot. It
   must not throw away the state's other nine sectors to say so. */
test('a percentage the document contradicts is a warning, not an error', () => {
  const { errors, warnings } = validate(
    sound({
      sector: 'Urban Development',
      actuals_prev_cr: 17892,
      budgeted_cr: 25750,
      revised_cr: 25779,
      next_budget_cr: 28646,
      _published_pct_change: 23,
    })
  );

  assert.deepEqual(errors, [], 'the row is structurally fine and must still stage');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /paper prints 23%/);
  assert.match(warnings[0], /our columns give 11%/);
});

test('rounding either way is tolerated, so a 1% difference is not flagged', () => {
  // (29929 - 23782) / 23782 rounds to 26; the paper printing 25 is the same
  // number read to a different precision, not a disagreement.
  const { warnings } = validate(sound({ _published_pct_change: 25 }));
  assert.deepEqual(warnings, []);
});

test('a paper that prints no percentage is not second-guessed', () => {
  const { errors, warnings } = validate(sound({ _published_pct_change: null }));
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});
