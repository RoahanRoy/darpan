/* The rules that turn a state's sector table into findings.

   Split from scripts/derive-findings.js so it can be tested without a
   database: the script is all IO, this is all arithmetic. The thresholds are
   the editorial judgement in this project — what counts as a gap worth
   printing — so they belong somewhere a test can pin them.

   Nothing here reads or writes anything. Given a state's rows it returns the
   sentences, and the caller decides what to do with them. */

/* A mid-year cut this deep, or a rise this steep, is roughly the worst tenth
   of the 293 published rows. Set from the actual spread rather than picked:
   the 10th percentile of budget-to-revised change is -20%, and the 90th
   percentile of revised-to-next-budget change is +39%. */
const CUT_PCT = -15;
const RISE_PCT = 40;

// A move smaller than this share of the state's own sector total is not
// reported however large its percentage. Keeps small states comparable to
// large ones instead of drowning them in three-digit percentages.
const MATERIAL_SHARE = 0.01;

// Aggregate revision away from the budget, in either direction, that is worth
// saying out loud on its own. Asymmetric because overshoots are rarer: only
// three states clear 110%, while a 5% shortfall is common enough to mean
// something when it appears.
const DELIVERY_PCT = 95;
const OVERSHOOT_PCT = 110;

const PER_STATE = 5;

const rupees = (cr) => `Rs ${Math.round(Number(cr)).toLocaleString('en-IN')} crore`;
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/* The four columns are the same four in every paper, but which years they mean
   slides with the paper. A 2026-27 analysis prints 2024-25 actuals, 2025-26
   budget and revised, and the 2026-27 budget. Getting this wrong would put a
   confident wrong year in front of a reader, so it is derived from the source
   slug the figures were promoted under rather than assumed. */
export function fiscalYears(sourceSlug) {
  const m = /-(\d{4})-(\d{2})$/.exec(sourceSlug);
  if (!m) throw new Error(`cannot read a fiscal year out of source "${sourceSlug}"`);
  const nextStart = Number(m[1]);
  const label = (start) => `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
  return { next: label(nextStart), current: label(nextStart - 1), prev: label(nextStart - 2) };
}

export function findingsFor(rows) {
  const fy = fiscalYears(rows[0].source_slug);
  const total = rows.reduce((s, r) => s + r.nbe, 0);
  const material = total * MATERIAL_SHARE;
  const out = [];

  for (const r of rows) {
    const cutPct = r.be > 0 ? Math.round(((r.re - r.be) / r.be) * 100) : 0;
    const risePct = r.re > 0 ? Math.round(((r.nbe - r.re) / r.re) * 100) : 0;
    const cut = cutPct <= CUT_PCT && r.be - r.re >= material;
    const rise = risePct >= RISE_PCT && r.nbe - r.re >= material;

    if (cut && rise) {
      out.push({
        rank: Math.abs(cutPct) + risePct,
        kind: 'underspend',
        tag_label: 'Budget gap',
        headline: `${r.sector} revised down ${Math.abs(cutPct)}%, then budgeted up ${risePct}%`,
        body:
          `Budgeted at ${rupees(r.be)} for ${fy.current} and revised to ${rupees(r.re)} ` +
          `before the year ended. The ${fy.next} budget sets ${rupees(r.nbe)} — ` +
          `${pct(r.nbe, r.be)}% of what was budgeted the year it was cut.`,
      });
    } else if (cut) {
      out.push({
        rank: Math.abs(cutPct),
        kind: 'underspend',
        tag_label: 'Budget gap',
        headline: `${r.sector} revised down ${Math.abs(cutPct)}% mid-year`,
        body:
          `Budgeted at ${rupees(r.be)} for ${fy.current}, revised to ${rupees(r.re)} — ` +
          `${rupees(r.be - r.re)} announced and then not expected to be spent. ` +
          `The ${fy.next} budget sets ${rupees(r.nbe)}.`,
      });
    } else if (rise) {
      out.push({
        rank: risePct,
        kind: 'allocation',
        tag_label: 'Allocation',
        headline: `${r.sector} up ${risePct}% on last year's revised estimate`,
        body:
          `${rupees(r.re)} was expected to be spent in ${fy.current}; the ${fy.next} ` +
          `budget sets ${rupees(r.nbe)}, a rise of ${rupees(r.nbe - r.re)}.`,
      });
    }
  }

  out.sort((a, b) => b.rank - a.rank);

  /* Aggregate delivery. For a state with no single dramatic sector this is
     the honest headline — and it is the one number that says whether the
     budget as a whole survived the year.

     Both directions are reported. A budget revised sharply UP is the same
     kind of fact as one revised down: it says the original figure put to the
     legislature did not survive contact with the year. Bihar revised these
     heads up 49%, which the downward-only version of this check passed over
     in silence while reporting nothing else about the state at all.

     "Revised", never "spent". The revised estimate is what the government
     expected to spend when it presented the next budget, not an actual —
     actuals arrive a year later, in the first column. */
  const be = rows.reduce((s, r) => s + r.be, 0);
  const re = rows.reduce((s, r) => s + r.re, 0);
  const delivered = pct(re, be);
  if (delivered < DELIVERY_PCT) {
    out.unshift({
      kind: 'shortfall',
      tag_label: 'Budget gap',
      headline: `${fy.current} spending was revised ${100 - delivered}% below budget across the sector heads`,
      body:
        `${rupees(be)} was budgeted across the ${rows.length} sectors PRS lists and ` +
        `${rupees(re)} was expected to actually be spent — a gap of ${rupees(be - re)}.`,
    });
  } else if (delivered > OVERSHOOT_PCT) {
    out.unshift({
      kind: 'allocation',
      tag_label: 'Budget gap',
      headline: `${fy.current} spending was revised ${delivered - 100}% above budget across the sector heads`,
      body:
        `${rupees(be)} was budgeted across the ${rows.length} sectors PRS lists and ` +
        `${rupees(re)} was expected to be spent — ${rupees(re - be)} more than was ` +
        `put to the legislature. The ${fy.next} budget sets ${rupees(total)}.`,
    });
  }

  /* Where the money goes, which every state has and no state's paper states
     as a single fact. Last, because it is context rather than a gap. */
  const largest = rows.reduce((a, b) => (b.nbe > a.nbe ? b : a));
  out.push({
    kind: 'allocation',
    tag_label: 'Largest head',
    headline: `${largest.sector} takes ${pct(largest.nbe, total)}% of sector spending in ${fy.next}`,
    body:
      `${rupees(largest.nbe)} of the ${rupees(total)} budgeted across the ` +
      `${rows.length} sector heads PRS lists — the largest single head.`,
  });

  return out.slice(0, PER_STATE).map(({ rank, ...f }) => ({
    ...f,
    computed_from_source: true,
    source_slug: rows[0].source_slug,
  }));
}
