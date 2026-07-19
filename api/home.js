import { sql, formatCrore, formatCount, pct } from './_lib/db.js';

/* GET /api/home?district=dehradun
   Everything the home page renders, in one round trip.

   Note the shape: `spending` and `schemes` describe the STATE, `progress`
   describes the district. That asymmetry is not an accident of the query —
   it is what the underlying records support, and each block carries its own
   scope label so the page cannot blur the two. */

const DEFAULT_DISTRICT = 'dehradun';

// Which finding kinds read as accent-coloured tags: the ones describing
// something going wrong, rather than a plain allocation.
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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const districtSlug = (url.searchParams.get('district') || DEFAULT_DISTRICT).toLowerCase();

  try {
    /* The fiscal year is read from the data rather than pinned in code. A
       constant here goes stale the moment a new budget is ingested: the page
       would keep asking for last year's rows and quietly render nothing,
       which looks identical to a state having no budget at all.

       Both year-bearing tables are consulted because a state may be seeded
       with scheme allocations before its headline rows, or the reverse. */
    const [area] = await sql`
      SELECT d.id, d.name, d.slug, d.unit_type, d.unit_note,
             s.id AS state_id, s.name AS state_name, s.slug AS state_slug, s.kind AS state_kind,
             (SELECT max(fy) FROM (
                SELECT max(fiscal_year) AS fy FROM state_budget_headlines WHERE state_id = s.id
                UNION ALL
                SELECT max(fiscal_year) FROM state_scheme_allocations WHERE state_id = s.id
              ) years) AS fiscal_year
      FROM districts d JOIN states s ON s.id = d.state_id
      WHERE d.slug = ${districtSlug}
    `;

    if (!area) {
      return res.status(404).json({ error: `Unknown area: ${districtSlug}` });
    }

    // A state with delivery records but no budget yet is a real state to
    // render — the money blocks come back empty and the page says so — so
    // this is not an error, but it must not be reported as a year either.
    const FY = area.fiscal_year;

    const [headlines, sectors, allocations, progress, findingRows, sourceRows] =
      await Promise.all([
        sql`SELECT label, amount_cr, qualifier FROM state_budget_headlines
            WHERE state_id = ${area.state_id} AND fiscal_year = ${FY}
            ORDER BY display_order`,

        sql`SELECT sector, actuals_prev_cr, budgeted_cr, revised_cr,
                   next_budget_cr, provision_note
            FROM state_sector_budgets
            WHERE state_id = ${area.state_id} ORDER BY display_order`,

        sql`SELECT scheme_name, sector, amount_cr FROM state_scheme_allocations
            WHERE state_id = ${area.state_id} AND fiscal_year = ${FY}
            ORDER BY display_order`,

        sql`SELECT p.scheme_name, p.metric_a_label, p.metric_a, p.metric_b_label,
                   p.metric_b, p.metric_c_label, p.metric_c,
                   -- ::text keeps this a calendar date. Returned as a Date it
                   -- becomes local midnight, serialises to UTC, and can land
                   -- on the previous day — a date silently off by one.
                   p.as_of_date::text AS as_of_date,
                   src.url AS source_url, src.document_date_is_inferred
            FROM district_scheme_progress p
            JOIN sources src ON src.id = p.source_id
            WHERE p.district_id = ${area.id}
            ORDER BY p.as_of_date DESC`,

        sql`SELECT f.kind, f.tag_label, f.headline, f.body, f.computed_from_source,
                   src.slug AS source_slug, src.url AS source_url, src.publisher
            FROM findings f JOIN sources src ON src.id = f.source_id
            WHERE f.state_id = ${area.state_id}
            ORDER BY f.display_order`,

        sql`SELECT src.slug, src.title, src.publisher, src.url, src.note,
                   src.document_date_is_inferred,
                   src.document_date::text AS document_date,
                   src.retrieved_on::text AS retrieved_on
            FROM sources src
            WHERE src.id IN (
              SELECT source_id FROM state_sector_budgets WHERE state_id = ${area.state_id}
              UNION SELECT source_id FROM state_scheme_allocations WHERE state_id = ${area.state_id}
              UNION SELECT source_id FROM findings WHERE state_id = ${area.state_id}
              UNION SELECT source_id FROM district_scheme_progress WHERE district_id = ${area.id}
            )
            ORDER BY src.document_date DESC`,
      ]);

    const totalExpenditure = headlines.find((h) => h.label.startsWith('Total expenditure'));

    const payload = {
      area: {
        name: area.name,
        slug: area.slug,
        unitType: area.unit_type,
        unitNote: area.unit_note,
      },
      state: { name: area.state_name, slug: area.state_slug, kind: area.state_kind },
      fiscalYear: FY,

      // State-level money, explicitly scoped.
      spending: {
        scope: 'state',
        scopeLabel: area.state_name,
        // No year means no budget rows for this state, so the label must not
        // name one. It reads as the state's budget with the year withheld
        // rather than "FY null".
        period: FY
          ? `${area.state_name} budget · FY ${FY.replace('-', '–')}`
          : `${area.state_name} budget`,
        total: totalExpenditure ? formatCrore(totalExpenditure.amount_cr) : null,
        headlines: headlines.map((h) => ({
          label: h.label,
          amount: h.amount_cr == null ? null : formatCrore(h.amount_cr),
          qualifier: h.qualifier,
        })),

        // Each sector carries last year's budget-vs-revised gap. Anything
        // under 100% is money the government told the legislature it would
        // spend and then did not.
        sectors: sectors.map((s) => ({
          name: s.sector,
          budgeted: formatCrore(s.budgeted_cr),
          revised: formatCrore(s.revised_cr),
          nextBudget: formatCrore(s.next_budget_cr),
          deliveredPct: pct(s.revised_cr, s.budgeted_cr),
          note: s.provision_note,
        })),
      },

      schemes: allocations.map((a) => ({
        id: a.scheme_name,
        name: a.scheme_name,
        category: a.sector,
        amount: formatCrore(a.amount_cr),
      })),

      // District-level physical delivery.
      progress: progress.map((p) => ({
        scheme: p.scheme_name,
        asOf: p.as_of_date,
        asOfIsInferred: p.document_date_is_inferred,
        sourceUrl: p.source_url,
        metrics: [
          { label: p.metric_a_label, value: formatCount(p.metric_a) },
          p.metric_b_label && { label: p.metric_b_label, value: formatCount(p.metric_b) },
          p.metric_c_label && { label: p.metric_c_label, value: formatCount(p.metric_c) },
        ].filter(Boolean),
        completionPct: Number(p.metric_a) > 0 ? pct(p.metric_c, p.metric_a) : null,
      })),

      findings: findingRows.map((f, i) => ({
        id: `${f.source_slug}-${i}`,
        tag: f.tag_label,
        tagTone: ACCENT_KINDS.has(f.kind) ? 'accent' : 'neutral',
        title: f.headline,
        body: f.body,
        // Lets the page distinguish a finding quoted from the document from
        // our own arithmetic on its published figures.
        derived: f.computed_from_source,
        publisher: f.publisher,
        href: f.source_url,
      })),

      sources: sourceRows.map(serialiseSource),
    };

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
    return res.status(200).json(payload);
  } catch (err) {
    console.error('GET /api/home failed', err);
    return res.status(500).json({ error: 'Could not load area data' });
  }
}
