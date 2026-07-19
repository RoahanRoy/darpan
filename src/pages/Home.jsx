import { useEffect, useMemo, useState } from 'react';
import useJson from '../hooks/useJson.js';
import NavBar from '../components/NavBar.jsx';
import Masthead from '../components/Masthead.jsx';
import Feed from '../components/Feed.jsx';
import SpendingRail from '../components/SpendingRail.jsx';
import SchemeGrid from '../components/SchemeGrid.jsx';
import StatusTable from '../components/StatusTable.jsx';
import PosterBanner from '../components/PosterBanner.jsx';
import { homeNavLinks } from '../data/homeContent.js';

const DEFAULT_STATE = 'uttarakhand';
const DEFAULT_AREA = 'dehradun';

export default function Home() {
  const [stateSlug, setStateSlug] = useState(DEFAULT_STATE);
  const [areaSlug, setAreaSlug] = useState(DEFAULT_AREA);

  const regionsReq = useJson('/api/regions');
  const homeReq = useJson(
    areaSlug ? `/api/home?district=${encodeURIComponent(areaSlug)}` : null
  );

  const regions = useMemo(() => regionsReq.data?.states ?? [], [regionsReq.data]);

  // Picking a state moves the selection to that state's first area; states
  // with nothing tracked leave it empty rather than stranding an area that
  // belongs to the previous state.
  function handleStateChange(nextStateSlug) {
    setStateSlug(nextStateSlug);
    const next = regions.find((s) => s.slug === nextStateSlug)?.districts?.[0];
    setAreaSlug(next ? next.slug : '');
  }

  // Keep the state dropdown honest if the areas arrive after first paint.
  useEffect(() => {
    if (!regions.length) return;
    const owner = regions.find((s) => s.districts.some((d) => d.slug === areaSlug));
    if (owner && owner.slug !== stateSlug) setStateSlug(owner.slug);
  }, [regions, areaSlug, stateSlug]);

  const data = homeReq.data;

  return (
    <div className="page">
      <NavBar links={homeNavLinks} currentPath="/" />

      <div className="wrap">
        <Masthead
          regions={regions}
          stateSlug={stateSlug}
          areaSlug={areaSlug}
          areaName={data?.area?.name ?? '—'}
          unitNote={data?.area?.unitNote}
          onStateChange={handleStateChange}
          onAreaChange={setAreaSlug}
        />

        {homeReq.error ? (
          <section className="section-block">
            <h3 className="section-title">This area could not be loaded</h3>
            <p className="text-muted section-note">{homeReq.error}</p>
          </section>
        ) : homeReq.loading ? (
          <section className="section-block">
            <p className="text-muted section-note">Loading records…</p>
          </section>
        ) : !data ? (
          <section className="section-block">
            <h3 className="section-title">Nothing selected</h3>
            <p className="text-muted section-note">
              Nothing is tracked in this state yet. Pick another state to see its records.
            </p>
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
