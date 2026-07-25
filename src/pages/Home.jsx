import { useEffect, useMemo } from 'react';
import useJson from '../hooks/useJson.js';
import useDocumentMeta from '../hooks/useDocumentMeta.js';
import { navigate } from '../hooks/useRoute.js';
import { homePath } from '../lib/routes.js';
import { resolveRegion } from '../lib/resolveRegion.js';
import NavBar from '../components/NavBar.jsx';
import Masthead from '../components/Masthead.jsx';
import Feed from '../components/Feed.jsx';
import SpendingRail from '../components/SpendingRail.jsx';
import SchemeGrid from '../components/SchemeGrid.jsx';
import StatusTable from '../components/StatusTable.jsx';
import BudgetNews from '../components/BudgetNews.jsx';
import PaperLeaks from '../components/PaperLeaks.jsx';
import PosterBanner from '../components/PosterBanner.jsx';
import { homeNavLinks } from '../data/homeContent.js';

/* The state page. Which state and area it shows comes from the URL, so every
   view here is a link somebody can send.

   The URL-to-region decision lives in src/lib/resolveRegion.js, where it can
   be tested without a renderer. This file renders the result. */

export default function Home({ route }) {
  const { stateSlug, areaSlug } = route;

  const regionsReq = useJson('/api/regions');
  const regions = useMemo(() => regionsReq.data?.states ?? [], [regionsReq.data]);
  const withRecords = useMemo(() => regions.filter((s) => s.hasRecords), [regions]);

  const resolved = useMemo(
    () => resolveRegion(regions, stateSlug, areaSlug),
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
        : resolved.status === 'choose'
          ? 'Yojana Darpan — budget and delivery records, by state'
          : 'Records not found · Yojana Darpan',
    description: ready
      ? `Budget allocations and scheme delivery for ${resolved.area.name} in ${resolved.state.name}, taken from published government documents and linked back to them.`
      : resolved.status === 'choose'
        ? 'Budget allocations and scheme delivery for Indian states and union territories, taken from published government documents and linked back to them. Pick a state to begin.'
        : undefined,
  });

  /* Navigates to the bare state path and lets the canonicalise step above
     choose the area. Picking one here too would be a second, disagreeing
     answer to the same question: this used to take each state's first area,
     which for Uttarakhand is Uttarkashi, while a typed /uttarakhand resolved
     to Dehradun. Same state, two front pages, depending on how you arrived. */
  function handleStateChange(nextStateSlug) {
    navigate(homePath(nextStateSlug));
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
        ) : resolved.status === 'choose' ? (
          <section className="section-block">
            <h3 className="section-title">Pick a state or union territory</h3>
            <p className="text-muted section-note">
              All {regions.length} are listed. {withRecords.length} of them have budget
              figures published so far — those are the coloured ones on the map. The
              rest are here by name while their documents are read.
            </p>
          </section>
        ) : resolved.status === 'unknown-state' ? (
          <section className="section-block">
            <h3 className="section-title">No records for “{stateSlug}”</h3>
            <p className="text-muted section-note">
              That is not a state or union territory we list. Pick one from the map or
              the list above.
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
              fiscalYear={data.schemeFiscalYear ?? data.fiscalYear}
            />
            <StatusTable
              rows={data.progress}
              areaName={data.area.name}
              unitType={data.area.unitType}
            />
            <BudgetNews items={data.news} stateName={data.state.name} />
            <PaperLeaks
              leaks={data.paperLeaks}
              scopeName={data.state.name}
              scopeNote={`Recruitment and entrance examinations ${data.state.name} conducted
                whose question papers leaked. Exams run nationally are on the Parliament
                page instead, because no state conducted them.`}
            />
          </>
        )}
      </div>

      <PosterBanner sources={data?.sources ?? []} creditMap />
    </div>
  );
}
