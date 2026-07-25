/* Says whether the front-page roundup is due its quarterly refresh.

   Usage:
     npm run roundup:due            exits 1 if the review date has passed
     npm run roundup:due -- --on 2027-01-01   as if it were that day

   Needs no database. The roundup's promise — refreshed every quarter — lives
   in ingest/policy-roundup.json, which is in git, so the check that keeps the
   promise can run anywhere without a secret. .github/workflows/roundup.yml
   runs it monthly and opens an issue when this exits non-zero.

   Exiting 1 for "due" is the point: it makes the workflow's job a matter of
   reading a status code rather than parsing prose out of a log. */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { daysBetween, itemsOutsideWindow, reviewStatus, windowMonths } from './lib/roundup.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = 'ingest/policy-roundup.json';

const args = process.argv.slice(2);
const onIndex = args.indexOf('--on');
// Today in ISO, taken in UTC so the answer does not depend on the runner's
// zone. A day either way never matters to a quarterly review.
const today = onIndex >= 0 ? args[onIndex + 1] : new Date().toISOString().slice(0, 10);

const raw = JSON.parse(await readFile(join(root, FILE), 'utf8'));
const { review } = raw;
const items = raw.roundup.india;

const status = reviewStatus(review, today);
const months = windowMonths(review);
const strays = itemsOutsideWindow(items, review);

console.log(`${FILE}: ${items.length} items covering ${status.coversFrom} → ${status.coversTo} (${months} months)`);
console.log(`next review by ${status.nextReviewBy}; today is ${today}`);

// Reported whatever the review date says. An item outside the window is wrong
// now, not at the next refresh, and the front page is already showing it.
if (strays.length) {
  console.error(`${strays.length} item(s) fall outside the declared window:`);
  for (const s of strays) console.error(`  ${s}`);
}

if (status.due) {
  console.error(
    `the roundup is due a refresh — ${status.daysOverdue} day(s) past ${status.nextReviewBy}`
  );
  process.exit(1);
}

console.log(`not due for another ${daysBetween(today, status.nextReviewBy)} day(s)`);

// A stray item still fails the run, just with a different reason printed
// above. Both failures want the same response: open the file.
if (strays.length) process.exit(1);
