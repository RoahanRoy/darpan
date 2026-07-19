export default function Masthead({
  regions,
  stateSlug,
  districtSlug,
  districtName,
  onStateChange,
  onDistrictChange,
}) {
  const activeState = regions.find((s) => s.slug === stateSlug);
  const districts = activeState?.districts ?? [];

  return (
    <section className="split split-masthead" id="top">
      <div className="split-main">
        <div className="kicker">This week · {districtName} district</div>
        <h1 className="masthead-title">Where the money goes, and who is asking</h1>
        <p className="text-muted masthead-lede">
          A weekly read of what {districtName} is raising in Parliament and under RTI, matched to
          the schemes and the rupees behind them. Public records only — no login.
        </p>
      </div>
      <div className="split-rail masthead-controls">
        <div className="field">
          <label htmlFor="state">State</label>
          <select
            id="state"
            className="input"
            value={stateSlug}
            onChange={(e) => onStateChange(e.target.value)}
          >
            {regions.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="district">District</label>
          <select
            id="district"
            className="input"
            value={districtSlug}
            onChange={(e) => onDistrictChange(e.target.value)}
            disabled={districts.length === 0}
          >
            {districts.length === 0 ? (
              <option>No districts tracked yet</option>
            ) : (
              districts.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name}
                </option>
              ))
            )}
          </select>
        </div>
        <a href="/map" className="btn btn-primary btn-block">
          View district map →
        </a>
      </div>
    </section>
  );
}
