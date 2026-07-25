import { sql } from './_lib/db.js';

/* GET /api/roundup
   The national policy digest on the front page.

   Its own route rather than a field on /api/regions, which every state page
   fetches: this is wanted on one view and nowhere else, and hanging it off
   the state list would send ten paragraphs of prose to every reader who
   opened a district.

   The covered window is computed here from the rows' own dates and is never
   stored (migration 007). A window in a column would keep asserting "the
   twelve months to July" long after the last refresh, which is the one lie a
   block like this is well placed to tell. Derived, it can only ever claim the
   span the table actually holds — so a roundup nobody has touched since
   February says February on the page. */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const items = await sql`
      SELECT happened_on::text AS happened_on, region_label,
             headline, summary, impact, outlet, url
      FROM policy_roundup
      ORDER BY display_order
    `;

    // An empty table is not an error. The page renders nothing rather than an
    // empty heading, exactly as the news and leak blocks do.
    const dates = items.map((i) => i.happened_on).sort();

    const payload = {
      covers: dates.length
        ? { from: dates[0], to: dates[dates.length - 1] }
        : null,

      items: items.map((i) => ({
        happenedOn: i.happened_on,
        region: i.region_label,
        headline: i.headline,
        summary: i.summary,
        impact: i.impact,
        outlet: i.outlet,
        href: i.url,
      })),
    };

    /* A day at the edge, a week serving stale while it refreshes. Far longer
       than the ten minutes the other routes use, and the reason is the data:
       this list changes four times a year. At s-maxage=600 the front page —
       the most-visited page on the site — was waking the database every ten
       minutes to re-read ten rows that had not moved since April.

       On a Neon free plan the scarce resource is compute hours, not the
       half-gigabyte of storage, and compute is spent by waking a suspended
       endpoint. Caching in proportion to how often a thing actually changes
       is most of the lever. The quarterly refresh is a deploy, which clears
       the edge cache anyway, so nothing goes stale in practice. */
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json(payload);
  } catch (err) {
    console.error('GET /api/roundup failed', err);
    return res.status(500).json({ error: 'Could not load the policy roundup' });
  }
}
