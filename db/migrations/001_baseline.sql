-- 001 — baseline public schema (Neon Postgres).
--
-- Governing rule: every figure shown to the public traces to a row in
-- `sources`. There is no column in this file for a number that someone
-- typed in without a document behind it.
--
-- The geography split is deliberate and reflects what India actually
-- publishes. Money is voted and reported at STATE level, so budget tables
-- hang off `states`. Physical delivery is reported per district (or per
-- urban local body), so progress hangs off `districts`. There is
-- deliberately no district_budgets table: district-level allocation and
-- spending is not a published artifact in India, and inventing one is how
-- this page previously carried numbers that did not exist.
--
-- The union tables sit alongside rather than above the state ones. The
-- centre's budget is voted by Parliament and reported by ministry; a state's
-- is voted by its legislature and reported by sector. They are not two
-- levels of one hierarchy and the totals do not nest, so nothing here
-- attempts to roll a state's figures up into the centre's.
--
-- This file is the former schema.sql with every DROP removed and every
-- CREATE made conditional. It is written to be a no-op against the database
-- that schema.sql already built, so an existing deployment adopts the
-- migration system without its data being touched. Nothing in db/migrations
-- may ever destroy data; that is what db/reset.js is for, and it is gated.

CREATE TABLE IF NOT EXISTS sources (
  id            SERIAL PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  publisher     TEXT NOT NULL,
  url           TEXT NOT NULL,

  -- The date the DOCUMENT carries, not the date we read it. Where a
  -- document states no date, this holds the file's own generation
  -- timestamp and `document_date_is_inferred` is set, so the UI can hedge
  -- the wording rather than assert a date the paper never claimed.
  document_date DATE NOT NULL,
  document_date_is_inferred BOOLEAN NOT NULL DEFAULT FALSE,

  retrieved_on  DATE NOT NULL,
  note          TEXT
);

CREATE TABLE IF NOT EXISTS states (
  id    SERIAL PRIMARY KEY,
  slug  TEXT NOT NULL UNIQUE,
  name  TEXT NOT NULL,
  -- Delhi is a UT with legislature: its sector budget is comparable to a
  -- state's, but its delivery units are municipal rather than district.
  kind  TEXT NOT NULL CHECK (kind IN ('state', 'ut_with_legislature'))
);

