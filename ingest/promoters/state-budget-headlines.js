/* Promoter: staged_facts → state_budget_headlines.

   The top-line budget facts — total expenditure, receipts, the two deficits,
   GSDP — read off the Budget Highlights block by the prs-state-budget adapter.
   Like every promoter, this is the only thing allowed to write those figures
   into a public table, and only for rows a human has approved.

   Unlike the sector promoter, this one deliberately has no findOrphans. A
   sector table is a set keyed by a mutable name, so a rename strands the old
   row; headlines are keyed by (state, fiscal_year, label) where the label is a
   fixed vocabulary and the year is part of the key. Re-ingesting a newer paper
   adds that year's rows alongside the old year's rather than replacing them,
   and the API reads the latest year — so there is nothing to strand. */

export const targetTable = 'state_budget_headlines';

const DIAGNOSTIC = (key) => key.startsWith('_');

/** The subset of a payload that counts as "the fact", for diffing. */
export function comparable(payload) {
  const out = {};
  for (const [k, v] of Object.entries(payload)) {
    if (DIAGNOSTIC(k)) continue;
    out[k] = k === 'amount_cr' && v != null ? Number(v) : v;
  }
  // Presentation, not fact — a reshuffle must not read as a changed figure.
  delete out.display_order;
  return out;
}

/** Checks run at stage time. An error abandons the run; the highlight block is
    boilerplate enough that a malformed figure means the parse drifted and the
    rows that look fine are no more trustworthy than the ones that don't. */
export function validate(payload) {
  const errors = [];
  const warnings = [];

  if (!payload.state_slug) errors.push('state_slug missing');
  if (!payload.fiscal_year) errors.push('fiscal_year missing');
  if (!payload.label) errors.push('label missing');

  const v = payload.amount_cr;
  // A revenue balance is exactly zero, so zero is valid; null and negative are
  // not — every headline here is a magnitude the paper prints as a positive
  // rupee figure, deficits included.
  if (v == null) errors.push('amount_cr is required');
  else if (!Number.isFinite(Number(v))) errors.push(`amount_cr is not a number: ${v}`);
  else if (Number(v) < 0) errors.push(`amount_cr is negative: ${v}`);

  return { errors, warnings };
}

/** Rows currently live, keyed the same way the adapter keys its proposals. */
export async function currentRows(client) {
  const { rows } = await client.query(`
    SELECT st.slug AS state_slug, h.fiscal_year, h.label, h.amount_cr, h.qualifier
    FROM state_budget_headlines h
    JOIN states st ON st.id = h.state_id
  `);

  return new Map(
    rows.map((r) => [
      `${r.state_slug}|${r.fiscal_year}|${r.label}`,
      comparable({
        state_slug: r.state_slug,
        fiscal_year: r.fiscal_year,
        label: r.label,
        amount_cr: r.amount_cr,
        qualifier: r.qualifier,
      }),
    ])
  );
}

/** Writes one approved row. Runs inside the caller's transaction. */
export async function promote(client, { payload, sourceId }) {
  const { rows } = await client.query(`SELECT id FROM states WHERE slug = $1`, [
    payload.state_slug,
  ]);
  if (!rows.length) {
    // Adapters do not invent geography. A state must be seeded before its
    // budget can be ingested.
    throw new Error(`no such state: ${payload.state_slug}`);
  }

  await client.query(
    `INSERT INTO state_budget_headlines
       (state_id, fiscal_year, label, amount_cr, qualifier, source_id, display_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (state_id, fiscal_year, label) DO UPDATE SET
       amount_cr     = EXCLUDED.amount_cr,
       qualifier     = EXCLUDED.qualifier,
       source_id     = EXCLUDED.source_id,
       display_order = EXCLUDED.display_order`,
    [
      rows[0].id,
      payload.fiscal_year,
      payload.label,
      payload.amount_cr,
      payload.qualifier,
      sourceId,
      payload.display_order ?? 0,
    ]
  );
}
