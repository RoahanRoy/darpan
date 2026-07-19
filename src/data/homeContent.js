/* Static UI chrome only. Everything that is district data — the feed,
   spending, schemes and rollout status — now comes from /api/home. */

export const navLinks = [
  { label: 'This week', href: '#top', current: true },
  { label: 'Schemes', href: '#schemes' },
  { label: 'Spending', href: '#spending' },
  { label: 'Parliament', href: '/parliament' },
  { label: 'District status', href: '#status' },
];
