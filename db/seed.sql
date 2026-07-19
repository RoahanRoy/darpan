-- Seed data for Yojana Darpan — Delhi and Uttarakhand.
--
-- Every figure below was extracted from the primary document cited in its
-- source_id. Nothing here is estimated, interpolated, or carried over from
-- the previous mock-data build (which has been dropped entirely).
--
-- Two honesty constraints are encoded rather than left to reviewer memory:
--
--   1. Money is state-level. India does not publish district allocation or
--      spending, so no such figures appear.
--   2. The PMAY-U district table is from an annexure generated 31 Jul 2023.
--      It is the most recent district-level breakdown available, and it is
--      years old. `as_of_date` carries that, and the UI must show it.

-- ---------------------------------------------------------------- sources

INSERT INTO sources (slug, title, publisher, url, document_date, document_date_is_inferred, retrieved_on, note) VALUES
  ('prs-uk-2025-26',
   'Uttarakhand Budget Analysis 2025-26',
   'PRS Legislative Research',
   'https://prsindia.org/files/budget/budget_state/uttarakhand/2025/Uttarakhand_Budget_Analysis_2025-26.pdf',
   '2025-03-30', FALSE, '2026-07-19',
   'Analyses the budget presented to the state legislature on 20 Feb 2025. Sector figures are Rs crore.'),

  ('prs-delhi-2025-26',
   'Delhi Budget Analysis 2025-26',
   'PRS Legislative Research',
   'https://prsindia.org/files/budget/budget_state/delhi/2025/Delhi_Budget_Analysis_2025-26.pdf',
   '2025-03-31', FALSE, '2026-07-19',
   'Sector figures are Rs crore.'),

  ('pmay-u-lsusq-2471',
   'PMAY-U state and district-wise physical progress (Lok Sabha Unstarred Question 2471, annexure)',
   'Ministry of Housing and Urban Affairs',
   'https://pmay-urban.gov.in/State-district-wise-phy-LSUSQ2471.pdf',
   '2023-07-31', TRUE, '2026-07-19',
   'The annexure states no date on its face; document_date is the PDF generation timestamp in the file metadata, hence inferred. Covers PMAY-Urban only, not PMAY-Gramin.');

-- ----------------------------------------------------------------- states

INSERT INTO states (slug, name, kind) VALUES
  ('delhi', 'Delhi', 'ut_with_legislature'),
  ('uttarakhand', 'Uttarakhand', 'state');

-- -------------------------------------------------------------- districts

-- Uttarakhand's 13 revenue districts, ordered as the source annexure lists
-- them (Garhwal division, then Kumaon).
INSERT INTO districts (state_id, slug, name, unit_type, unit_note, display_order)
SELECT s.id, v.slug, v.name, 'district', NULL, v.ord
FROM states s, (VALUES
  ('uttarkashi',        'Uttarkashi',        1),
  ('chamoli',           'Chamoli',           2),
  ('rudraprayag',       'Rudraprayag',       3),
  ('tehri-garhwal',     'Tehri Garhwal',     4),
  ('dehradun',          'Dehradun',          5),
  ('pauri-garhwal',     'Pauri Garhwal',     6),
  ('pithoragarh',       'Pithoragarh',       7),
  ('bageshwar',         'Bageshwar',         8),
  ('almora',            'Almora',            9),
  ('champawat',         'Champawat',        10),
  ('nainital',          'Nainital',         11),
  ('udham-singh-nagar', 'Udham Singh Nagar',12),
  ('haridwar',          'Haridwar',         13)
) AS v(slug, name, ord)
WHERE s.slug = 'uttarakhand';

