/* Static UI chrome only. Every figure on either page comes from the API.

   These labels track the sections that actually exist. The comp's "This
   week" framing is still absent: the source documents are annual, and a
   cadence the data does not have is the same failure as inventing figures.

   The comp's "Parliament" link is now real. It goes to the union budget,
   which is a genuinely separate document set from the state budgets — not a
   national roll-up of them. */

export const homeNavLinks = [
  { label: 'Overview', href: '#top' },
  { label: 'Findings', href: '#findings' },
  { label: 'Spending', href: '#spending' },
  { label: 'Schemes', href: '#schemes' },
  { label: 'Delivery', href: '#status' },
  { label: 'Parliament', href: '/parliament' },
];

export const parliamentNavLinks = [
  { label: 'States', href: '/' },
  { label: 'Budget', href: '#top' },
  { label: 'Ministries', href: '#ministries' },
  { label: 'Schemes', href: '#union-schemes' },
  { label: 'Findings', href: '#union-findings' },
];
