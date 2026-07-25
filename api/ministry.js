import { sql, formatCrore, pct } from './_lib/db.js';

/* GET /api/ministry?slug=jal-shakti
   One ministry's spending, opened out.

   Its own route rather than a fatter /api/parliament. The breakdown is
   eighty-odd lines across eleven ministries and a reader opens at most one of
   them, so folding it into the page that lists all fourteen would send
   everyone the other thirteen. The Parliament page ships the slugs and
   nothing else; the bytes arrive when somebody clicks.

   Nothing here recomputes a figure. `deliveredPct` is the same arithmetic the
   Parliament table does on the same two columns, and the share is against the
   document's own total expenditure — never against the sum of the lines. */

function serialiseLine(row) {
  return {
    label: row.label,
    parent: row.parent_label,
    // Every column is nullable here, unlike the ministry's own series: the
    // analyses mostly omit the 2024-25 budget estimate, and some print a dash
    // for a scheme that did not exist or has wound up. A dash is not a zero.
    actualsPrev: row.actuals_prev_cr == null ? null : formatCrore(row.actuals_prev_cr),
    budgeted: row.budgeted_cr == null ? null : formatCrore(row.budgeted_cr),
    revised: row.revised_cr == null ? null : formatCrore(row.revised_cr),
    nextBudget: row.next_budget_cr == null ? null : formatCrore(row.next_budget_cr),

    /* Only where the document printed both figures. Computing it against a
       missing budget estimate would produce a delivery rate for a year whose
       budget this page never saw. */
    deliveredPct:
      row.budgeted_cr == null || row.revised_cr == null
        ? null
        : pct(row.revised_cr, row.budgeted_cr),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const slug = String(req.query.slug ?? '').trim().toLowerCase();
  if (!slug) {
    return res.status(400).json({ error: 'A ministry slug is required' });
  }

  try {
    /* The residual row carries a NULL slug (migration 010), so it can never
       be reached here whatever is typed — `slug = $1` excludes NULLs, which
       is exactly the behaviour wanted. */
    const [ministry] = await sql`
      SELECT m.id, m.ministry, m.slug,
             m.actuals_prev_cr, m.budgeted_cr, m.revised_cr, m.next_budget_cr,
             src.slug AS source_slug, src.title AS source_title,
             src.publisher AS source_publisher, src.url AS source_url,
             src.note AS source_note, src.document_date_is_inferred,
             src.document_date::text AS source_date,
             src.retrieved_on::text AS source_retrieved
      FROM union_ministry_budgets m
      JOIN sources src ON src.id = m.source_id
      WHERE m.slug = ${slug}
    `;

    if (!ministry) {
      return res.status(404).json({ error: 'No such ministry' });
    }

    const [lines, schemes, [total] = [], neighbours] = await Promise.all([
      sql`
        SELECT label, parent_label,
               actuals_prev_cr, budgeted_cr, revised_cr, next_budget_cr,
               basis, document_title, document_url, document_date::text AS document_date
        FROM union_ministry_lines
        WHERE ministry_id = ${ministry.id}
        ORDER BY display_order
      `,

      /* The major central schemes demanded under this ministry. A different
         record from the lines above — these come from the Union Budget
         analysis's own scheme table, at the centre's chosen level of detail,
         and a scheme may appear in both with figures that differ because two
         documents rounded differently. The page keeps them apart and says so. */
      sql`
        SELECT scheme_name, actuals_prev_cr, budgeted_cr, revised_cr, next_budget_cr
        FROM union_scheme_allocations
        WHERE ministry = ${ministry.ministry}
        ORDER BY display_order
      `,

      sql`
        SELECT amount_cr FROM union_budget_headlines
        WHERE label = 'Total expenditure'
        ORDER BY fiscal_year DESC LIMIT 1
      `,

      /* Enough to move between ministries without going back. Name and slug
         only — the figures are already on the page they came from. */
      sql`
        SELECT ministry, slug FROM union_ministry_budgets
        WHERE slug IS NOT NULL ORDER BY display_order
      `,
    ]);

    const totalCr = Number(total?.amount_cr ?? 0);

    /* The basis and the document are carried on every line (migration 010)
       and are the same across a ministry's lines — the store refuses to apply
       otherwise. Reading them off the first line is what turns that invariant
       into one statement on the page instead of eighty. */
    const [first] = lines;

    const payload = {
      slug: ministry.slug,
      name: ministry.ministry,

      series: {
        actualsPrev: formatCrore(ministry.actuals_prev_cr),
        budgeted: formatCrore(ministry.budgeted_cr),
        revised: formatCrore(ministry.revised_cr),
        nextBudget: formatCrore(ministry.next_budget_cr),
        deliveredPct: pct(ministry.revised_cr, ministry.budgeted_cr),
        sharePct:
          totalCr > 0
            ? ((Number(ministry.next_budget_cr) / totalCr) * 100).toFixed(1)
            : null,

        /* What was budgeted last year and then not spent, in rupees rather
           than as a percentage. The percentage is the honest comparison
           between ministries; the rupee gap is the one a reader feels, and
           this is the only place the site prints it.

           Null, not a negative, where the head was revised upwards. Heads are
           revised up often — Chemicals and Fertilisers went to 111% — and
           "₹-18,153 Cr of shortfall" is a phrase that means the opposite of
           what it says. `revisedUp` is what the page reads to pick its
           sentence; making the figure absent as well is what stops the next
           person rendering it anyway. */
        shortfallCr:
          Number(ministry.revised_cr) > Number(ministry.budgeted_cr)
            ? null
            : formatCrore(Number(ministry.budgeted_cr) - Number(ministry.revised_cr)),
        revisedUp: Number(ministry.revised_cr) > Number(ministry.budgeted_cr),
      },

      // Null when no analysis was transcribed for this ministry. The page
      // says so rather than rendering an empty table.
      breakdown: first
        ? {
            basis: first.basis,
            document: {
              title: first.document_title,
              url: first.document_url,
              date: first.document_date,
            },
            lines: lines.map(serialiseLine),
          }
        : null,

      schemes: schemes.map((s) => ({
        name: s.scheme_name,
        actualsPrev: s.actuals_prev_cr == null ? null : formatCrore(s.actuals_prev_cr),
        budgeted: formatCrore(s.budgeted_cr),
        revised: formatCrore(s.revised_cr),
        nextBudget: formatCrore(s.next_budget_cr),
        deliveredPct: pct(s.revised_cr, s.budgeted_cr),
        sharePct: null,
      })),

      /* Where the ministry's own four-year series came from — one document,
         in the shape every other page's sources block expects, so the footer
         is the same component saying the same thing. The Demand for Grants
         analysis behind the breakdown is NOT in here: it cites itself, on the
         block it belongs to, for the reason migration 010 gives. */
      sources: [
        {
          slug: ministry.source_slug,
          title: ministry.source_title,
          publisher: ministry.source_publisher,
          url: ministry.source_url,
          documentDate: ministry.source_date,
          dateIsInferred: ministry.document_date_is_inferred,
          retrievedOn: ministry.source_retrieved,
          note: ministry.source_note,
        },
      ],

      ministries: neighbours.map((m) => ({ name: m.ministry, slug: m.slug })),
    };

    /* A day at the edge, a week stale-while-revalidate, for the same reason
       /api/roundup uses it: this is annual data behind a document that was
       published in February and will not move until the next Budget. Ten
       minutes would wake a suspended Neon endpoint six times an hour to
       re-read rows that cannot have changed. */
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json(payload);
  } catch (err) {
    console.error('GET /api/ministry failed', err);
    return res.status(500).json({ error: 'Could not load this ministry' });
  }
}
