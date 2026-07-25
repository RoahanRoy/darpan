-- 005 — let a news row say it is about money reported lost, and how much.
--
-- 004 gave each state a feed of dated, credited pointers to what an outlet
-- reported about its budget. A second kind of story wants the same treatment
-- and must not read as the first: an auditor, an investigating agency or the
-- government itself putting a figure on money paid out under a named scheme
-- that should not have been. "₹115 crore went to dead Gruha Lakshmi
-- beneficiaries" and "Karnataka presented a ₹4.48 lakh crore budget" are both
-- news, but a reader who cannot tell them apart at a glance has been misled by
-- the layout.
--
-- `category` is that distinction, and the page renders the two as separate
-- blocks under separate headings.
--
-- `reported_amount` is deliberately TEXT and not NUMERIC. Every other money
-- column here is a figure this site parsed from a document and stands behind,
-- and NUMERIC is how it says so. This is not that. It is the number the
-- OUTLET reported, hedges intact — "about ₹14,000 crore", "up to ₹120 crore",
-- "₹900 crore" — and the hedge is load-bearing: an allegation an agency has
-- put a round number on is not an audited loss. Storing 14000.00 would strip
-- the qualifier, invite arithmetic across figures that were never
-- commensurable, and quietly promote someone else's estimate to the status of
-- the budget tables. Text keeps it a quotation.
--
-- `scheme_name` is nullable because not every such story is about a scheme.
-- Some are about procurement — Delhi's hospital purchases, Bihar's tender
-- case — where there is no scheme to name and inventing one would be worse
-- than leaving the field empty.

ALTER TABLE state_budget_news
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'budget';

-- Named rather than left to Postgres, so the constraint is the same object
-- whether it was created here or by a later edit, and so db/schema.sql renders
-- a name a reader can search for.
ALTER TABLE state_budget_news
  DROP CONSTRAINT IF EXISTS state_budget_news_category_check;

ALTER TABLE state_budget_news
  ADD CONSTRAINT state_budget_news_category_check
  CHECK (category IN ('budget', 'loss'));

-- The scheme the money was paid out under, when the story names one.
ALTER TABLE state_budget_news
  ADD COLUMN IF NOT EXISTS scheme_name TEXT;

-- The outlet's figure, as the outlet phrased it. See the note above.
ALTER TABLE state_budget_news
  ADD COLUMN IF NOT EXISTS reported_amount TEXT;

-- The state page asks for one category at a time, newest first.
CREATE INDEX IF NOT EXISTS state_budget_news_category_idx
  ON state_budget_news (state_id, category, published_on DESC);
