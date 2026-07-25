/* The two questions anyone can ask about the front-page roundup without a
   database: does it still cover what it claims to, and is it due a refresh?

   Both are pure, so both are tested (test/roundup.test.js). The file half
   lives in scripts/roundup-due.js and the schedule half in
   .github/workflows/roundup.yml — this is only the arithmetic.

   Dates are plain 'YYYY-MM-DD' and are compared as strings, never parsed with
   `new Date('2026-07-25')`. That parse yields UTC midnight, and any later
   comparison or render shifts by a day for anyone west of Greenwich.
   Lexicographic order on ISO dates is already chronological order, which is
   most of why the format is worth using. src/lib/formatDate.js refuses the
   same parse for the same reason.

   The one place a Date appears is the day count below, and it is built from
   explicit numeric components rather than from a string, so nothing is
   parsed and no zone is ever consulted. */

const utc = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Whole days from `a` to `b`; positive when `b` is later. */
export function daysBetween(a, b) {
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}

/* Whether the roundup is overdue, and by how much. `today` is passed in
   rather than read off the clock, so the caller — and the test — decides what
   day it is. A function that asks the system for the time cannot be pinned,
   and this one decides whether an issue gets opened. */
export function reviewStatus(review, today) {
  const due = today >= review.next_review_by;
  return {
    due,
    daysOverdue: due ? daysBetween(review.next_review_by, today) : 0,
    coversFrom: review.covers_from,
    coversTo: review.covers_to,
    nextReviewBy: review.next_review_by,
  };
}

/* Items dated outside the window the file says it covers. Not a tidiness
   complaint: the block's heading is generated from the rows themselves, so an
   item older than the declared window silently widens what the front page
   claims to be reporting on. Cheap to check, and impossible to spot by eye
   once there are ten of them. */
export function itemsOutsideWindow(items, review) {
  return items
    .filter((i) => i.happened_on < review.covers_from || i.happened_on > review.covers_to)
    .map((i) => `${i.happened_on} ${i.headline}`);
}

/** The declared window in whole months, to check it is the twelve promised. */
export function windowMonths(review) {
  const [fy, fm] = review.covers_from.split('-').map(Number);
  const [ty, tm] = review.covers_to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}
