-- Seed data for Yojana Darpan.
--
-- ⚠ THESE FIGURES ARE THE DESIGN MOCK-UP'S NUMBERS, NOT REAL GOVERNMENT DATA.
-- They came from the Modernist comp and exist so the page renders something
-- plausible end to end. Every row here must be replaced with sourced records
-- from data.gov.in / PRS / Sansad before this is shown to the public as fact.
--
-- Idempotent: re-running updates in place rather than duplicating.

INSERT INTO states (name, slug) VALUES
  ('Maharashtra', 'maharashtra'),
  ('Uttar Pradesh', 'uttar-pradesh'),
  ('Karnataka', 'karnataka'),
  ('Bihar', 'bihar')
ON CONFLICT (name) DO NOTHING;

INSERT INTO districts (state_id, name, slug)
SELECT s.id, d.name, d.slug
FROM states s
JOIN (VALUES
  ('Maharashtra', 'Pune', 'pune'),
  ('Maharashtra', 'Mumbai Suburban', 'mumbai-suburban'),
  ('Maharashtra', 'Nagpur', 'nagpur'),
  ('Maharashtra', 'Nashik', 'nashik')
) AS d(state_name, name, slug) ON d.state_name = s.name
ON CONFLICT (slug) DO NOTHING;

INSERT INTO schemes (slug, name, category, summary, eligibility_note, cta_label, is_suggestable, display_order) VALUES
  ('pm-kisan', 'PM-KISAN', 'Income support',
   '₹6,000 a year to landholding farmer families, in three instalments.',
   'Owns cultivable land', 'Check & apply →', TRUE, 10),
  ('ayushman-bharat', 'Ayushman Bharat', 'Health',
   '₹5 lakh per family per year of cashless hospital cover.',
   'On the SECC list', 'Check name →', TRUE, 20),
  ('pm-awas-gramin', 'PM Awas — Gramin', 'Housing',
   'Assistance up to ₹1.2 lakh to build a pucca house.',
   'Kutcha house, SECC', 'Check & apply →', TRUE, 30),
  ('nsap-pension', 'NSAP Pension', 'Welfare',
   'Monthly pension for the elderly, widows and persons with disability.',
   'Below poverty line', 'Apply at panchayat →', TRUE, 40),
  -- Tracked for spending and rollout, but not surfaced as a suggestion.
  ('mgnrega', 'MGNREGA', 'Employment',
   'Hundred days of guaranteed wage employment per rural household per year.',
   'Rural household with a job card', 'Check & apply →', FALSE, 50),
  ('jal-jeevan', 'Jal Jeevan Mission', 'Water',
   'A functional household tap connection for every rural home.',
   'Rural household', 'Check & apply →', FALSE, 60),
  ('pmgsy', 'PMGSY', 'Infrastructure',
   'All-weather road connectivity to unconnected rural habitations.',
   NULL, 'Check & apply →', FALSE, 70),
  ('poshan', 'Poshan Abhiyaan', 'Nutrition',
   'Nutrition support for children, adolescent girls and pregnant women.',
   'Through the local anganwadi', 'Check & apply →', FALSE, 80)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, category = EXCLUDED.category, summary = EXCLUDED.summary,
  eligibility_note = EXCLUDED.eligibility_note, cta_label = EXCLUDED.cta_label,
  is_suggestable = EXCLUDED.is_suggestable, display_order = EXCLUDED.display_order;

-- District top-line. The five schemes below account for ₹1,290 Cr of the
-- ₹1,847 Cr allocated; the balance sits in heads the page doesn't itemise.
INSERT INTO district_budgets (district_id, fiscal_year, allocated_cr, spent_cr)
SELECT d.id, '2025-26', 1847.00, 1203.00 FROM districts d WHERE d.slug = 'pune'
ON CONFLICT (district_id, fiscal_year) DO UPDATE SET
  allocated_cr = EXCLUDED.allocated_cr, spent_cr = EXCLUDED.spent_cr;

