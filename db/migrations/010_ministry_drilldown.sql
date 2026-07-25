-- 009 — make a ministry something a reader can open.
--
-- The Parliament page prints fourteen ministry rows and stops there. A reader
-- who sees Jal Shakti spend 52% of what Parliament voted has no way to ask the
-- obvious next question — on WHAT — because the answer is in a document this
-- site never held. Three additions, none of which changes an existing figure:
--
--   1. `union_ministry_budgets.slug`, so a ministry has a URL.
--   2. `union_scheme_allocations.ministry`, so the scheme table can say which
--      ministry's allocation each scheme sits inside, and link to it.
--   3. `union_ministry_lines`, the breakdown itself.

-- ------------------------------------------------------------------ slugs
--
-- Nullable, and the NULL is load-bearing. 'Other Ministries' is the residual
-- the source publishes for everything outside the thirteen it names — not a
-- ministry, with no departments, no schemes and no analysis behind it. Giving
-- it a slug would offer the reader a page that could only ever say "this is
-- not a thing". NULL says the row has no page, and the UI reads it that way.
--
-- Hand-assigned rather than derived from the name. A generated slug would
-- have to decide what to do with the apostrophe in "Agriculture and Farmers'
-- Welfare" and the comma in "Consumer Affairs, Food and Public Distribution",
-- and a URL that changes because somebody improved a slugify function is a
-- URL that was never permanent.

ALTER TABLE union_ministry_budgets ADD COLUMN IF NOT EXISTS slug TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'union_ministry_budgets_slug_key'
  ) THEN
    ALTER TABLE union_ministry_budgets ADD CONSTRAINT union_ministry_budgets_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Keyed on the ministry name, which is already UNIQUE. On an empty database
-- (a rebuild runs migrations before the seed) every one of these matches
-- nothing and db/seed.sql supplies the slugs instead.
UPDATE union_ministry_budgets SET slug = v.slug FROM (VALUES
  ('Defence',                                        'defence'),
  ('Road Transport and Highways',                    'road-transport-and-highways'),
  ('Railways',                                       'railways'),
  ('Home Affairs',                                   'home-affairs'),
  ('Consumer Affairs, Food and Public Distribution', 'consumer-affairs-food-and-public-distribution'),
  ('Rural Development',                              'rural-development'),
  ('Chemicals and Fertilisers',                      'chemicals-and-fertilisers'),
  ('Agriculture and Farmers'' Welfare',              'agriculture-and-farmers-welfare'),
  ('Education',                                      'education'),
  ('Communications',                                 'communications'),
  ('Health and Family Welfare',                      'health-and-family-welfare'),
  ('Jal Shakti',                                     'jal-shakti'),
  ('Housing and Urban Affairs',                      'housing-and-urban-affairs')
) AS v(ministry, slug)
WHERE union_ministry_budgets.ministry = v.ministry
  AND union_ministry_budgets.slug IS NULL;

-- ---------------------------------------------------- scheme → ministry
--
-- A scheme is demanded under exactly one ministry, and the page has never
-- said which. Naming it turns the scheme table from a list into a set of
-- links, and it is the answer to "why does this not add up to the table
-- above" — because a scheme sits INSIDE a ministry's allocation.
--
-- Nullable: a scheme whose ministry nobody has filled in yet must print
-- nothing rather than guess, and text rather than a foreign key because
-- several of these sit under ministries the source folds into 'Other
-- Ministries' — Women and Child Development, Labour and Employment, New and
-- Renewable Energy — which have no row here to point at. The name is the
-- truth; the link is only offered when a row of that name exists.
ALTER TABLE union_scheme_allocations ADD COLUMN IF NOT EXISTS ministry TEXT;

-- ---------------------------------------------------------------- lines
--
-- One line of a ministry's spending, as its Demand for Grants analysis
-- publishes it: a department, a major head, or a scheme.
--
-- The four money columns mirror union_ministry_budgets exactly so the two can
-- be read down the same page, and ALL FOUR are nullable — which the ministry
-- table's are not. That is not laxity. The Demand for Grants analyses mostly
-- print three columns (2023-24 actuals, 2024-25 revised, 2025-26 budgeted)
-- and omit the 2024-25 budget estimate; Education and Railways print all
-- four. A zero in a column the document never printed would be a figure this
-- site invented, so the column stays NULL and the page prints an em dash.
--
-- The rows live in git (ingest/ministry-spending.json) and are applied by
-- scripts/sync.js, like every other table no adapter can regenerate. There is
-- no PDF parser behind these: a person read eleven analyses and typed the
-- tables out. See db/README.md.
CREATE TABLE IF NOT EXISTS union_ministry_lines (
  id              SERIAL PRIMARY KEY,
  ministry_id     INTEGER NOT NULL REFERENCES union_ministry_budgets(id) ON DELETE CASCADE,

  label           TEXT NOT NULL,

  -- NULL means the line stands on its own; otherwise it names the line this
  -- one sits inside, matching that line's `label`. One level, which is the
  -- depth the source tables actually have: a department and, under it, the
  -- schemes an analysis prints as "of which".
  --
  -- A text label rather than a self-referencing id because the store is a
  -- flat list per ministry and has no ids to point at until it is written.
  parent_label    TEXT,

  actuals_prev_cr NUMERIC(14,2),
  budgeted_cr     NUMERIC(14,2),
  revised_cr      NUMERIC(14,2),
  next_budget_cr  NUMERIC(14,2),

  -- What this ministry's lines decompose, and whether they sum to its total.
  -- The single most important sentence on the page, because the failure mode
  -- of any breakdown is a reader adding it up and believing the answer. Three
  -- of the eleven do not sum: Road Transport's total nets off recoveries the
  -- table does not show, Housing's lines are its largest schemes rather than
  -- a partition, and Railways' are the gross expenditure of Indian Railways,
  -- a larger number than the Ministry's own demand.
  --
  -- Repeated on every line of a ministry rather than held once per ministry,
  -- and that is a deliberate denormalisation. The alternative is a second
  -- table with one row per ministry, a second store to keep it in step, and a
  -- new way for the two to disagree. scripts/lib/stores.js checks instead
  -- that every line of a ministry carries the same basis and document, which
  -- turns the repetition into an invariant something enforces.
  basis           TEXT NOT NULL,

  -- The analysis the figures were transcribed from, named on the row itself
  -- rather than joined to `sources`. Migration 004 draws that line: a
  -- `sources` row is a document this project parsed figures out of through
  -- the ingestion gate and stands behind. These went through no gate — they
  -- were read and typed — so they cite the way news and paper leaks cite,
  -- with the document on the face of the record and a link the reader can
  -- check for themselves.
  document_title  TEXT NOT NULL,
  document_url    TEXT NOT NULL,
  document_date   DATE NOT NULL,

  display_order   INTEGER NOT NULL DEFAULT 0
);

-- No index on ministry_id, deliberately. Migration 008 dropped two indexes
-- added on exactly this reasoning and never used once: this table holds
-- around ninety rows, the only query is one ministry's lines in display
-- order, and the planner will sequentially scan it for years yet. An index
-- here would cost a write on every apply to answer no read.
