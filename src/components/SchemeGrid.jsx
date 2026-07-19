/* Named scheme allocations from the state budget.
   The design's original framing was "schemes you may be eligible for", with
   an apply button. Nothing in the sourced data supports an eligibility
   claim for an individual household, so this block reports what each scheme
   was allocated instead of implying a personal entitlement. */

export default function SchemeGrid({ schemes = [], stateName, fiscalYear }) {
  if (schemes.length === 0) return null;

  return (
    <section id="schemes" className="section-block">
      <h3 className="section-title">Named scheme allocations · {stateName}</h3>
      <p className="text-muted section-note">
        What the {fiscalYear} budget sets aside, by scheme. These are allocations, not
        amounts spent.
      </p>
      <div className="grid-cells scheme-grid">
        {schemes.map((scheme) => (
          <div key={scheme.id} className="scheme-cell">
            <div className="scheme-kicker">{scheme.category}</div>
            <div className="scheme-name">{scheme.name}</div>
            <div className="scheme-amount tnum">{scheme.amount}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