-- Delhi's units are the urban local bodies the housing data actually
-- reports against — not Delhi's 11 revenue districts. The three MCD zones
-- were merged into a single Municipal Corporation of Delhi in May 2022,
-- after this annexure's classification, which is recorded per row so the
-- page can say so rather than quietly presenting a defunct boundary.
INSERT INTO districts (state_id, slug, name, unit_type, unit_note, display_order)
SELECT s.id, v.slug, v.name, 'urban_local_body', v.note, v.ord
FROM states s, (VALUES
  ('ndmc',                 'NDMC',                   'New Delhi Municipal Council.', 1),
  ('delhi-cantonment',     'Delhi Cantonment Board', 'Cantonment board, administered separately from the municipal corporation.', 2),
  ('south-delhi-mcd',      'South Delhi MCD',        'Zone of the pre-2022 trifurcated municipal corporation; merged into the unified MCD in May 2022.', 3),
  ('north-delhi-mcd',      'North Delhi MCD',        'Zone of the pre-2022 trifurcated municipal corporation; merged into the unified MCD in May 2022.', 4),
  ('east-delhi-mcd',       'East Delhi MCD',         'Zone of the pre-2022 trifurcated municipal corporation; merged into the unified MCD in May 2022.', 5)
) AS v(slug, name, note, ord)
WHERE s.slug = 'delhi';

-- ------------------------------------------------- budget headlines

INSERT INTO state_budget_headlines (state_id, fiscal_year, label, amount_cr, qualifier, source_id, display_order)
SELECT s.id, '2025-26', v.label, v.amt, v.qual, src.id, v.ord
FROM states s, sources src, (VALUES
  ('Total expenditure (excluding debt repayment)', 75170.00, 'up 9% on revised 2024-25', 1),
  ('Receipts (excluding borrowings)',              62565.00, 'up 6% on revised 2024-25', 2),
  ('Revenue surplus',                               2586.00, '0.6% of GSDP',             3),
  ('Fiscal deficit',                               12605.00, '2.9% of GSDP',             4),
  ('Committed expenditure',                        37678.00, '60% of revenue receipts',  5),
  ('Debt to be repaid',                            26006.00, NULL,                       6)
) AS v(label, amt, qual, ord)
WHERE s.slug = 'uttarakhand' AND src.slug = 'prs-uk-2025-26';

INSERT INTO state_budget_headlines (state_id, fiscal_year, label, amount_cr, qualifier, source_id, display_order)
SELECT s.id, '2025-26', v.label, v.amt, v.qual, src.id, v.ord
FROM states s, sources src, (VALUES
  ('Total expenditure (excluding debt repayment)', 95358.00, 'up 48% on revised 2024-25', 1),
  ('Receipts (excluding borrowings)',              81655.00, NULL,                        2),
  ('Revenue surplus',                               9661.00, NULL,                        3),
  ('Fiscal deficit',                               13703.00, NULL,                        4),
  ('Raised from own resources',                    69450.00, '85% of revenue receipts',   5),
  ('Grants from the centre',                       12096.00, '15% of revenue receipts',   6)
) AS v(label, amt, qual, ord)
WHERE s.slug = 'delhi' AND src.slug = 'prs-delhi-2025-26';

-- --------------------------------------------------- sector budgets

-- Uttarakhand. Columns: 2023-24 actuals, 2024-25 BE, 2024-25 RE, 2025-26 BE.
INSERT INTO state_sector_budgets (state_id, sector, actuals_prev_cr, budgeted_cr, revised_cr, next_budget_cr, provision_note, source_id, display_order)
SELECT s.id, v.sector, v.a, v.b, v.r, v.n, v.note, src.id, v.ord
FROM states s, sources src, (VALUES
  ('Education, Sports, Arts and Culture', 10268.00, 11700.00, 11931.00, 12466.00, 'Rs 3,618 crore for government primary schools and Rs 4,014 crore for government secondary schools.', 1),
  ('Agriculture and Allied Activities',    3690.00,  4450.00,  4451.00,  5051.00, 'Rs 688 crore for horticulture and vegetable crops.', 2),
  ('Health and Family Welfare',            4597.00,  4574.00,  4383.00,  4748.00, 'Rs 1,662 crore for allopathic rural health services and Rs 927 crore for urban.', 3),
  ('Social Welfare and Nutrition',         4348.00,  4572.00,  5380.00,  4509.00, 'Rs 945 crore for child welfare and Rs 725 crore for social security pensions.', 4),
  ('Rural Development',                    3713.00,  4552.00,  4259.00,  4363.00, 'Rs 1,138 crore for Pradhan Mantri Gram Sadak Yojana.', 5),
  ('Water Supply and Sanitation',          1731.00,  1186.00,  1220.00,  3131.00, 'Rs 1,843 crore for Jal Jeevan Mission.', 6),
  ('Police',                               2323.00,  2667.00,  2615.00,  2856.00, 'District police allocated Rs 1,548 crore.', 7),
  ('Transport',                            2570.00,  2894.00,  2878.00,  2648.00, 'Rs 1,961 crore for district and other roads.', 8),
  ('Irrigation and Flood Control',         1162.00,  2175.00,  1822.00,  1926.00, 'Rs 1,312 crore for major irrigation and Rs 273 crore for minor irrigation.', 9),
  ('Energy',                                673.00,  1263.00,   911.00,  1403.00, 'Rs 1,202 crore as capital outlay on power projects.', 10)
) AS v(sector, a, b, r, n, note, ord)
WHERE s.slug = 'uttarakhand' AND src.slug = 'prs-uk-2025-26';

