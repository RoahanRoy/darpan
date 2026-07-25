import { Suspense, lazy } from 'react';

/* The map is loaded on its own, after the rest of the page.

   @svg-maps/india is 176 kB of path data — 68 kB gzipped, which was 54% of
   the entire bundle. Statically imported it sat in the main chunk, so every
   reader downloaded and parsed the outline of India before anything rendered,
   and /parliament and /about downloaded it despite never drawing a map.

   The placeholder holds the exact aspect ratio of the map's viewBox
   (612 × 696), so the shapes appear in a box already the right size and
   nothing below them moves. A lazy chunk that reflows the page on arrival
   trades a load-time win for a layout shift, which is the worse bargain. */
const IndiaMap = lazy(() => import('./IndiaMap.jsx'));

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

  /* A <select> whose value matches no option silently displays the first one.
     On a URL naming a state we do not hold, that made the picker read "Delhi"
     directly above a page saying there are no records for Bihar — the control
     asserting a selection the page was denying. A placeholder option carries
     the empty value instead, so nothing is claimed. */
  const stateUnresolved = !activeState;
  const areaUnresolved = areas.length > 0 && !areas.some((d) => d.slug === areaSlug);

  // Delhi's areas are municipal bodies, Uttarakhand's are revenue districts.
  // Labelling both "District" would misname half the picker.
  const unitLabel = activeState?.unitType === 'urban_local_body' ? 'Municipal body' : 'District';

  return (
    <section className="split split-masthead" id="top">
      <div className="split-main">
        <div className="kicker">
          {activeState ? `${activeState.name} · ${areaName}` : 'India · all states and union territories'}
        </div>
        <h1 className="masthead-title">Where the money goes, and who is asking</h1>
        <p className="text-muted masthead-lede">
          {activeState
            ? `Budget and delivery records for ${activeState.name}, taken from published documents and linked back to them. Public records only — no login.`
            : 'Budget and delivery records taken from published government documents and linked back to them. Pick a state to begin. Public records only — no login.'}
        </p>
        {unitNote ? <p className="text-muted masthead-note">{unitNote}</p> : null}
      </div>

      <div className="split-rail masthead-controls">
        <div className="field">
          <label htmlFor="state">State</label>
          <select
            id="state"
            className="input"
            value={stateUnresolved ? '' : stateSlug}
            onChange={(e) => onStateChange(e.target.value)}
          >
            {stateUnresolved ? (
              <option value="" disabled>
                {regions.length === 0 ? 'Loading…' : 'Select a state'}
              </option>
            ) : null}
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
            value={areaUnresolved ? '' : areaSlug}
            onChange={(e) => onAreaChange(e.target.value)}
            disabled={areas.length === 0}
          >
            {areas.length === 0 ? (
              <option value="">
                {stateUnresolved ? 'Select a state first' : 'Nothing tracked yet'}
              </option>
            ) : (
              <>
                {areaUnresolved ? (
                  <option value="" disabled>
                    {`Select a ${unitLabel.toLowerCase()}`}
                  </option>
                ) : null}
                {areas.map((d) => (
                  <option key={d.slug} value={d.slug}>
                    {d.name}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        <Suspense fallback={<div className="india-map-placeholder" aria-hidden="true" />}>
          <IndiaMap regions={regions} activeSlug={stateSlug} onSelect={onStateChange} />
        </Suspense>
      </div>
    </section>
  );
}