CREATE TABLE IF NOT EXISTS districts (
  id            SERIAL PRIMARY KEY,
  state_id      INTEGER NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,

  -- Uttarakhand reports by revenue district. Delhi's housing data reports
  -- by urban local body (NDMC, cantonment board, the pre-2022 MCD zones),
  -- which are NOT its 11 revenue districts. Calling them all "district"
  -- would misrepresent the unit, so the UI reads this column.
  unit_type     TEXT NOT NULL CHECK (unit_type IN ('district', 'urban_local_body')),
  unit_note     TEXT,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- Top-line budget facts per state per year.
CREATE TABLE IF NOT EXISTS state_budget_headlines (
  id            SERIAL PRIMARY KEY,
  state_id      INTEGER NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  fiscal_year   TEXT NOT NULL,
  label         TEXT NOT NULL,
  amount_cr     NUMERIC(14,2),
  qualifier     TEXT,             -- e.g. '0.6% of GSDP'
  source_id     INTEGER NOT NULL REFERENCES sources(id),
  display_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (state_id, fiscal_year, label)
);

-- The sector table as published: prior-year actuals, current-year budget
-- and revised estimates, next-year budget.
--
-- Keeping budgeted AND revised for the same year is the point. The gap
-- between them is the strongest accountability signal in the dataset, and
-- it is arithmetic on published figures rather than editorial judgement.
CREATE TABLE IF NOT EXISTS state_sector_budgets (
  id              SERIAL PRIMARY KEY,
  state_id        INTEGER NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  sector          TEXT NOT NULL,
  actuals_prev_cr NUMERIC(12,2),  -- 2023-24 actuals
  budgeted_cr     NUMERIC(12,2),  -- 2024-25 budget estimate
  revised_cr      NUMERIC(12,2),  -- 2024-25 revised estimate
  next_budget_cr  NUMERIC(12,2),  -- 2025-26 budget estimate
  provision_note  TEXT,           -- the published one-line gloss
  source_id       INTEGER NOT NULL REFERENCES sources(id),
  display_order   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (state_id, sector)
);

CREATE TABLE IF NOT EXISTS state_scheme_allocations (
  id            SERIAL PRIMARY KEY,
  state_id      INTEGER NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  scheme_name   TEXT NOT NULL,
  sector        TEXT,
  amount_cr     NUMERIC(12,2) NOT NULL,
  fiscal_year   TEXT NOT NULL,
  source_id     INTEGER NOT NULL REFERENCES sources(id),
  display_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (state_id, scheme_name, fiscal_year)
);

-- Physical delivery per district. Column names are generic because
-- different schemes count different things; the metric_*_label columns
-- carry the published wording so nothing is silently relabelled.
CREATE TABLE IF NOT EXISTS district_scheme_progress (
  id             SERIAL PRIMARY KEY,
  district_id    INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  scheme_name    TEXT NOT NULL,
  metric_a_label TEXT NOT NULL,
  metric_a       BIGINT,
  metric_b_label TEXT,
  metric_b       BIGINT,
  metric_c_label TEXT,
  metric_c       BIGINT,
  as_of_date     DATE NOT NULL,
  source_id      INTEGER NOT NULL REFERENCES sources(id),
  UNIQUE (district_id, scheme_name, as_of_date)
);

-- ------------------------------------------------------- union (centre)

-- Top-line facts from the Union Budget, per year.
CREATE TABLE IF NOT EXISTS union_budget_headlines (
  id            SERIAL PRIMARY KEY,
  fiscal_year   TEXT NOT NULL,
  label         TEXT NOT NULL,
  amount_cr     NUMERIC(14,2),
  qualifier     TEXT,             -- e.g. '4.4% of GDP'
  source_id     INTEGER NOT NULL REFERENCES sources(id),
  display_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (fiscal_year, label)
);

-- The centre reports expenditure by MINISTRY, not by the sector headings
-- states use. The two cannot be joined or compared line for line, so this
-- is a separate table rather than a `state_id IS NULL` row in the sector
-- one.
--
-- Column meanings match state_sector_budgets exactly: prior-year actuals,
-- current-year budget and revised, next-year budget. The budget-to-revised
-- gap is the same accountability signal here as it is there.
CREATE TABLE IF NOT EXISTS union_ministry_budgets (
  id              SERIAL PRIMARY KEY,
  ministry        TEXT NOT NULL UNIQUE,
  actuals_prev_cr NUMERIC(14,2),
  budgeted_cr     NUMERIC(14,2),
  revised_cr      NUMERIC(14,2),
  next_budget_cr  NUMERIC(14,2),
  source_id       INTEGER NOT NULL REFERENCES sources(id),
  display_order   INTEGER NOT NULL DEFAULT 0
);

-- Unlike the state scheme table, which the state documents give as a single
-- allocation, the Union analysis publishes the full four-year series per
-- scheme. Keeping all four columns means a scheme that was budgeted and
-- then not spent cannot be shown as though it were only ever an allocation.
CREATE TABLE IF NOT EXISTS union_scheme_allocations (
  id              SERIAL PRIMARY KEY,
  scheme_name     TEXT NOT NULL UNIQUE,
  actuals_prev_cr NUMERIC(12,2),  -- NULL where the scheme did not yet exist
  budgeted_cr     NUMERIC(12,2),
  revised_cr      NUMERIC(12,2),
  next_budget_cr  NUMERIC(12,2),
  source_id       INTEGER NOT NULL REFERENCES sources(id),
  display_order   INTEGER NOT NULL DEFAULT 0
);

-- Audit findings and budget gaps. `kind` drives tag colour.
-- `computed_from_source` marks rows whose number is arithmetic we did on
-- published figures (a budget-to-revised drop) rather than a sentence
-- lifted from the document. A reader deserves to know which they are
-- looking at.
--
-- `state_id` is nullable, and NULL means the finding is about the Union
-- budget rather than any one state. A union finding is not a finding about
-- every state, so it must never fall out of a state's query: `state_id = $1`
-- excludes NULLs, and the parliament query asks for `state_id IS NULL`.
CREATE TABLE IF NOT EXISTS findings (
  id                   SERIAL PRIMARY KEY,
  state_id             INTEGER REFERENCES states(id) ON DELETE CASCADE,
  kind                 TEXT NOT NULL CHECK (kind IN ('audit', 'underspend', 'allocation', 'shortfall')),
  tag_label            TEXT NOT NULL,
  headline             TEXT NOT NULL,
  body                 TEXT NOT NULL,
  computed_from_source BOOLEAN NOT NULL DEFAULT FALSE,
  source_id            INTEGER NOT NULL REFERENCES sources(id),
  display_order        INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS districts_state_idx ON districts (state_id, display_order);
CREATE INDEX IF NOT EXISTS sector_state_idx ON state_sector_budgets (state_id, display_order);
CREATE INDEX IF NOT EXISTS progress_district_idx ON district_scheme_progress (district_id);
CREATE INDEX IF NOT EXISTS findings_state_idx ON findings (state_id, display_order);
CREATE INDEX IF NOT EXISTS union_ministry_idx ON union_ministry_budgets (display_order);
CREATE INDEX IF NOT EXISTS union_scheme_idx ON union_scheme_allocations (display_order);
