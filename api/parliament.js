import { sql, formatCrore, pct } from './_lib/db.js';

/* GET /api/parliament
   The central government's budget, in one round trip.

   Everything here is union-scope, so unlike /api/home there is no area
   parameter and nothing to disambiguate. The one thing this route must not
   do is present a union figure as though it aggregated the states: the
   centre's expenditure and a state's are voted by different houses and
   reported on different heads, and they do not sum. */

const ACCENT_KINDS = new Set(['audit', 'underspend', 'shortfall']);

function serialiseSource(row) {
  return {
    slug: row.slug,
    title: row.title,
    publisher: row.publisher,
    url: row.url,
    documentDate: row.document_date,
    dateIsInferred: row.document_date_is_inferred,
    retrievedOn: row.retrieved_on,
    note: row.note,
  };
}

/** The budget → revised → next-budget series every money row on this page shares. */
function serialiseSeries(row, name, totalCr) {
  return {
    name,
    // Schemes that did not exist in the prior year carry NULL, which is not
    // the same as zero and must not print as "₹0 Cr".
    actualsPrev: row.actuals_prev_cr == null ? null : formatCrore(row.actuals_prev_cr),
    budgeted: formatCrore(row.budgeted_cr),
    revised: formatCrore(row.revised_cr),
    nextBudget: formatCrore(row.next_budget_cr),
    // Under 100% is money Parliament was told would be spent, and was not.
    deliveredPct: pct(row.revised_cr, row.budgeted_cr),
    // A string, not a number: in a column of one-decimal shares, 5.0 must
    // not render as "5" beside "5.7".
    sharePct: totalCr > 0 ? ((Number(row.next_budget_cr) / totalCr) * 100).toFixed(1) : null,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    /* Read the year from the data rather than pinning it in code. A constant
       here goes stale the day a new Union Budget is ingested: this route
       would keep asking for the superseded year and 404, on a page whose
       rows were sitting in the table all along. */
    const [{ fiscal_year: FY } = {}] = await sql`
      SELECT max(fiscal_year) AS fiscal_year FROM union_budget_headlines
    `;

    if (!FY) {
      return res.status(404).json({ error: 'No union budget records published' });
    }

    const [headlines, ministries, schemes, findingRows, sourceRows, [presented]] =
      await Promise.all([
      sql`SELECT label, amount_cr, qualifier FROM union_budget_headlines
          WHERE fiscal_year = ${FY} ORDER BY display_order`,

      sql`SELECT ministry, actuals_prev_cr, budgeted_cr, revised_cr, next_budget_cr
          FROM union_ministry_budgets ORDER BY display_order`,

      sql`SELECT scheme_name, actuals_prev_cr, budgeted_cr, revised_cr, next_budget_cr
          FROM union_scheme_allocations ORDER BY display_order`,

      // state_id IS NULL is what makes a finding central. A state's findings
      // must never appear here, and vice versa.
      sql`SELECT f.kind, f.tag_label, f.headline, f.body, f.computed_from_source,
                 src.slug AS source_slug, src.url AS source_url, src.publisher
          FROM findings f JOIN sources src ON src.id = f.source_id
          WHERE f.state_id IS NULL
          ORDER BY f.display_order`,

      sql`SELECT src.slug, src.title, src.publisher, src.url, src.note,
                 src.document_date_is_inferred,
                 src.document_date::text AS document_date,
                 src.retrieved_on::text AS retrieved_on
          FROM sources src
          WHERE src.id IN (
            SELECT source_id FROM union_budget_headlines WHERE fiscal_year = ${FY}
            UNION SELECT source_id FROM union_ministry_budgets
            UNION SELECT source_id FROM union_scheme_allocations
            UNION SELECT source_id FROM findings WHERE state_id IS NULL
          )
          ORDER BY src.document_date DESC`,

      // The date the budget document itself carries, so the page can say when
      // it was presented without that date being typed into the markup where
      // it would outlive the year it belongs to.
      sql`SELECT src.document_date::text AS presented_on,
                 src.document_date_is_inferred
          FROM union_budget_headlines h JOIN sources src ON src.id = h.source_id
          WHERE h.fiscal_year = ${FY}
          ORDER BY h.display_order
          LIMIT 1`,
    ]);

    if (headlines.length === 0) {
      return res.status(404).json({ error: `No union records for ${FY}` });
    }

    // Ministry shares are quoted against total expenditure, which the source
    // prints as the total row of the same table. Taking it from the headline
    // rather than summing the ministry rows keeps the denominator the
    // document's own.
    const totalRow = headlines.find((h) => h.label === 'Total expenditure');
    const totalCr = Number(totalRow?.amount_cr ?? 0);

    const payload = {
      scope: 'union',
      fiscalYear: FY,

      // Null where the document carried no date of its own. The page drops
      // the clause entirely rather than asserting one.
      presentedOn: presented?.document_date_is_inferred ? null : (presented?.presented_on ?? null),

      headlines: headlines.map((h) => ({
        label: h.label,
        amount: h.amount_cr == null ? null : formatCrore(h.amount_cr),
        qualifier: h.qualifier,
      })),

      ministries: ministries.map((m) => serialiseSeries(m, m.ministry, totalCr)),

      // Schemes get no share-of-total: a scheme sits inside a ministry's
      // allocation, so printing both against the same denominator would
      // invite adding them together.
      schemes: schemes.map((s) => ({
        ...serialiseSeries(s, s.scheme_name, 0),
        sharePct: null,
      })),

      findings: findingRows.map((f, i) => ({
        id: `${f.source_slug}-union-${i}`,
        tag: f.tag_label,
        tagTone: ACCENT_KINDS.has(f.kind) ? 'accent' : 'neutral',
        title: f.headline,
        body: f.body,
        derived: f.computed_from_source,
        publisher: f.publisher,
        href: f.source_url,
      })),

      sources: sourceRows.map(serialiseSource),
    };

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
    return res.status(200).json(payload);
  } catch (err) {
    console.error('GET /api/parliament failed', err);
    return res.status(500).json({ error: 'Could not load union budget data' });
  }
}
