/* Promoter: staged_facts → state_sector_budgets.
   A promoter is the only thing in the project allowed to write a scraped
   figure into a public table, and it does so only for rows a human has
   already marked 'approved'.

   Every target table needs one of these registered in ingest/promoters/
   index.js. An adapter that stages a row for a table with no promoter is
   rejected at stage time, so the staging area cannot fill up with proposals
   nothing knows how to land. */

export const targetTable = 'state_sector_budgets';

// Keys the adapter attaches for the reviewer's benefit rather than for the
// table. Stripped before the diff so a changed diagnostic never looks like a
// changed figure.
const DIAGNOSTIC = (key) => key.startsWith('_');

const NUMERIC = ['actuals_prev_cr', 'budgeted_cr', 'revised_cr', 'next_budget_cr'];

/** The subset of a payload that counts as "the fact", for diffing. */
export function comparable(payload) {
  const out = {};
  for (const [k, v] of Object.entries(payload)) {
    if (DIAGNOSTIC(k)) continue;
    out[k] = NUMERIC.includes(k) && v != null ? Number(v) : v;
  }
  // display_order is presentation, not fact. A reshuffle should not read as
  // the state having changed its budget.
  delete out.display_order;

  // provision_note is written by the reviewer, never by the adapter, so it is
  // always null on the proposed side. Diffing it would mark every row
  // "changed" against a live row that already has a gloss, burying an actual
  // change in figures under ten rows of noise.
  delete out.provision_note;

  return out;
}

/** Structural checks run at stage time. Returns a list of problems. */
export function validate(payload) {
  const errors = [];
  if (!payload.state_slug) errors.push('state_slug missing');
  if (!payload.sector) errors.push('sector missing');

  for (const col of NUMERIC) {
    const v = payload[col];
    if (v == null) continue;
    if (!Number.isFinite(Number(v))) errors.push(`${col} is not a number: ${v}`);
    else if (Number(v) < 0) errors.push(`${col} is negative: ${v}`);
  }

  if (payload.budgeted_cr == null || payload.revised_cr == null) {
    errors.push('budgeted_cr and revised_cr are both required — the gap between them is the point');
  }

  // The paper prints its own % change from RE to BE. If our columns disagree
  // with it, we have mapped the columns wrong, which is silent and total.
  const { revised_cr: re, next_budget_cr: be, _published_pct_change: published } = payload;
  if (published != null && re > 0 && be != null) {
    const computed = Math.round(((Number(be) - Number(re)) / Number(re)) * 100);
    if (Math.abs(computed - Number(published)) > 1) {
      errors.push(
        `column mapping suspect: paper prints ${published}% change from RE to BE, ` +
          `our columns give ${computed}%`
      );
    }
  }

  return errors;
}

/** Rows currently live, keyed the same way the adapter keys its proposals. */
export async function currentRows(client) {
  const { rows } = await client.query(`
    SELECT st.slug AS state_slug, b.sector, b.actuals_prev_cr, b.budgeted_cr,
           b.revised_cr, b.next_budget_cr, b.provision_note
    FROM state_sector_budgets b
    JOIN states st ON st.id = b.state_id
  `);

  return new Map(
    rows.map((r) => [
      `${r.state_slug}|${r.sector}`,
      comparable({
        state_slug: r.state_slug,
        sector: r.sector,
        actuals_prev_cr: r.actuals_prev_cr,
        budgeted_cr: r.budgeted_cr,
        revised_cr: r.revised_cr,
        next_budget_cr: r.next_budget_cr,
        provision_note: r.provision_note,
      }),
    ])
  );
}

/** Writes one approved row. Runs inside the caller's transaction. */
export async function promote(client, { payload, sourceId }) {
  const { rows } = await client.query(
    `SELECT id FROM states WHERE slug = $1`,
    [payload.state_slug]
  );
  if (!rows.length) {
    // Adapters do not invent geography. A state must be seeded before its
    // budget can be ingested.
    throw new Error(`no such state: ${payload.state_slug}`);
  }

  await client.query(
    `INSERT INTO state_sector_budgets
       (state_id, sector, actuals_prev_cr, budgeted_cr, revised_cr,
        next_budget_cr, provision_note, source_id, display_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (state_id, sector) DO UPDATE SET
       actuals_prev_cr = EXCLUDED.actuals_prev_cr,
       budgeted_cr     = EXCLUDED.budgeted_cr,
       revised_cr      = EXCLUDED.revised_cr,
       next_budget_cr  = EXCLUDED.next_budget_cr,
       -- Keep the gloss already on the row when the reviewer has not written
       -- a new one. Without the COALESCE, re-ingesting a paper whose figures
       -- are unchanged would blank every provision note on the page.
       provision_note  = COALESCE(EXCLUDED.provision_note, state_sector_budgets.provision_note),
       source_id       = EXCLUDED.source_id,
       display_order   = EXCLUDED.display_order`,
    [
      rows[0].id,
      payload.sector,
      payload.actuals_prev_cr,
      payload.budgeted_cr,
      payload.revised_cr,
      payload.next_budget_cr,
      payload.provision_note,
      sourceId,
      payload.display_order ?? 0,
    ]
  );
}
