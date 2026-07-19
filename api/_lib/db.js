import { neon } from '@neondatabase/serverless';

/* One HTTP-driver instance per warm lambda. `sql` is a tagged template —
   interpolations are sent as bound parameters, never string-concatenated,
   so district slugs off the query string can't inject. */

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured for this environment.');
}

export const sql = neon(process.env.DATABASE_URL);

/** Rupee crore, as the page prints it: "₹1,203 Cr" with a non-breaking space. */
export function formatCrore(value) {
  const n = Number(value);
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}\u00a0Cr`;
}

/** Indian counting units — 1,20,000 reads as "1.20 L", 2.1 crore as "2.10 Cr". */
export function formatCount(value) {
  const n = Number(value);
  if (n >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(2)} L`;
  return n.toLocaleString('en-IN');
}

/** "16 Jul" — the feed's compact date form. */
export function formatShortDate(date) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function pct(part, whole) {
  const w = Number(whole);
  return w > 0 ? Math.round((Number(part) / w) * 100) : 0;
}
