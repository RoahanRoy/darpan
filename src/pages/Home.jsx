import { useEffect, useMemo } from 'react';
import useJson from '../hooks/useJson.js';
import useDocumentMeta from '../hooks/useDocumentMeta.js';
import { navigate } from '../hooks/useRoute.js';
import { homePath } from '../lib/routes.js';
import NavBar from '../components/NavBar.jsx';
import Masthead from '../components/Masthead.jsx';
import Feed from '../components/Feed.jsx';
import SpendingRail from '../components/SpendingRail.jsx';
import SchemeGrid from '../components/SchemeGrid.jsx';
import StatusTable from '../components/StatusTable.jsx';
import PosterBanner from '../components/PosterBanner.jsx';
import { homeNavLinks } from '../data/homeContent.js';

/* The state page. Which state and area it shows comes from the URL, so every
   view here is a link somebody can send.

   The resolution below is the load-bearing part. A URL naming a state we do
   not hold must say so. Quietly falling back to Uttarakhand would tell a
   reader looking for Bihar that these are Bihar's figures, which is the same
   class of failure as inventing them. */

const DEFAULT_STATE = 'uttarakhand';
// The capital, and the area most likely to be looked for. Without it the bare
// path lands on whichever district the source annexure happens to list first,
// which is Uttarkashi — an arbitrary front page.
const DEFAULT_AREA = 'dehradun';

function resolve(regions, stateSlug, areaSlug) {
  if (regions.length === 0) return { status: 'pending' };

  const state = stateSlug
    ? regions.find((s) => s.slug === stateSlug)
    : (regions.find((s) => s.slug === DEFAULT_STATE) ?? regions[0]);

  if (!state) return { status: 'unknown-state' };
  if (state.districts.length === 0) return { status: 'no-areas', state };

  // No area named, or the bare path '/': send the reader to a full address
  // rather than leaving them on a URL that names less than the page shows.
  //
  // The lookup is confined to the state that resolved, which is what makes
  // the fallback safe. Area slugs are NOT unique across states — Bilaspur is
  // in both Himachal Pradesh and Chhattisgarh — so searching the whole
  // country for the preferred one could land a reader in a state they did
  // not ask for. A state that has no area of that name falls back to its own
  // first.
  if (!areaSlug) {
    const preferred = state.districts.find((d) => d.slug === DEFAULT_AREA);
    return { status: 'canonicalise', state, area: preferred ?? state.districts[0] };
  }

  const area = state.districts.find((d) => d.slug === areaSlug);
  if (!area) return { status: 'unknown-area', state };

  return { status: 'ok', state, area };
}

export default function Home({ route }) {
  const { stateSlug, areaSlug } = route;

  const regionsReq = useJson('/api/regions');
  const regions = useMemo(() => regionsReq.data?.states ?? [], [regionsReq.data]);

  const resolved = useMemo(
    () => resolve(regions, stateSlug, areaSlug),
    [regions, stateSlug, areaSlug]
  );

  // Replaces rather than pushes: being moved from /uttarakhand to
  // /uttarakhand/dehradun should not put an entry in history that would
  // forward again the moment the reader goes back to it.
  useEffect(() => {
    if (resolved.status !== 'canonicalise') return;
    navigate(homePath(resolved.state.slug, resolved.area.slug), { replace: true });
  }, [resolved]);

  const ready = resolved.status === 'ok';
  // Both halves of the address are sent. The district slug alone no longer
  // identifies a district: three of them name two states each, and the API
  // refuses those rather than guessing.
  const homeReq = useJson(
    ready
      ? `/api/home?state=${encodeURIComponent(resolved.state.slug)}` +
          `&district=${encodeURIComponent(resolved.area.slug)}`
      : null
  );
  const data = homeReq.data;

  useDocumentMeta({
    title: ready
      ? `${resolved.area.name}, ${resolved.state.name} — budget and delivery records · Yojana Darpan`
      : resolved.status === 'pending'
        ? null
        : 'Records not found · Yojana Darpan',
    description: ready
      ? `Budget allocations and scheme delivery for ${resolved.area.name} in ${resolved.state.name}, taken from published government documents and linked back to them.`
      : undefined,
  });

  function handleStateChange(nextStateSlug) {
    const next = regions.find((s) => s.slug === nextStateSlug);
    navigate(homePath(nextStateSlug, next?.districts?.[0]?.slug));
  }

  function handleAreaChange(nextAreaSlug) {
    navigate(homePath(stateSlug ?? resolved.state?.slug, nextAreaSlug));
  }

  return (
    <div className="page">
      <NavBar links={homeNavLinks} currentPath="/" />

      <div className="wrap">
        <Masthead
          regions={regions}
          stateSlug={resolved.state?.slug ?? ''}
          areaSlug={resolved.area?.slug ?? ''}
          areaName={data?.area?.name ?? resolved.area?.name ?? '—'}
          unitNote={data?.area?.unitNote}
          onStateChange={handleStateChange}
          onAreaChange={handleAreaChange}
        />

        {regionsReq.error ? (
          <section className="section-block">
            <h3 className="section-title">The state list could not be loaded</h3>
            <p className="text-muted section-note">{regionsReq.error}</p>
          </section>
        ) : resolved.status === 'unknown-state' ? (
          <section className="section-block">
            <h3 className="section-title">No records for “{stateSlug}”</h3>
            <p className="text-muted section-note">
              Nothing is published here for that state. Coverage is currently{' '}
              {regions.map((s) => s.name).join(' and ')} — pick one from the map or the
              list above.
            </p>
          </section>
        ) : resolved.status === 'unknown-area' ? (
          <section className="section-block">
            <h3 className="section-title">
              No records for “{areaSlug}” in {resolved.state.name}
            </h3>
            <p className="text-muted section-note">
              That area is not one we hold records for. Pick another from the list above.
            </p>
          </section>
        ) : resolved.status === 'no-areas' ? (
          <section className="section-block">
            <h3 className="section-title">Nothing tracked in {resolved.state.name} yet</h3>
            <p className="text-muted section-note">
              This state is listed but has no published areas. Pick another state.
            </p>
          </section>
        ) : homeReq.error ? (
          <section className="section-block">
            <h3 className="section-title">This area could not be loaded</h3>
            <p className="text-muted section-note">{homeReq.error}</p>
          </section>
        ) : !data ? (
          <section className="section-block">
            <p className="text-muted section-note">Loading records…</p>
          </section>
        ) : (
          <>
            <section id="findings" className="split split-feed">
              <Feed
                items={data.findings}
                heading={`Findings for ${data.state.name}`}
                emptyNote="No findings recorded for this state yet."
              />
              <SpendingRail spending={data.spending} />
            </section>

            <SchemeGrid
              schemes={data.schemes}
              stateName={data.state.name}
              fiscalYear={data.fiscalYear}
            />
            <StatusTable
              rows={data.progress}
              areaName={data.area.name}
              unitType={data.area.unitType}
            />
          </>
        )}
      </div>

      <PosterBanner sources={data?.sources ?? []} creditMap />
    </div>
  );
}
