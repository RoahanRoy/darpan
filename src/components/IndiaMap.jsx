import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import indiaMap from '@svg-maps/india';

/* Clickable India map, shown alongside the state/area dropdowns.

   Every state and union territory we list is clickable. The map is a picker,
   and a picker that refuses half the country is broken however defensible its
   reasons: a reader clicking Bihar and getting no response cannot tell a
   deliberate omission from a bug, and reaches for the dropdown they were
   given the map to avoid.

   What the map does NOT do is pretend all of them have figures. Colour, not
   clickability, carries that:

     is-active     the state in view
     is-available  we hold published figures — click for the numbers
     is-listed     we hold the state's name but no figures yet — click and
                   the page says so in words, which is the honest answer

   Distinguishing the two shades matters because `regions` holds all 36 states
   from the Local Government Directory while figures cover far fewer. Painting
   them alike would promise thirty-odd pages of numbers we cannot show.

   Matching is by normalised name, so a state changes shade on its own the day
   its figures are promoted — no map edit needed.

   Small states (Delhi is the obvious one) are a few pixels wide on a map of
   India and near-impossible to click. Any state whose bounding box is below
   MARKER_THRESHOLD gets a marker dot placed at its centre — a large, reliable
   click target. The box is measured from the rendered geometry rather than
   guessed, so it stays correct if the base map ever changes.

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

/* The tooltip and the accessible name say which of the two shades this is,
   so the distinction survives for a reader who cannot see the colours. */
const label = (name, hasRecords) =>
  hasRecords ? `${name} — view records` : `${name} — no figures published yet`;

export default function IndiaMap({ regions = [], activeSlug, onSelect }) {
  // normalised state name -> { slug, hasRecords }, for every state we list.
  // Keyed on the canonical name, which is what shapeKey resolves a legacy
  // shape name onto.
  const stateByName = useMemo(
    () =>
      new Map(
        regions.map((r) => [normalize(r.name), { slug: r.slug, hasRecords: r.hasRecords }])
      ),
    [regions]
  );

  const pathRefs = useRef(new Map());
  const [markers, setMarkers] = useState([]);

  // Measure the rendered shapes once they exist, then place a marker on any
  // state too small to click directly.
  useLayoutEffect(() => {
    const next = [];
    for (const loc of indiaMap.locations) {
      const entry = stateByName.get(shapeKey(loc.name));
      const el = pathRefs.current.get(loc.id);
      if (!entry || !el) continue;
      const b = el.getBBox();
      if (Math.max(b.width, b.height) < MARKER_THRESHOLD) {
        next.push({
          id: loc.id,
          slug: entry.slug,
          hasRecords: entry.hasRecords,
          name: loc.name,
          cx: b.x + b.width / 2,
          cy: b.y + b.height / 2,
        });
      }
    }
    setMarkers(next);
  }, [stateByName]);

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
        aria-label="Map of India — pick a state or union territory"
      >
        {indiaMap.locations.map((loc) => {
          const entry = stateByName.get(shapeKey(loc.name));
          const slug = entry?.slug;
          const active = Boolean(slug) && slug === activeSlug;
          const cls = active
            ? 'is-active'
            : !entry
              ? 'is-inert'
              : entry.hasRecords
                ? 'is-available'
                : 'is-listed';
          const setRef = (el) => {
            if (el) pathRefs.current.set(loc.id, el);
            else pathRefs.current.delete(loc.id);
          };

          if (!entry) {
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
              aria-label={label(loc.name, entry.hasRecords)}
              onClick={activate(slug)}
              onKeyDown={activate(slug)}
            >
              <title>{label(loc.name, entry.hasRecords)}</title>
            </path>
          );
        })}

        {/* Markers for states too small to click on their own outline. */}
        {markers.map((m) => {
          const active = m.slug === activeSlug;
          const cls = active ? 'is-active' : m.hasRecords ? '' : 'is-listed';
          return (
            <circle
              key={`marker-${m.id}`}
              cx={m.cx}
              cy={m.cy}
              r={7}
              className={`map-marker ${cls}`}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              aria-label={label(m.name, m.hasRecords)}
              onClick={activate(m.slug)}
              onKeyDown={activate(m.slug)}
            >
              <title>{label(m.name, m.hasRecords)}</title>
            </circle>
          );
        })}
      </svg>

      {/* Two shades that mean different things need saying in words. Without
          this a reader has no way to know the grey states are clickable, and
          would read the map as broken for most of the country. */}
      <p className="map-legend">
        <span className="map-key map-key-available" aria-hidden="true" /> figures published
        <span className="map-key map-key-listed" aria-hidden="true" /> listed, no figures yet
      </p>
    </div>
  );
}
