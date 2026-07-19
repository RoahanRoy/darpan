/* Static UI chrome only. Every figure on any page comes from the API.

   These labels track the sections that actually exist. The comp's "This
   week" framing is still absent: the source documents are annual, and a
   cadence the data does not have is the same failure as inventing figures.

   The comp's "Parliament" link is now real. It goes to the union budget,
   which is a genuinely separate document set from the state budgets — not a
   national roll-up of them.

   Every list ends with Method. A site that asks to be checked has to say
   where its figures came from and how to report an error, from every page. */

export const homeNavLinks = [
  { label: 'Overview', href: '#top' },
  { label: 'Findings', href: '#findings' },
  { label: 'Spending', href: '#spending' },
  { label: 'Schemes', href: '#schemes' },
  { label: 'Delivery', href: '#status' },
  { label: 'Parliament', href: '/parliament' },
  { label: 'Method', href: '/about' },
];

export const parliamentNavLinks = [
  { label: 'Budget', href: '#top' },
  { label: 'Ministries', href: '#ministries' },
  { label: 'Schemes', href: '#union-schemes' },
  { label: 'Findings', href: '#union-findings' },
  { label: 'States', href: '/' },
  { label: 'Method', href: '/about' },
];

export const aboutNavLinks = [
  { label: 'Sources', href: '#sources' },
  { label: 'Limits', href: '#limits' },
  { label: 'Checks', href: '#checks' },
  { label: 'Corrections', href: '#corrections' },
  { label: 'States', href: '/' },
  { label: 'Parliament', href: '/parliament' },
];
