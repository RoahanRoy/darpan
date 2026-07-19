import IndiaMap from './IndiaMap.jsx';

export default function Masthead({
  regions,
  stateSlug,
  areaSlug,
  areaName,
  unitNote,
  onStateChange,
  onAreaChange,
}) {
  const activeState = regions.find((s) => s.slug === stateSlug);
  const areas = activeState?.districts ?? [];

  // Delhi's areas are municipal bodies, Uttarakhand's are revenue districts.
  // Labelling both "District" would misname half the picker.
  const unitLabel = activeState?.unitType === 'urban_local_body' ? 'Municipal body' : 'District';

  return (
    <section className="split split-masthead" id="top">
      <div className="split-main">
        <div className="kicker">
          {activeState?.name ?? '—'} · {areaName}
        </div>
        <h1 className="masthead-title">Where the money goes, and who is asking</h1>
        <p className="text-muted masthead-lede">
          Budget and delivery records for {activeState?.name ?? 'this state'}, taken from
          published documents and linked back to them. Public records only — no login.
        </p>
        {unitNote ? <p className="text-muted masthead-note">{unitNote}</p> : null}
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
          <label htmlFor="area">{unitLabel}</label>
          <select
            id="area"
            className="input"
            value={areaSlug}
            onChange={(e) => onAreaChange(e.target.value)}
            disabled={areas.length === 0}
          >
            {areas.length === 0 ? (
              <option>Nothing tracked yet</option>
            ) : (
              areas.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name}
                </option>
              ))
            )}
          </select>
        </div>

        <IndiaMap regions={regions} activeSlug={stateSlug} onSelect={onStateChange} />
      </div>
    </section>
  );
}
