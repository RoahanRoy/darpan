/* Writes dist/sitemap.xml from the states and areas actually in the database,
   and appends the Sitemap directive to dist/robots.txt.

   Run after `vite build`. It is deliberately a soft dependency: without
   SITE_URL or DATABASE_URL it prints why it skipped and exits 0, so CI (which
   has neither) still builds, and a deploy is never blocked by a sitemap.

   Listing the routes is the only way a crawler discovers them. Nothing links
   to /delhi/ndmc from a static page — the picker builds those links at
   runtime — so without this file the site is a single indexable URL. */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Loaded here rather than relying on ingest/lib/db.js, which reads the same
// files but exits the process when DATABASE_URL is missing. The checks below
// have to run before that module is imported, so they need the env first. On
// Vercel these files do not exist and the real environment already has both.
dotenv.config({ path: '.env.local' });
dotenv.config();

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

const siteUrl = process.env.SITE_URL?.replace(/\/+$/, '');

if (!siteUrl) {
  console.log('sitemap: skipped — set SITE_URL (e.g. https://example.org) to generate one');
  process.exit(0);
}
if (!process.env.DATABASE_URL) {
  console.log('sitemap: skipped — DATABASE_URL is not set');
  process.exit(0);
}

const { pool } = await import('../ingest/lib/db.js');

/** Escapes the five XML entities. Slugs are [a-z-] today; this is not a bet. */
const xml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]
  );

try {
  const { rows } = await pool.query(
    `SELECT s.slug AS state_slug, d.slug AS area_slug
     FROM states s LEFT JOIN districts d ON d.state_id = s.id
     ORDER BY s.slug, d.display_order`
  );

  /* Ministry pages are listed for the same reason the districts are: the
     only link to /parliament/jal-shakti is a table cell the union budget
     page builds at runtime, so without this file a crawler never sees one.
     NULL slug is the published residual, which has no page. */
  const { rows: ministries } = await pool.query(
    `SELECT slug FROM union_ministry_budgets
     WHERE slug IS NOT NULL ORDER BY display_order`
  );

  const paths = new Set(['/', '/parliament', '/about']);
  for (const row of rows) {
    paths.add(`/${row.state_slug}`);
    if (row.area_slug) paths.add(`/${row.state_slug}/${row.area_slug}`);
  }
  for (const m of ministries) paths.add(`/parliament/${m.slug}`);

  // No <lastmod>: the honest value is the date of the source document behind
  // each page, and that is not the same as the date this file was written.
  // A wrong lastmod is worse than none — crawlers weight it.
  const body = [...paths]
    .map((p) => `  <url><loc>${xml(siteUrl + p)}</loc></url>`)
    .join('\n');

  await writeFile(
    join(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
    'utf8'
  );

  const robotsPath = join(dist, 'robots.txt');
  const robots = await readFile(robotsPath, 'utf8');
  await writeFile(robotsPath, `${robots.trimEnd()}\n\nSitemap: ${siteUrl}/sitemap.xml\n`, 'utf8');

  console.log(`sitemap: wrote ${paths.size} URL(s)`);
} catch (err) {
  console.error(`sitemap: failed — ${err.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
