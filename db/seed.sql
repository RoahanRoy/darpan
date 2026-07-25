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
   'The annexure states no date on its face; document_date is the PDF generation timestamp in the file metadata, hence inferred. Covers PMAY-Urban only, not PMAY-Gramin.'),

  ('prs-union-2025-26',
   'Union Budget 2025-26 Analysis',
   'PRS Legislative Research',
   'https://prsindia.org/files/budget/budget_parliament/2025/Union_Budget_Analysis_2025-26.pdf',
   '2025-02-01', FALSE, '2026-07-19',
   'Analyses the Union Budget presented to Parliament on 1 Feb 2025. Figures are Rs crore. The 2024-25 columns are that year''s budget and revised estimates; 2025-26 is a budget estimate, not an outcome.');

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

-- --------------------------------------------------- union (centre)

-- Budget at a Glance, Table 2 of the source. Deficits are carried as the
-- rupee figure with the GDP ratio as the qualifier, because the ratio alone
-- is what gets quoted and the absolute number is what gets borrowed.
INSERT INTO union_budget_headlines (fiscal_year, label, amount_cr, qualifier, source_id, display_order)
SELECT '2025-26', v.label, v.amt, v.qual, src.id, v.ord
FROM sources src, (VALUES
  ('Total expenditure',                5065345.00, 'up 7.4% on revised 2024-25',    1),
  ('Receipts (excluding borrowings)',  3496409.00, 'up 11.1% on revised 2024-25',   2),
  ('Fiscal deficit',                   1568936.00, '4.4% of GDP',                   3),
  ('Revenue deficit',                   523846.00, '1.5% of GDP',                   4),
  ('Interest payments',                1276338.00, '25.2% of total expenditure',    5),
  ('Transfers to states',              2559764.00, 'up 12.5% on revised 2024-25',   6)
) AS v(label, amt, qual, ord)
WHERE src.slug = 'prs-union-2025-26';

-- Table 5, ministry-wise expenditure, in the order the source lists it
-- (descending by 2025-26 allocation). 'Other Ministries' is the source's
-- own residual row and is kept so the column sums to the published total
-- rather than to the thirteen ministries alone.
--
-- The slug is the ministry's URL (migration 009), which is why it is written
-- out rather than generated. 'Other Ministries' takes NULL: it is a residual
-- and not a ministry, so there is nothing for a page about it to say.
INSERT INTO union_ministry_budgets (ministry, slug, actuals_prev_cr, budgeted_cr, revised_cr, next_budget_cr, source_id, display_order)
SELECT v.ministry, v.slug, v.a, v.b, v.r, v.n, src.id, v.ord
FROM sources src, (VALUES
  ('Defence',                                     'defence',
                                                  609504.00,  621941.00,  641060.00,  681210.00,  1),
  ('Road Transport and Highways',                 'road-transport-and-highways',
                                                  275986.00,  278000.00,  280519.00,  287333.00,  2),
  ('Railways',                                    'railways',
                                                  245791.00,  255393.00,  255348.00,  255445.00,  3),
  ('Home Affairs',                                'home-affairs',
                                                  196872.00,  219643.00,  220371.00,  233211.00,  4),
  ('Consumer Affairs, Food and Public Distribution', 'consumer-affairs-food-and-public-distribution',
                                                  232496.00,  223323.00,  212820.00,  215767.00,  5),
  ('Rural Development',                           'rural-development',
                                                  163642.00,  180233.00,  175878.00,  190406.00,  6),
  ('Chemicals and Fertilisers',                   'chemicals-and-fertilisers',
                                                  191165.00,  168500.00,  186653.00,  161965.00,  7),
  ('Agriculture and Farmers'' Welfare',           'agriculture-and-farmers-welfare',
                                                  118147.00,  132470.00,  141352.00,  137757.00,  8),
  ('Education',                                   'education',
                                                  123365.00,  120628.00,  114054.00,  128650.00,  9),
  ('Communications',                              'communications',
                                                  111339.00,  137294.00,  150201.00,  108105.00, 10),
  ('Health and Family Welfare',                   'health-and-family-welfare',
                                                   83149.00,   90959.00,   89974.00,   99859.00, 11),
  ('Jal Shakti',                                  'jal-shakti',
                                                   95109.00,   98714.00,   51558.00,   99503.00, 12),
  ('Housing and Urban Affairs',                   'housing-and-urban-affairs',
                                                   68565.00,   82577.00,   63670.00,   96777.00, 13),
  ('Other Ministries',                            NULL,
                                                 1928316.00, 2210838.00, 2133030.00, 2369358.00, 14)
) AS v(ministry, slug, a, b, r, n, ord)
WHERE src.slug = 'prs-union-2025-26';

