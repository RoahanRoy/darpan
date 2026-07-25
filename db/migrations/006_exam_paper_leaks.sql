-- 006 — the exams whose papers leaked, per state and for the centre.
--
-- Every other table here follows money. This one follows the other thing a
-- government promises and can fail to deliver: a fair examination. A leaked
-- recruitment paper is not a budget line, but it is the same kind of record —
-- something a state undertook to do, and did badly enough that the exam was
-- scrapped and lakhs of people sat it again or never got the job. It belongs
-- next to the budget on a state's page for the same reason the findings do.
--
-- `state_id` is NULLABLE, and NULL means the exam was conducted nationally —
-- NEET, the SSC papers, UGC-NET, the Army's entrance test. This is the
-- convention `findings` already uses (api/parliament.js: "state_id IS NULL is
-- what makes a finding central"), and it is load-bearing here rather than
-- convenient: roughly half the largest leaks are central exams that no single
-- state conducted, and filing them under the state where an arrest happened
-- would put Bihar's name on a paper the NTA printed.
--
-- `candidates_affected` is TEXT for the reason `state_budget_news.
-- reported_amount` is (migration 005): it holds the outlet's own phrasing,
-- "more than 24 lakh", "nearly 21 lakh". These figures are reported, not
-- counted by anyone here, they are hedged differently by different outlets,
-- and — this is the part a NUMERIC column would invite someone to forget —
-- they must never be summed. A candidate who sat NEET twice after two
-- cancellations is one person, and adding the two exams' figures would count
-- them twice. Text refuses the arithmetic outright.
--
-- Like `state_budget_news` and unlike everything else, a row here cites an
-- outlet rather than hanging off `sources`: these are pointers to journalism,
-- not documents this project parsed. Nothing here is a claim of its own.
--
-- No UNIQUE constraint. The obvious key — (state_id, exam_name,
-- occurred_year) — cannot be one, because NULLs are distinct from each other
-- in a unique index and every central row would slip past it. The store in
-- git is authoritative instead: `npm run db:sync leaks` replaces a scope's
-- rows wholesale, which is what actually keeps duplicates out.

CREATE TABLE IF NOT EXISTS exam_paper_leaks (
  id                  SERIAL PRIMARY KEY,

  -- NULL for a nationally conducted examination. See above.
  state_id            INTEGER REFERENCES states(id) ON DELETE CASCADE,

  -- The examination and who ran it. The body matters: "TET" names half a
  -- dozen different exams run by different councils, and a reader deciding
  -- whether this is the government they vote for needs to see whose it was.
  -- Nullable all the same, because the older incidents survive only in
  -- tallies that name the exam and not its conductor, and writing in the body
  -- this project believes ran it would be inventing a fact the citation does
  -- not carry.
  exam_name           TEXT NOT NULL,
  conducting_body     TEXT,

  -- The year, not a date. Most of these are reported to the year or the
  -- month, and a DATE column would force a precision the reporting does not
  -- have — a fabricated 1 January is worse than an honest year.
  occurred_year       INTEGER NOT NULL,

  -- How many people sat it or had registered, as the outlet put it. Nullable:
  -- plenty of these were reported without a figure at all.
  candidates_affected TEXT,

  -- What happened to the exam: cancelled, re-held, allowed to stand. This is
  -- the part that decides whether the leak cost anyone anything.
  outcome             TEXT NOT NULL,

  -- The incident in this site's own words, and who reported it.
  summary             TEXT NOT NULL,
  outlet              TEXT NOT NULL,
  url                 TEXT NOT NULL,

  display_order       INTEGER NOT NULL DEFAULT 0
);

-- Both pages ask for one scope at a time, newest first. The partial index is
-- for the union page, whose whole query is `state_id IS NULL`.
CREATE INDEX IF NOT EXISTS exam_paper_leaks_state_idx
  ON exam_paper_leaks (state_id, occurred_year DESC);

CREATE INDEX IF NOT EXISTS exam_paper_leaks_union_idx
  ON exam_paper_leaks (occurred_year DESC) WHERE state_id IS NULL;