-- Delhi.
INSERT INTO state_sector_budgets (state_id, sector, actuals_prev_cr, budgeted_cr, revised_cr, next_budget_cr, provision_note, source_id, display_order)
SELECT s.id, v.sector, v.a, v.b, v.r, v.n, v.note, src.id, v.ord
FROM states s, sources src, (VALUES
  ('Education, Sports, Arts and Culture', 14681.00, 16146.00, 15924.00, 19039.00, 'Rs 12,732 crore for secondary education.', 1),
  ('Health and Family Welfare',            7555.00,  8685.00,  8519.00, 12894.00, 'Rs 1,667 crore to introduce the Pradhan Mantri Ayushman Bharat Health Infrastructure Mission.', 2),
  ('Transport',                            9129.00,  6865.00,  6535.00, 10677.00, 'Rs 2,000 crore as revenue grants to Delhi Transport Corporation for its working deficit.', 3),
  ('Social Welfare and Nutrition',         3969.00,  6437.00,  4438.00, 10232.00, 'Rs 5,110 crore for Mahila Samridhi Yojana.', 4),
  ('Water Supply and Sanitation',          1828.00,  3442.00,  1589.00,  4917.00, 'Rs 2,050 crore as grants to Delhi Jal Board for capital projects.', 5),
  ('Energy',                               3272.00,  3350.00,  3648.00,  3843.00, 'Rs 3,600 crore for power subsidy to consumers.', 6),
  ('Urban Development',                    2211.00,  4290.00,  2316.00,  3213.00, 'Rs 609 crore as grants to local bodies under AMRUT 2.0.', 7),
  ('Rural Development',                     168.00,   922.00,   192.00,  1024.00, 'Rs 999 crore for the Village Board for Integrated Development of Rural Villages.', 8),
  ('Irrigation and Flood Control',          335.00,   302.00,   397.00,   581.00, 'Rs 475 crore for drainage.', 9),
  ('Police',                                162.00,   338.00,   114.00,   425.00, 'Rs 183 crore for forensic science laboratories.', 10)
) AS v(sector, a, b, r, n, note, ord)
WHERE s.slug = 'delhi' AND src.slug = 'prs-delhi-2025-26';

-- ----------------------------------------------- scheme allocations

INSERT INTO state_scheme_allocations (state_id, scheme_name, sector, amount_cr, fiscal_year, source_id, display_order)
SELECT s.id, v.scheme, v.sector, v.amt, '2025-26', src.id, v.ord
FROM states s, sources src, (VALUES
  ('Government secondary schools',        'Education',                    4014.00, 1),
  ('Government primary schools',          'Education',                    3618.00, 2),
  ('District and other roads',            'Transport',                    1961.00, 3),
  ('Jal Jeevan Mission',                  'Water Supply and Sanitation',  1843.00, 4),
  ('Allopathic rural health services',    'Health and Family Welfare',    1662.00, 5),
  ('District police',                     'Police',                       1548.00, 6),
  ('Major irrigation',                    'Irrigation and Flood Control', 1312.00, 7),
  ('Capital outlay on power projects',    'Energy',                       1202.00, 8),
  ('Pradhan Mantri Gram Sadak Yojana',    'Rural Development',            1138.00, 9),
  ('Child welfare',                       'Social Welfare and Nutrition',  945.00, 10),
  ('Allopathic urban health services',    'Health and Family Welfare',     927.00, 11),
  ('Social security pensions',            'Social Welfare and Nutrition',  725.00, 12),
  ('Horticulture and vegetable crops',    'Agriculture and Allied',        688.00, 13),
  ('Minor irrigation',                    'Irrigation and Flood Control',  273.00, 14)
) AS v(scheme, sector, amt, ord)
WHERE s.slug = 'uttarakhand' AND src.slug = 'prs-uk-2025-26';

