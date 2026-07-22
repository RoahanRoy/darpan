-- 004 — a place for dated budget news, per state.
--
-- Everything else on a state page is a figure promoted through the ingestion
-- gate and traced to a `sources` row. News is a different kind of record: a
-- short, dated pointer to something a named outlet reported about a state's
-- budget — the day it was presented, a mid-year cut, a CAG report tabled in
-- the assembly. It is not a figure this site vouches for; it is a link to
-- someone who reported it, with the outlet and date on the face of it so a
-- reader weighs it themselves.
--
-- That is why it does not hang off `sources`. A `sources` row is a document
-- this site parsed figures out of and stands behind; a news row is a citation
-- of someone else's reporting. Conflating the two would let a headline borrow
-- the authority the ingestion gate exists to confer. The two stay separate,
-- and the UI labels news as news.
--
-- Like glosses and findings, the rows live in git (ingest/budget-news.json)
-- and are applied by scripts/apply-news.js, because no adapter can regenerate
-- a human's one-line summary of a news story. See db/README.md.

CREATE TABLE IF NOT EXISTS state_budget_news (
  id            SERIAL PRIMARY KEY,
  state_id      INTEGER NOT NULL REFERENCES states(id) ON DELETE CASCADE,

  -- The story, in the site's own words: a headline and a one-line summary.
  -- Both are written here rather than copied from the outlet, so nothing
  -- reproduces an outlet's copy while still crediting and linking it.
  headline      TEXT NOT NULL,
  summary       TEXT NOT NULL,

  -- Who reported it and where. `url` is the reader's way to check the claim;
  -- `outlet` names the publication so the credit is legible without a click.
  outlet        TEXT NOT NULL,
  url           TEXT NOT NULL,

  -- The date the STORY carries (publication date), not the day it was added.
  -- A budget presented in March should not sort as though it broke today.
  published_on  DATE NOT NULL,

  display_order INTEGER NOT NULL DEFAULT 0,

  -- One outlet's story about one state, identified so apply-news.js can
  -- upsert rather than duplicate on re-run.
  UNIQUE (state_id, url)
);

CREATE INDEX IF NOT EXISTS state_budget_news_state_idx
  ON state_budget_news (state_id, published_on DESC);
