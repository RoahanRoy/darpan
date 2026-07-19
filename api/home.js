import { sql, formatCrore, formatCount, formatShortDate, pct } from './_lib/db.js';

/* GET /api/home?district=pune&fy=2025-26
   Everything the home page renders, in one round trip — the blocks are all
   small and always shown together, so separate endpoints would only buy a
   request waterfall. */

const DEFAULT_DISTRICT = 'pune';
const DEFAULT_FY = '2025-26';

// Which feed kinds read as accent-coloured tags.
const ACCENT_KINDS = new Set(['parliament', 'indicator']);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const districtSlug = (url.searchParams.get('district') || DEFAULT_DISTRICT).toLowerCase();
  const fiscalYear = url.searchParams.get('fy') || DEFAULT_FY;

  try {
    const [district] = await sql`
      SELECT d.id, d.name, d.slug, s.name AS state_name
      FROM districts d JOIN states s ON s.id = d.state_id
      WHERE d.slug = ${districtSlug}
    `;

    if (!district) {
      return res.status(404).json({ error: `Unknown district: ${districtSlug}` });
    }

    const [budgetRows, schemeSpendRows, suggestions, rolloutRows, feedRows, refreshRows] =
      await Promise.all([
        sql`SELECT allocated_cr, spent_cr FROM district_budgets
            WHERE district_id = ${district.id} AND fiscal_year = ${fiscalYear}`,
        sql`SELECT COALESCE(dss.display_label, s.name) AS label,
                   dss.allocated_cr, dss.spent_cr, s.slug
            FROM district_scheme_spending dss JOIN schemes s ON s.id = dss.scheme_id
            WHERE dss.district_id = ${district.id} AND dss.fiscal_year = ${fiscalYear}
            ORDER BY dss.display_order`,
        sql`SELECT slug, name, category, summary, eligibility_note, cta_label
            FROM schemes WHERE is_suggestable ORDER BY display_order`,
        sql`SELECT r.metric_label, r.target, r.reached, r.status, s.slug
            FROM scheme_rollout r JOIN schemes s ON s.id = r.scheme_id
            WHERE r.district_id = ${district.id} AND r.fiscal_year = ${fiscalYear}
            ORDER BY r.display_order`,
        sql`SELECT f.id, f.kind, f.tag_label, f.headline, f.body,
                   f.source_label, f.occurred_on, f.href
            FROM feed_items f
            WHERE f.district_id = ${district.id} AND f.published
            ORDER BY f.occurred_on DESC LIMIT 8`,
        sql`SELECT refreshed_at FROM refresh_log
            WHERE district_id = ${district.id} ORDER BY refreshed_at DESC LIMIT 1`,
      ]);

    const budget = budgetRows[0];

    const payload = {
      district: { name: district.name, slug: district.slug, state: district.state_name },
      fiscalYear,

      spending: budget
        ? {
            period: `District spending · FY ${fiscalYear.replace('-', '–')}`,
            spent: formatCrore(budget.spent_cr),
            summary: `spent of ${formatCrore(budget.allocated_cr)} — ${pct(
              budget.spent_cr,
              budget.allocated_cr
            )}% released`,
            releasedPct: pct(budget.spent_cr, budget.allocated_cr),
            byScheme: schemeSpendRows.map((r) => ({
              name: r.label,
              slug: r.slug,
              pct: pct(r.spent_cr, r.allocated_cr),
            })),
          }
        : null,

      feed: feedRows.map((r) => ({
        id: r.id,
        tag: r.tag_label,
        tagTone: ACCENT_KINDS.has(r.kind) ? 'accent' : 'neutral',
        // Long-run indicators carry no meaningful event date, so they show
        // only their provenance label.
        date:
          r.kind === 'indicator'
            ? r.source_label
            : [r.source_label, formatShortDate(r.occurred_on)].filter(Boolean).join(' · '),
        title: r.headline,
        href: r.href,
        body: r.body,
      })),

      schemes: suggestions.map((r) => ({
        id: r.slug,
        category: r.category,
        name: r.name,
        body: r.summary,
        eligibility: r.eligibility_note,
        cta: r.cta_label,
      })),

      rollout: rolloutRows.map((r) => ({
        scheme: r.metric_label,
        href: `/schemes/${r.slug}`,
        target: formatCount(r.target),
        reached: formatCount(r.reached),
        status: r.status,
      })),

      lastUpdated: refreshRows[0]?.refreshed_at ?? null,
    };

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
    return res.status(200).json(payload);
  } catch (err) {
    console.error('GET /api/home failed', err);
    return res.status(500).json({ error: 'Could not load district data' });
  }
}
