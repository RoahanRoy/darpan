import { sql } from './_lib/db.js';

/* GET /api/regions → states, each with its districts, for the picker. */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    /* `has_records` is whether we hold any published FIGURES for the state,
       which is a different question from whether the state exists. Every one
       of the 36 states and union territories is listed here, because a reader
       looking for Bihar should find Bihar and be told we hold nothing for it
       yet — but the map must not light Bihar up as though we did. */
    const rows = await sql`
      SELECT s.name AS state, s.slug AS state_slug, s.kind AS state_kind,
             d.name AS district, d.slug AS district_slug, d.unit_type,
             EXISTS (
               SELECT 1 FROM state_sector_budgets b WHERE b.state_id = s.id
               UNION ALL
               SELECT 1 FROM state_budget_headlines h WHERE h.state_id = s.id
               UNION ALL
               SELECT 1 FROM state_scheme_allocations a WHERE a.state_id = s.id
             ) AS has_records
      FROM states s
      LEFT JOIN districts d ON d.state_id = s.id
      ORDER BY s.name, d.display_order
    `;

    const byState = new Map();
    for (const row of rows) {
      if (!byState.has(row.state)) {
        byState.set(row.state, {
          name: row.state,
          slug: row.state_slug,
          kind: row.state_kind,
          hasRecords: row.has_records,
          // Delhi's areas are municipal bodies, Uttarakhand's are districts.
          // The picker labels itself from this rather than assuming.
          unitType: null,
          districts: [],
        });
      }
      if (row.district) {
        const entry = byState.get(row.state);
        entry.districts.push({ name: row.district, slug: row.district_slug });
        entry.unitType ??= row.unit_type;
      }
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ states: [...byState.values()] });
  } catch (err) {
    console.error('GET /api/regions failed', err);
    return res.status(500).json({ error: 'Could not load regions' });
  }
}
