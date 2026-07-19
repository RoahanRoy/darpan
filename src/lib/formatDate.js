const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* Formats a plain 'YYYY-MM-DD' calendar date.

   Deliberately does NOT go through `new Date()`. That parses a bare date
   string as UTC midnight, and `toLocaleDateString` then renders it in the
   viewer's zone — so a document dated 31 Jul reads as 30 Jul for anyone
   west of Greenwich. These dates are provenance, not instants; they have no
   timezone and must not acquire one. */

export default function formatDate(value) {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-');
  if (!y || !m || !d) return String(value);
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}