INSERT INTO state_scheme_allocations (state_id, scheme_name, sector, amount_cr, fiscal_year, source_id, display_order)
SELECT s.id, v.scheme, v.sector, v.amt, '2025-26', src.id, v.ord
FROM states s, sources src, (VALUES
  ('Secondary education',                                     'Education',                   12732.00, 1),
  ('Mahila Samridhi Yojana',                                  'Social Welfare and Nutrition', 5110.00, 2),
  ('Power subsidy to consumers',                              'Energy',                       3600.00, 3),
  ('Delhi Jal Board capital projects',                        'Water Supply and Sanitation',  2050.00, 4),
  ('Delhi Transport Corporation working deficit',             'Transport',                    2000.00, 5),
  ('Pradhan Mantri Ayushman Bharat Health Infra Mission',     'Health and Family Welfare',    1667.00, 6),
  ('Village Board for Integrated Development of Rural Villages','Rural Development',            999.00, 7),
  ('AMRUT 2.0 grants to local bodies',                        'Urban Development',             609.00, 8),
  ('Drainage',                                                'Irrigation and Flood Control',  475.00, 9),
  ('Forensic science laboratories',                           'Police',                        183.00, 10)
) AS v(scheme, sector, amt, ord)
WHERE s.slug = 'delhi' AND src.slug = 'prs-delhi-2025-26';

-- ------------------------------------------ district physical progress

-- PMAY-Urban, per the LSUSQ 2471 annexure. All three metrics are counts of
-- houses. Uttarakhand state total in the same annexure: 64,856 sanctioned,
-- 51,911 grounded, 31,698 completed.
INSERT INTO district_scheme_progress
  (district_id, scheme_name, metric_a_label, metric_a, metric_b_label, metric_b, metric_c_label, metric_c, as_of_date, source_id)
SELECT d.id, 'Pradhan Mantri Awas Yojana (Urban)',
       'Houses sanctioned', v.sanctioned,
       'Grounded for construction', v.grounded,
       'Houses completed', v.completed,
       '2023-07-31', src.id
FROM districts d, sources src, (VALUES
  ('uttarkashi',         1054,  1024,   437),
  ('chamoli',            2165,  1725,  1356),
  ('rudraprayag',         968,   888,   793),
  ('tehri-garhwal',       975,   966,   930),
  ('dehradun',           7546,  7081,  6473),
  ('pauri-garhwal',      1784,  1609,  1208),
  ('pithoragarh',         846,   539,   389),
  ('bageshwar',           722,   407,   146),
  ('almora',              427,   292,   233),
  ('champawat',           570,   567,   543),
  ('nainital',           5051,  4574,  3800),
  ('udham-singh-nagar', 24254, 18778,  8599),
  ('haridwar',          18494, 13461,  6791),
  -- Delhi urban local bodies. Every one reports sanctioned = grounded =
  -- completed exactly; that is what the annexure says, reproduced without
  -- adjustment.
  ('ndmc',               7842,  7842,  7842),
  ('delhi-cantonment',   6197,  6197,  6197),
  ('south-delhi-mcd',   10107, 10107, 10107),
  ('north-delhi-mcd',    3829,  3829,  3829),
  ('east-delhi-mcd',     2001,  2001,  2001)
) AS v(slug, sanctioned, grounded, completed)
WHERE d.slug = v.slug AND src.slug = 'pmay-u-lsusq-2471';

-- ---------------------------------------------------------- findings

