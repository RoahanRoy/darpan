/* Registry of promoters, keyed by the public table they land rows in.
   Staging a fact for a table absent from this map is a hard error. */

import * as stateSectorBudgets from './state-sector-budgets.js';
import * as stateBudgetHeadlines from './state-budget-headlines.js';

const promoters = new Map([
  [stateSectorBudgets.targetTable, stateSectorBudgets],
  [stateBudgetHeadlines.targetTable, stateBudgetHeadlines],
]);

export function promoterFor(targetTable) {
  const p = promoters.get(targetTable);
  if (!p) {
    throw new Error(
      `no promoter registered for "${targetTable}". Add one in ingest/promoters/ ` +
        `before an adapter stages rows for it. Registered: ${[...promoters.keys()].join(', ')}`
    );
  }
  return p;
}
