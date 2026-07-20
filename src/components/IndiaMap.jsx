import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import indiaMap from '@svg-maps/india';

/* Clickable India map, shown alongside the state/area dropdowns.

   Deliberately data-driven, not a static picture: a state lights up and
   becomes clickable ONLY if we hold published figures for it. Everything else
   renders inert and greyed. That keeps the map honest with the rest of the
   page, and a fully clickable India would imply otherwise.

   The test is `hasRecords`, not mere presence in `regions`. All 36 states and
   union territories are in `regions` — they are loaded from the Local
   Government Directory so the picker can name every one of them — but holding
   a state's NAME is not holding its BUDGET. Lighting a state up because we
   know it exists would promise a page of figures and deliver an empty one.

   Matching is by normalised name so a newly sourced state auto-lights-up:
   promote its figures and its shape starts responding, no map edit needed.

   Small states (Delhi is the obvious one) are a few pixels wide on a map of
   India and near-impossible to click. Any available state whose bounding box
   is below MARKER_THRESHOLD gets a marker dot placed at its centre — a large,
   reliable click target. The box is measured from the rendered geometry
   rather than guessed, so it stays correct if the base map ever changes.

   Base geometry: @svg-maps/india (Victor Cazanave), CC-BY-4.0 — attributed
   in the sources block. */

const normalize = (name) => String(name).toLowerCase().replace(/[^a-z]/g, '');

/* The base map's geometry predates two boundary changes and cannot express
   the country as it now is:

   - It draws Dadra and Nagar Haveli and Daman and Diu as two separate
     shapes. They were merged into one union territory in January 2020, and
     both shapes are aliased onto it so either is clickable and lands in the
     right place.
   - It has no Ladakh at all, which was separated from Jammu and Kashmir in
     October 2019 — the J&K shape still covers both. Ladakh is therefore
     reachable from the dropdown but not from the map, and its own shape
     cannot be drawn without new geometry. It is left unaliased rather than
     folded into J&K, because clicking Ladakh's actual territory and being
     shown Jammu and Kashmir's budget would be worse than not responding. */
const SHAPE_ALIASES = new Map([
  ['dadraandnagarhaveli', 'dadraandnagarhavelianddamananddiu'],
  ['damananddiu', 'dadraandnagarhavelianddamananddiu'],
]);

const shapeKey = (name) => {
  const key = normalize(name);
  return SHAPE_ALIASES.get(key) ?? key;
};

// In viewBox units (the map is 612 wide). A state narrower/shorter than this
// on its larger side is too small to hit and earns a marker.
const MARKER_THRESHOLD = 22;

export default function IndiaMap({ regions = [], activeSlug, onSelect }) {
  // normalised state name -> slug, for the states we hold FIGURES for.
  // Keyed on the canonical name, which is what shapeKey resolves a legacy
  // shape name onto.
  const slugByName = useMemo(
    () =>
      new Map(
        regions.filter((r) => r.hasRecords).map((r) => [normalize(r.name), r.slug])
      ),
    [regions]
  );

  const pathRefs = useRef(new Map());
  const [markers, setMarkers] = useState([]);

  // Measure the rendered shapes once they exist, then place a marker on any
  // available state too small to click directly.
  useLayoutEffect(() => {
    const next = [];
    for (const loc of indiaMap.locations) {
      const slug = slugByName.get(shapeKey(loc.name));
      const el = pathRefs.current.get(loc.id);
      if (!slug || !el) continue;
      const b = el.getBBox();
      if (Math.max(b.width, b.height) < MARKER_THRESHOLD) {
        next.push({ id: loc.id, slug, name: loc.name, cx: b.x + b.width / 2, cy: b.y + b.height / 2 });
      }
    }
    setMarkers(next);
  }, [slugByName]);

  const activate = (slug) => (e) => {
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    if (e.type === 'keydown') e.preventDefault();
    onSelect(slug);
  };

  return (
    <div className="field">
      <span className="map-label">Or pick on the map</span>
      <svg
        className="india-map"
        viewBox={indiaMap.viewBox}
        role="group"
        aria-label="Map of India — states with published records are selectable"
      >
        {indiaMap.locations.map((loc) => {
          const slug = slugByName.get(shapeKey(loc.name));
          const available = Boolean(slug);
          const active = available && slug === activeSlug;
          const cls = active ? 'is-active' : available ? 'is-available' : 'is-inert';
          const setRef = (el) => {
            if (el) pathRefs.current.set(loc.id, el);
            else pathRefs.current.delete(loc.id);
          };

          if (!available) {
            return (
              <path
                key={loc.id}
                ref={setRef}
                d={loc.path}
                className={`map-state ${cls}`}
                aria-hidden="true"
              />
            );
          }

          return (
            <path
              key={loc.id}
              ref={setRef}
              d={loc.path}
              className={`map-state ${cls}`}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              aria-label={`${loc.name} — view records`}
              onClick={activate(slug)}
              onKeyDown={activate(slug)}
            >
              <title>{loc.name}</title>
            </path>
          );
        })}

        {/* Markers for states too small to click on their own outline. */}
        {markers.map((m) => {
          const active = m.slug === activeSlug;
          return (
            <circle
              key={`marker-${m.id}`}
              cx={m.cx}
              cy={m.cy}
              r={7}
              className={`map-marker ${active ? 'is-active' : ''}`}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              aria-label={`${m.name} — view records`}
              onClick={activate(m.slug)}
              onKeyDown={activate(m.slug)}
            >
              <title>{m.name}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}
