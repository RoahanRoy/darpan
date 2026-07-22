import Bar from './Bar.jsx';

/* State-level budget. The heading names the state, because these figures are
   NOT the selected district's — India does not publish district allocation or
   spending, so the design's original district-money block could only ever
   have been filled with invented numbers. */

export default function SpendingRail({ spending }) {
  if (!spending) {
    return (
      <div className="split-rail" id="spending">
        <div className="kicker">Budget</div>
        <p className="text-muted spend-sub">No budget records loaded.</p>
      </div>
    );
  }

  /* Every state and union territory is now listed, so a reader can reach one
     whose budget documents have not been read yet. The response is a real
     `spending` object with nothing in it, which would otherwise render as a
     heading, a blank total and an empty bar list — a block that looks broken
     rather than one that is empty on purpose. Say which it is. */
  const bare =
    spending.total == null &&
    spending.headlines.length === 0 &&
    spending.sectors.length === 0;

  if (bare) {
    return (
      <div className="split-rail" id="spending">
        <div className="kicker">Budget</div>
        <p className="text-muted spend-sub">
          No budget figures are published here for {spending.scopeLabel} yet. Nothing
          appears on this site until it has been read out of a government document and
          linked back to it.
        </p>
      </div>
    );
  }

  const perUnit = spending.scopeLabel === 'Delhi' ? 'per municipal body' : 'per district';

  // The total expenditure headline is already the big number above; the rest —
  // receipts, the two deficits, GSDP — make up the fiscal-facts strip so they
  // are on the page rather than only in the payload.
  const facts = spending.headlines.filter(
    (h) => !h.label.startsWith('Total expenditure') && h.amount != null
  );

  return (
    <div className="split-rail" id="spending">
      <div className="kicker">{spending.period}</div>
      <div className="spend-total">{spending.total}</div>
      <p className="text-muted spend-sub">
        total expenditure budgeted, excluding debt repayment. State-wide figure — not {perUnit}.
      </p>

      {facts.length > 0 && (
        <dl className="spend-facts">
          {facts.map((h) => (
            <div key={h.label} className="spend-fact">
              <dt>{h.label}</dt>
              <dd className="tnum">
                {h.amount}
                {h.qualifier ? <span className="spend-fact-q"> · {h.qualifier}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* The year comes from the paper the figures were read out of, not from
          a constant. States sit on different years — most are on 2026-27
          analyses, a few on 2025-26 — and one hardcoded year was wrong for
          nearly all of them. */}
      <div className="kicker kicker-neutral">
        Delivered against budget
        {spending.deliveredYear ? `, ${spending.deliveredYear}` : ''}
      </div>
      <p className="text-muted spend-sub">
        What each sector was budgeted, against what the revised estimate expected to
        actually be spent. Under 100% is money announced and then not spent.
      </p>
      <div className="spend-list">
        {spending.sectors.map((row) => (
          <div key={row.name}>
            <div className="spend-row">
              <span>{row.name}</span>
              <span className="tnum">{row.deliveredPct}%</span>
            </div>
            {/* Sectors can be revised UP; the bar caps at 100 so it stays
                readable, but the printed percentage is not clamped. */}
            <Bar pct={Math.min(row.deliveredPct, 100)} />
            <div className="text-muted spend-detail">
              {row.budgeted} budgeted → {row.revised} revised
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
