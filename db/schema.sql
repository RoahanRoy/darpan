-- Yojana Darpan — primary schema (Neon Postgres).
--
-- Shape follows the home page's four blocks: a district picker, a weekly
-- feed, district spending, and per-scheme rollout status. Money is stored
-- in rupee crore and progress as raw counts; all formatting and all
-- percentage arithmetic happens at read time, so the stored numbers stay
-- auditable against the source records.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS states (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,
  slug  TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS districts (
  id        SERIAL PRIMARY KEY,
  state_id  INTEGER NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  slug      TEXT NOT NULL,
  UNIQUE (state_id, name),
  UNIQUE (slug)
);

-- Scheme catalogue: national, not district-specific.
CREATE TABLE IF NOT EXISTS schemes (
  id               SERIAL PRIMARY KEY,
  slug             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  category         TEXT NOT NULL,
  summary          TEXT NOT NULL,
  eligibility_note TEXT,
  cta_label        TEXT NOT NULL DEFAULT 'Check & apply →',
  -- Controls the "Schemes you may be eligible for" block. Schemes that are
  -- tracked for spending but not surfaced as suggestions stay false.
  is_suggestable   BOOLEAN NOT NULL DEFAULT TRUE,
  display_order    INTEGER NOT NULL DEFAULT 100
);

-- One row per district per financial year: the top-line spending figure.
CREATE TABLE IF NOT EXISTS district_budgets (
  id             SERIAL PRIMARY KEY,
  district_id    INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  fiscal_year    TEXT NOT NULL,              -- '2025-26'
  allocated_cr   NUMERIC(12, 2) NOT NULL CHECK (allocated_cr >= 0),
  spent_cr       NUMERIC(12, 2) NOT NULL CHECK (spent_cr >= 0),
  UNIQUE (district_id, fiscal_year)
);

-- The "By scheme" utilisation bars.
CREATE TABLE IF NOT EXISTS district_scheme_spending (
  id            SERIAL PRIMARY KEY,
  district_id   INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  scheme_id     INTEGER NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  fiscal_year   TEXT NOT NULL,
  -- Display label overrides the scheme name where the page wants a gloss
  -- ("Jal Jeevan — water"). Null falls back to schemes.name.
  display_label TEXT,
  allocated_cr  NUMERIC(12, 2) NOT NULL CHECK (allocated_cr > 0),
  spent_cr      NUMERIC(12, 2) NOT NULL CHECK (spent_cr >= 0),
  display_order INTEGER NOT NULL DEFAULT 100,
  UNIQUE (district_id, scheme_id, fiscal_year)
);

-- The "Rollout status" table. Target and reached are raw counts; the page
-- formats them into Indian units (lakh/crore) at render time.
CREATE TABLE IF NOT EXISTS scheme_rollout (
  id           SERIAL PRIMARY KEY,
  district_id  INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  scheme_id    INTEGER NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  fiscal_year  TEXT NOT NULL,
  metric_label TEXT NOT NULL,                -- 'MGNREGA job cards'
  target       BIGINT NOT NULL CHECK (target > 0),
  reached      BIGINT NOT NULL CHECK (reached >= 0),
  -- Editorial call, not derivable from the ratio alone: a scheme can sit at
  -- 69% and be on track while another at 64% is behind, because the
  -- year-to-date milestones differ.
  status       TEXT NOT NULL CHECK (status IN ('On track', 'Behind', 'At risk', 'Complete')),
  display_order INTEGER NOT NULL DEFAULT 100,
  UNIQUE (district_id, scheme_id, fiscal_year, metric_label)
);

-- The weekly "Raised this week" feed: Parliament questions, RTI replies,
-- news items and long-run AI-tracked indicators.
CREATE TABLE IF NOT EXISTS feed_items (
  id           SERIAL PRIMARY KEY,
  district_id  INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  -- Drives the tag colour: 'parliament' and 'indicator' render as accent.
  kind         TEXT NOT NULL CHECK (kind IN ('parliament', 'rti', 'news', 'indicator')),
  tag_label    TEXT NOT NULL,                -- 'Parliament', 'RTI reply'
  headline     TEXT NOT NULL,
  body         TEXT NOT NULL,
  -- Free text because provenance differs by kind: a Lok Sabha question has
  -- a house and number, an RTI reply has only a date.
  source_label TEXT,
  occurred_on  DATE NOT NULL,
  href         TEXT,
  scheme_id    INTEGER REFERENCES schemes(id) ON DELETE SET NULL,
  published    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The feed is always read as "latest N for one district".
CREATE INDEX IF NOT EXISTS feed_items_district_date_idx
  ON feed_items (district_id, occurred_on DESC);

-- Stamps the "Last updated" line in the page footer.
CREATE TABLE IF NOT EXISTS refresh_log (
  id           SERIAL PRIMARY KEY,
  district_id  INTEGER REFERENCES districts(id) ON DELETE CASCADE,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note         TEXT
);