-- Uttarakhand. The CAG items are quoted from the source's own summary; the
-- budget-gap items are arithmetic on the sector table above.
INSERT INTO findings (state_id, kind, tag_label, headline, body, computed_from_source, source_id, display_order)
SELECT s.id, v.kind, v.tag, v.headline, v.body, v.computed, src.id, v.ord
FROM states s, sources src, (VALUES
  ('audit', 'CAG',
   'State received Rs 478 crore of the Rs 657 crore recommended for local bodies',
   'The CAG (2024) noted that in 2022-23 Uttarakhand did not receive the full Finance Commission grants recommended for rural and urban local bodies. Against Rs 657 crore recommended, Rs 478 crore (73%) was released.',
   FALSE, 1),

  ('audit', 'CAG',
   'Rs 788 crore lent between 2018-19 and 2022-23; Rs 103 crore recovered',
   'The CAG (2024) observed that repayment of state loans was poor, with no repayment at all in sectors including transport, and water supply, sanitation, housing and urban development. Further loans of Rs 75 crore went to agriculture despite minor repayments.',
   FALSE, 2),

  ('shortfall', 'CAG',
   'Disaster response fund grant fell Rs 98 crore short in 2022-23',
   'Rs 984 crore was recommended as grants towards the state disaster response fund in 2022-23; Rs 886 crore (90%) was released.',
   FALSE, 3),

  ('underspend', 'Budget gap',
   'Social Welfare and Nutrition budgeted down 16% after a mid-year rise',
   'The sector was revised UP to Rs 5,380 crore in 2024-25 from a Rs 4,572 crore budget, then set at Rs 4,509 crore for 2025-26 — below both the revised and the original figure.',
   TRUE, 4),

  ('allocation', 'Budget gap',
   'Water Supply and Sanitation up 157% in one year',
   'The sector moves from Rs 1,220 crore revised in 2024-25 to Rs 3,131 crore budgeted for 2025-26, driven by Rs 1,843 crore for Jal Jeevan Mission. Capital outlay in the sector rises 363%.',
   TRUE, 5)
) AS v(kind, tag, headline, body, computed, ord)
WHERE s.slug = 'uttarakhand' AND src.slug = 'prs-uk-2025-26';

-- Delhi.
INSERT INTO findings (state_id, kind, tag_label, headline, body, computed_from_source, source_id, display_order)
SELECT s.id, v.kind, v.tag, v.headline, v.body, v.computed, src.id, v.ord
FROM states s, sources src, (VALUES
  ('shortfall', 'Central grants',
   'Central grants came in 27% below budget in 2024-25',
   'As per revised estimates, central grants for 2024-25 are estimated to be 27% lower than budgeted. The document attributes this to an estimated shortfall of Rs 1,335 crore in centrally sponsored scheme grants.',
   FALSE, 1),

  ('underspend', 'Budget gap',
   'Rural Development spent Rs 192 crore against a Rs 922 crore budget',
   'The 2024-25 revised estimate is 79% below the budget estimate — the sharpest shortfall of any sector. The 2025-26 budget nonetheless sets Rs 1,024 crore.',
   TRUE, 2),

  ('underspend', 'Budget gap',
   'Water Supply and Sanitation revised down 54% mid-year',
   'Budgeted at Rs 3,442 crore for 2024-25, revised to Rs 1,589 crore. The 2025-26 budget raises it again to Rs 4,917 crore, roughly triple what was actually expected to be spent.',
   TRUE, 3),

  ('underspend', 'Budget gap',
   'Police revised down 66%, then budgeted up 274%',
   'Budgeted at Rs 338 crore for 2024-25 and revised to Rs 114 crore, against Rs 425 crore budgeted for 2025-26.',
   TRUE, 4),

  ('allocation', 'New scheme',
   'Rs 5,110 crore for Mahila Samridhi Yojana',
   'The single largest named scheme allocation in the 2025-26 Delhi budget, within a Social Welfare and Nutrition sector that rises 131% over the 2024-25 revised estimate.',
   FALSE, 5)
) AS v(kind, tag, headline, body, computed, ord)
WHERE s.slug = 'delhi' AND src.slug = 'prs-delhi-2025-26';
