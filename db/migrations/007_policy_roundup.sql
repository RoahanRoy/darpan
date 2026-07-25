-- 007 — what changed nationally in the last twelve months, for the front page.
--
-- Every page on this site so far answers "what about here?" — pick a state,
-- read its budget. The front page asks nothing and answers nothing: it is a
-- map and a prompt to choose. A reader who arrives without a state in mind
-- gets no reason to care yet.
--
-- This table is that reason. A short, dated digest of the policy and scheme
-- changes of the last twelve months and who they land on: GST rebuilt into
-- two rates, MGNREGA repealed and replaced, the labour codes commenced, an
-- exam cancelled under 22 lakh people. It is deliberately national in
-- outlook, and a state item earns its place only when the change is large
-- enough to read from outside that state.
--
-- `impact` is a column of its own rather than a second paragraph of
-- `summary`, because the two are different claims and the split forces the
-- harder one to be written. "GST moved to two rates" is a fact anyone can
-- copy from a press release. "Insurance premiums came out of GST entirely,
-- and a 12% slab of household goods fell to 5%" is what a reader actually
-- came for, and leaving it optional is how a roundup silently degenerates
-- into a list of announcements.
--
-- `happened_on` is the date the change TOOK EFFECT, or was announced or
-- established when there is no commencement to point at — not the date the
-- report was filed. The Income-tax Act, 2025 gets 1 April 2026, the day it
-- came into force, even though the citation is a release published that
-- morning; the SIR assessment gets the day the exercise completed a year.
-- Sorting by publication would put a retrospective ahead of a law that
-- changed the country a month earlier.
--
-- No `state_id`. The one-line `region_label` says "All India" or names a
-- state, and stays free text on purpose: several of these belong to the
-- Centre, one belongs to a state, and a foreign key would have to invent a
-- row for the first kind. Nothing here is per-state data — the state pages
-- already hold that, and this is the view from above them.
--
-- The covered window is NOT stored. /api/roundup derives it from the rows'
-- own min and max, so the page can only ever claim the span it actually
-- holds. A declared window in a column would keep saying "twelve months to
-- July" for as long as nobody updated it, which is precisely the lie this
-- block would be worst at telling. Staleness shows on the face of the page.
-- The promise to refresh is kept in ingest/policy-roundup.json and enforced
-- by .github/workflows/roundup.yml, which opens an issue when the review
-- date passes.

CREATE TABLE IF NOT EXISTS policy_roundup (
  id            SERIAL PRIMARY KEY,

  -- When it took effect. See above: not when it was written about.
  happened_on   DATE NOT NULL,

  -- 'All India', or the state a change belongs to. Free text; see above.
  region_label  TEXT NOT NULL,

  headline      TEXT NOT NULL,

  -- What changed, and what it lands on. Two columns, not one. See above.
  summary       TEXT NOT NULL,
  impact        TEXT NOT NULL,

  -- Who reported it. Government releases (PIB, DD News) are cited the same
  -- way an outlet is: this table holds no figure the project stands behind,
  -- and a press release is a source with an interest like any other.
  outlet        TEXT NOT NULL,
  url           TEXT NOT NULL,

  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS policy_roundup_date_idx
  ON policy_roundup (happened_on DESC);
