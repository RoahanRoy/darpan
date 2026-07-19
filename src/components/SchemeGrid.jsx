import { schemes } from '../data/homeContent.js';

export default function SchemeGrid() {
  return (
    <section id="schemes" className="section-block">
      <h3 className="section-title">Schemes you may be eligible for</h3>
      <p className="text-muted section-note">
        Matched to a household in a rural Pune taluka. Eligibility is indicative.
      </p>
      <div className="grid-cells scheme-grid">
        {schemes.map((scheme) => (
          <div key={scheme.id} className="scheme-cell">
            <div className="scheme-kicker">{scheme.category}</div>
            <div className="scheme-name">{scheme.name}</div>
            <p className="text-muted scheme-body">{scheme.body}</p>
            <div className="text-muted scheme-elig">{scheme.eligibility}</div>
            <button type="button" className="btn btn-secondary btn-block">
              {scheme.cta}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
