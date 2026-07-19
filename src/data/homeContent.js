/* Static content for the home page. Swap for API calls when the weekly
   refresh job is wired up — the components only read these shapes. */

export const navLinks = [
  { label: 'This week', href: '#top', current: true },
  { label: 'Schemes', href: '#schemes' },
  { label: 'Spending', href: '#spending' },
  { label: 'Parliament', href: '/parliament' },
  { label: 'District status', href: '#status' },
];

export const states = ['Maharashtra', 'Uttar Pradesh', 'Karnataka', 'Bihar'];
export const districts = ['Pune', 'Mumbai Suburban', 'Nagpur', 'Nashik'];

export const feedItems = [
  {
    id: 'pmfby-delays',
    tag: 'Parliament',
    tagTone: 'accent',
    date: 'Lok Sabha · Q. 2471 · 16 Jul',
    title: 'Crop-insurance delays raised on the floor →',
    href: '/parliament',
    body:
      'The member for Pune flagged pending PMFBY payouts affecting 12,400 farmer families across Haveli and Mulshi, asking for a settlement timeline on 2025 kharif claims.',
  },
  {
    id: 'pmgsy-unspent',
    tag: 'RTI reply',
    tagTone: 'neutral',
    date: '14 Jul',
    title: '₹42 Cr for district roads unspent for eight months',
    body:
      'An RTI reply shows sanctioned PMGSY funds idle: work orders were never issued for three of seven approved stretches, and the monsoon window has closed.',
  },
  {
    id: 'ration-ekyc',
    tag: 'In the news',
    tagTone: 'neutral',
    date: '15 Jul',
    title: 'Ration-card e-KYC deadline extended to 31 August',
    body:
      'The state food department pushed back its biometric cut-off after 1.8 lakh cards in the district were flagged for suspension.',
  },
  {
    id: 'jal-jeevan-taps',
    tag: 'Long-term',
    tagTone: 'accent',
    date: 'AI-tracked',
    title: 'Drinking water: 63% of Jal Jeevan taps running →',
    href: '/schemes/jal-jeevan',
    body:
      'A third straight quarter below the 85% state target. 214 villages remain on tanker supply through the dry months.',
  },
];

export const spending = {
  period: 'District spending · FY 2025–26',
  spent: '₹1,203 Cr', // nbsp keeps the unit on the amount's line
  summary: 'spent of ₹1,847 Cr — 65% released',
  releasedPct: 65,
  byScheme: [
    { name: 'MGNREGA', pct: 82 },
    { name: 'PM Awas — housing', pct: 71 },
    { name: 'Jal Jeevan — water', pct: 58 },
    { name: 'PMGSY — roads', pct: 44 },
    { name: 'Poshan — nutrition', pct: 69 },
  ],
};

export const schemes = [
  {
    id: 'pm-kisan',
    category: 'Income support',
    name: 'PM-KISAN',
    body: '₹6,000 a year to landholding farmer families, in three instalments.',
    eligibility: 'Owns cultivable land',
    cta: 'Check & apply →',
  },
  {
    id: 'ayushman-bharat',
    category: 'Health',
    name: 'Ayushman Bharat',
    body: '₹5 lakh per family per year of cashless hospital cover.',
    eligibility: 'On the SECC list',
    cta: 'Check name →',
  },
  {
    id: 'pm-awas-gramin',
    category: 'Housing',
    name: 'PM Awas — Gramin',
    body: 'Assistance up to ₹1.2 lakh to build a pucca house.',
    eligibility: 'Kutcha house, SECC',
    cta: 'Check & apply →',
  },
  {
    id: 'nsap-pension',
    category: 'Welfare',
    name: 'NSAP Pension',
    body: 'Monthly pension for the elderly, widows and persons with disability.',
    eligibility: 'Below poverty line',
    cta: 'Apply at panchayat →',
  },
];

export const rolloutStatus = [
  { scheme: 'MGNREGA job cards', target: '1.20 L', reached: '1.05 L', status: 'On track' },
  { scheme: 'PM Awas houses sanctioned', target: '8,400', reached: '5,960', status: 'On track' },
  {
    scheme: 'Jal Jeevan tap connections',
    href: '/schemes/jal-jeevan',
    target: '2.10 L',
    reached: '1.22 L',
    status: 'Behind',
  },
  { scheme: 'Ayushman cards issued', target: '6.40 L', reached: '4.10 L', status: 'Behind' },
  { scheme: 'Poshan centres upgraded', target: '940', reached: '648', status: 'On track' },
];