-- Table 7, scheme-wise allocation. The two NULLs are printed as '-' in the
-- source: those schemes did not exist in 2023-24, which is not the same as
-- having been allocated nothing, so they are not seeded as zero.
--
-- `ministry` is left unset here and applied from ingest/ministry-spending.json
-- by `npm run db:sync`, along with the per-ministry breakdown. Table 7 does
-- not name a ministry against each scheme — that attribution was read off the
-- Demands for Grants, so it belongs with the rest of what was read by hand.
INSERT INTO union_scheme_allocations (scheme_name, actuals_prev_cr, budgeted_cr, revised_cr, next_budget_cr, source_id, display_order)
SELECT v.scheme, v.a, v.b, v.r, v.n, src.id, v.ord
FROM sources src, (VALUES
  ('MGNREGS',                                                    89154.00, 86000.00, 86000.00, 86000.00,  1),
  ('Jal Jeevan Mission / National Rural Drinking Water Mission',  69992.00, 70163.00, 22694.00, 67000.00,  2),
  ('PM-KISAN',                                                    61441.00, 60000.00, 63500.00, 63500.00,  3),
  ('Pradhan Mantri Awas Yojana - Rural',                          21770.00, 54500.00, 32426.00, 54832.00,  4),
  ('Samagra Shiksha',                                             32830.00, 37500.00, 37010.00, 41250.00,  5),
  ('National Health Mission',                                     33043.00, 36000.00, 36000.00, 37227.00,  6),
  ('Pradhan Mantri Awas Yojana - Urban',                          21684.00, 30171.00, 15170.00, 23294.00,  7),
  ('Modified Interest Subvention Scheme',                         14252.00, 22600.00, 22600.00, 22600.00,  8),
  ('Saksham Anganwadi and POSHAN 2.0',                            21810.00, 21200.00, 20071.00, 21960.00,  9),
  ('New Employment Generation Scheme',                                NULL, 10000.00,  6799.00, 20000.00, 10),
  ('PM Surya Ghar Muft Bijli Yojana',                                 NULL,  6250.00, 11100.00, 20000.00, 11),
  ('National Livelihood Mission - Ajeevika',                      13934.00, 15047.00, 15047.00, 19005.00, 12),
  ('Pradhan Mantri Gram Sadak Yojana',                            15380.00, 19000.00, 14500.00, 19000.00, 13)
) AS v(scheme, a, b, r, n, ord)
WHERE src.slug = 'prs-union-2025-26';

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

-- Union. state_id is NULL: these are findings about the centre's budget, not
-- about any state, and must not surface on a state page.
INSERT INTO findings (state_id, kind, tag_label, headline, body, computed_from_source, source_id, display_order)
SELECT NULL, v.kind, v.tag, v.headline, v.body, v.computed, src.id, v.ord
FROM sources src, (VALUES
  ('underspend', 'Budget gap',
   'Centrally sponsored schemes came in Rs 90,622 crore below budget in 2024-25',
   'Per the revised estimates, spending on centrally sponsored schemes is estimated to be 17.9% lower than the budget estimates for that year. The document attributes this primarily to reductions in Jal Jeevan Mission and Pradhan Mantri Awas Yojana. The 2025-26 budget nonetheless raises the head 30.5% over that revised figure, to Rs 5,41,850 crore.',
   FALSE, 1),

  ('underspend', 'Budget gap',
   'Jal Jeevan Mission spent Rs 22,694 crore against a Rs 70,163 crore budget',
   'The 2024-25 revised estimate is 68% below what was budgeted for the year. The scheme is allocated Rs 67,000 crore again in 2025-26 — close to the figure that went unspent.',
   TRUE, 2),

  ('underspend', 'Budget gap',
   'Pradhan Mantri Awas Yojana spending expected to be 44% below budget in 2024-25',
   'Taking the rural and urban components together, the scheme has an allocation of Rs 78,126 crore in 2025-26, an increase of 64% over the 2024-25 revised estimate.',
   FALSE, 3),

  ('underspend', 'Budget gap',
   'Rs 62,593 crore budgeted for unspecified "New Schemes"; Rs 9,068 crore expected to be spent',
   'The head sits with the Department of Economic Affairs. For 2025-26 it carries Rs 41,700 crore, and the source records that details are not available.',
   FALSE, 4),

  ('shortfall', 'Disinvestment',
   'Disinvestment target missed for the fifth consecutive year',
   'The government is estimated to meet 66% of its 2024-25 disinvestment target. Targets have been reduced for five years running and have not been achieved in any of them. The 2025-26 target is Rs 47,000 crore, below the Rs 50,000 crore budgeted for 2024-25.',
   FALSE, 5),

  ('underspend', 'Ministry',
   'Jal Shakti spent Rs 51,558 crore against a Rs 98,714 crore budget',
   'The ministry''s 2024-25 revised estimate is roughly half what it was budgeted, which the source attributes to Jal Jeevan Mission. Its 2025-26 allocation is restored to Rs 99,503 crore, a 93% rise over the revised figure.',
   FALSE, 6),

  ('underspend', 'Ministry',
   'Housing and Urban Affairs revised down 23%, then budgeted up 52%',
   'Budgeted Rs 82,577 crore for 2024-25 and revised to Rs 63,670 crore, against Rs 96,777 crore budgeted for 2025-26.',
   TRUE, 7),

  ('shortfall', 'Transfers to states',
   'Post-devolution revenue deficit grants cut 44% to Rs 13,705 crore',
   'The grant, paid to states whose revenue falls short after tax devolution, drops from Rs 24,483 crore in the 2024-25 revised estimates. It is the steepest fall in the centre''s transfers table.',
   FALSE, 8),

  ('allocation', 'Ministry',
   'Communications allocation cut Rs 42,096 crore, or 28%',
   'The allocation falls to Rs 1,08,105 crore in 2025-26, which the source attributes primarily to lower capital infusion in BSNL.',
   FALSE, 9)
) AS v(kind, tag, headline, body, computed, ord)
WHERE src.slug = 'prs-union-2025-26';
