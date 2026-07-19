-- Yojana Darpan — ingestion staging schema (Neon Postgres).
--
-- These tables are deliberately NOT part of schema.sql. That file drops and
-- recreates the public tables on every migrate; staging holds review history
-- that must outlive a reseed, so it lives here and is created if-not-exists.
--
-- Nothing in this file has a foreign key into the public tables, for the same
-- reason: `DROP TABLE sources CASCADE` in schema.sql would take the staging
-- history with it.
--
-- The governing rule from schema.sql still holds, and this is the machinery
-- that enforces it: an adapter cannot write to the public tables. It can only
-- propose. A human approves, and only then does a promoter move the row
-- across. Scraped figures are exactly the kind of number that used to end up
-- on the page without a document behind it, so the gate is structural rather
-- than a note in a README.

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id           SERIAL PRIMARY KEY,
  adapter      TEXT NOT NULL,
  -- What this run was about, for the log: 'uttarakhand:2025-26'.
  target_key   TEXT,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at  TIMESTAMPTZ,
  status       TEXT NOT NULL DEFAULT 'running'
               CHECK (status IN ('running', 'ok', 'failed')),
  -- Populated on failure. A run that dies because the source changed its
  -- markup must leave a readable trace, because that is the common case.
  error        TEXT,
  counts       JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- The bytes we actually parsed, kept so a bad figure is diagnosable later
-- without re-fetching a document that may have changed or moved.
CREATE TABLE IF NOT EXISTS raw_documents (
  id            SERIAL PRIMARY KEY,
  run_id        INTEGER NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  media_type    TEXT,
  byte_size     INTEGER NOT NULL,
  -- Lets a later run skip re-parsing a document that has not changed, and
  -- proves after the fact which bytes a figure came out of.
  sha256        TEXT NOT NULL,
  extracted_text TEXT,

  -- The `sources` row this document will become on promotion. It is staged
  -- rather than written directly because document_date is the field most
  -- likely to be wrong, and it is the one the UI hedges its wording on.
  source_slug      TEXT NOT NULL,
  source_title     TEXT NOT NULL,
  source_publisher TEXT NOT NULL,
  source_note      TEXT,

  -- The date the DOCUMENT carries. NULL means the adapter could not find one
  -- on the face of the document; the promoter refuses to promote in that
  -- case rather than substituting fetched_at, which would assert a date the
  -- paper never claimed.
  document_date             DATE,
  document_date_is_inferred BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS raw_documents_run_url_idx
  ON raw_documents (run_id, url);

-- One proposed row per public-table row. `payload` is JSONB because staging
-- sits before normalisation — the shape is whatever the target table needs,
-- and the promoter for that table is what knows how to read it. This is the
-- one place in the project where a generic shape is the right call.
CREATE TABLE IF NOT EXISTS staged_facts (
  id              SERIAL PRIMARY KEY,
  run_id          INTEGER NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  raw_document_id INTEGER REFERENCES raw_documents(id) ON DELETE SET NULL,

  -- Which public table this is destined for. There must be a promoter
  -- registered for it or the run refuses to stage the row at all.
  target_table    TEXT NOT NULL,

  -- Identity within that table, matching its UNIQUE constraint:
  -- 'uttarakhand|Police' for state_sector_budgets. Used for diffing against
  -- the last run and for addressing a single row at review time.
  natural_key     TEXT NOT NULL,

  payload         JSONB NOT NULL,

  -- Diff against what is currently live, computed at stage time. 'unchanged'
  -- rows are recorded and not shown for review: the fact that a source still
  -- says what it said is worth logging, and re-approving it is not.
  diff_kind       TEXT NOT NULL CHECK (diff_kind IN ('new', 'changed', 'unchanged')),
  previous_payload JSONB,

  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'promoted')),
  reviewed_by     TEXT,
  reviewed_at     TIMESTAMPTZ,
  review_note     TEXT,
  promoted_at     TIMESTAMPTZ,

  UNIQUE (run_id, target_table, natural_key)
);

CREATE INDEX IF NOT EXISTS staged_facts_review_idx
  ON staged_facts (status, target_table)
  WHERE status IN ('pending', 'approved');

CREATE INDEX IF NOT EXISTS staged_facts_key_idx
  ON staged_facts (target_table, natural_key, id DESC);
