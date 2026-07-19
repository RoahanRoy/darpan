import { sql } from './_lib/db.js';

/* GET /api/regions → states, each with its districts, for the picker. */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rows = await sql`
      SELECT s.name AS state, s.slug AS state_slug, d.name AS district, d.slug AS district_slug
      FROM states s
      LEFT JOIN districts d ON d.state_id = s.id
      ORDER BY s.name, d.name
    `;

    const byState = new Map();
    for (const row of rows) {
      if (!byState.has(row.state)) {
        byState.set(row.state, { name: row.state, slug: row.state_slug, districts: [] });
      }
      if (row.district) {
        byState.get(row.state).districts.push({ name: row.district, slug: row.district_slug });
      }
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ states: [...byState.values()] });
  } catch (err) {
    console.error('GET /api/regions failed', err);
    return res.status(500).json({ error: 'Could not load regions' });
  }
}
