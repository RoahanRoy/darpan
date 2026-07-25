-- 009 — say whether the leak was established, alleged, or disproved.
--
-- 006 built this table on an assumption it never wrote down: that every row
-- in it is a leak. The heading the component prints says so out loud —
-- "Question papers leaked · Bihar" — and every row it has held so far earned
-- that heading.
--
-- The assumption broke the moment the list got long enough to be honest. Of
-- the incidents now in the store, several were investigated and found not to
-- have happened:
--
--   UGC-NET June 2024 was cancelled the day after it was held, on a report
--   that the paper was circulating on the darknet. The CBI then filed a
--   closure report: the screenshot was doctored by a student, and there was
--   no leak. The exam was still cancelled and 9 lakh people still sat it
--   again, so the row belongs here — but calling it a leak is now a claim the
--   citation contradicts.
--
--   MPPSC's 2024 prelims paper was offered for sale on Telegram; the
--   commission compared it with the original and it was a fake. The exam was
--   held on schedule.
--
--   The Punjab pharmacist-officer racket in 2026 was a live cheating
--   operation — pen cameras, wireless earpieces, post-dated cheques — that
--   police were explicit did not involve any advance leak of the paper.
--
-- Those are not leaks, and they are not nothing. An exam cancelled on a false
-- alarm costs its candidates the same year a real leak costs them, which is
-- the whole reason this table sits next to the budget. Dropping them would
-- lose that; keeping them unlabelled would print something untrue.
--
-- So the status becomes a column rather than a tone of voice in the summary.
-- Four values, which are the distinctions the reporting actually makes:
--
--   confirmed  investigators, the conducting body or a court established it.
--   alleged    claimed by candidates, an opposition party or a complaint, and
--              not established either way at the time of the report.
--   suspected  the body itself acted on its own suspicion — withheld results,
--              postponed on intelligence — without asserting a leak.
--   denied     investigated and found not to have happened.
--
-- A CHECK rather than an ENUM, matching `findings.kind` and
-- `state_budget_news.category`: adding a fifth value later is one ALTER of a
-- constraint instead of a type migration, and no page dispatches on it in a
-- way a type would protect.
--
-- Nothing is destroyed. The column arrives with a default so the existing
-- rows keep their meaning — every one of them was written from a compilation
-- of leaks and is 'confirmed' — and the default is then dropped, so that an
-- item added later which forgets to declare a status fails its insert instead
-- of being filed silently as established fact. That is the same reasoning
-- 005 used for `state_budget_news.category`.

ALTER TABLE exam_paper_leaks
  ADD COLUMN IF NOT EXISTS leak_status TEXT NOT NULL DEFAULT 'confirmed';

ALTER TABLE exam_paper_leaks
  DROP CONSTRAINT IF EXISTS exam_paper_leaks_status_check;

ALTER TABLE exam_paper_leaks
  ADD CONSTRAINT exam_paper_leaks_status_check
  CHECK (leak_status IN ('confirmed', 'alleged', 'suspected', 'denied'));

ALTER TABLE exam_paper_leaks
  ALTER COLUMN leak_status DROP DEFAULT;