INSERT INTO district_scheme_spending (district_id, scheme_id, fiscal_year, display_label, allocated_cr, spent_cr, display_order)
SELECT d.id, s.id, '2025-26', v.label, v.allocated, v.spent, v.ord
FROM (VALUES
  ('mgnrega',        'MGNREGA',            400.00, 328.00, 10),
  ('pm-awas-gramin', 'PM Awas — housing',  300.00, 213.00, 20),
  ('jal-jeevan',     'Jal Jeevan — water', 260.00, 150.80, 30),
  ('pmgsy',          'PMGSY — roads',      180.00,  79.20, 40),
  ('poshan',         'Poshan — nutrition', 150.00, 103.50, 50)
) AS v(scheme_slug, label, allocated, spent, ord)
JOIN schemes s ON s.slug = v.scheme_slug
CROSS JOIN districts d
WHERE d.slug = 'pune'
ON CONFLICT (district_id, scheme_id, fiscal_year) DO UPDATE SET
  display_label = EXCLUDED.display_label, allocated_cr = EXCLUDED.allocated_cr,
  spent_cr = EXCLUDED.spent_cr, display_order = EXCLUDED.display_order;

INSERT INTO scheme_rollout (district_id, scheme_id, fiscal_year, metric_label, target, reached, status, display_order)
SELECT d.id, s.id, '2025-26', v.metric, v.target, v.reached, v.status, v.ord
FROM (VALUES
  ('mgnrega',         'MGNREGA job cards',          120000, 105000, 'On track', 10),
  ('pm-awas-gramin',  'PM Awas houses sanctioned',    8400,   5960, 'On track', 20),
  ('jal-jeevan',      'Jal Jeevan tap connections', 210000, 122000, 'Behind',   30),
  ('ayushman-bharat', 'Ayushman cards issued',      640000, 410000, 'Behind',   40),
  ('poshan',          'Poshan centres upgraded',       940,    648, 'On track', 50)
) AS v(scheme_slug, metric, target, reached, status, ord)
JOIN schemes s ON s.slug = v.scheme_slug
CROSS JOIN districts d
WHERE d.slug = 'pune'
ON CONFLICT (district_id, scheme_id, fiscal_year, metric_label) DO UPDATE SET
  target = EXCLUDED.target, reached = EXCLUDED.reached,
  status = EXCLUDED.status, display_order = EXCLUDED.display_order;

-- Feed is wiped and rewritten per district so re-seeding can't duplicate it.
DELETE FROM feed_items WHERE district_id IN (SELECT id FROM districts WHERE slug = 'pune');

INSERT INTO feed_items (district_id, kind, tag_label, headline, body, source_label, occurred_on, href, scheme_id)
SELECT d.id, v.kind, v.tag_label, v.headline, v.body, v.source_label, v.occurred_on::date, v.href, s.id
FROM (VALUES
  ('parliament', 'Parliament', 'Crop-insurance delays raised on the floor →',
   'The member for Pune flagged pending PMFBY payouts affecting 12,400 farmer families across Haveli and Mulshi, asking for a settlement timeline on 2025 kharif claims.',
   'Lok Sabha · Q. 2471', '2026-07-16', '/parliament', NULL),
  ('rti', 'RTI reply', '₹42 Cr for district roads unspent for eight months',
   'An RTI reply shows sanctioned PMGSY funds idle: work orders were never issued for three of seven approved stretches, and the monsoon window has closed.',
   NULL, '2026-07-14', NULL, 'pmgsy'),
  ('news', 'In the news', 'Ration-card e-KYC deadline extended to 31 August',
   'The state food department pushed back its biometric cut-off after 1.8 lakh cards in the district were flagged for suspension.',
   NULL, '2026-07-15', NULL, NULL),
  ('indicator', 'Long-term', 'Drinking water: 63% of Jal Jeevan taps running →',
   'A third straight quarter below the 85% state target. 214 villages remain on tanker supply through the dry months.',
   'AI-tracked', '2026-07-13', '/schemes/jal-jeevan', 'jal-jeevan')
) AS v(kind, tag_label, headline, body, source_label, occurred_on, href, scheme_slug)
LEFT JOIN schemes s ON s.slug = v.scheme_slug
CROSS JOIN districts d
WHERE d.slug = 'pune';

INSERT INTO refresh_log (district_id, note)
SELECT d.id, 'Seeded from design mock-up' FROM districts d WHERE d.slug = 'pune';
