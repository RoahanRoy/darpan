import { useEffect, useMemo, useState } from 'react';
import useJson from '../hooks/useJson.js';
import NavBar from '../components/NavBar.jsx';
import Masthead from '../components/Masthead.jsx';
import Feed from '../components/Feed.jsx';
import SpendingRail from '../components/SpendingRail.jsx';
import SchemeGrid from '../components/SchemeGrid.jsx';
import StatusTable from '../components/StatusTable.jsx';
import PosterBanner from '../components/PosterBanner.jsx';

const DEFAULT_STATE = 'maharashtra';
const DEFAULT_DISTRICT = 'pune';

export default function Home() {
  const [stateSlug, setStateSlug] = useState(DEFAULT_STATE);
  const [districtSlug, setDistrictSlug] = useState(DEFAULT_DISTRICT);

  const regionsReq = useJson('/api/regions');
  const homeReq = useJson(
    districtSlug ? `/api/home?district=${encodeURIComponent(districtSlug)}` : null
  );

  const regions = useMemo(() => regionsReq.data?.states ?? [], [regionsReq.data]);

  // Picking a state moves the district selection to that state's first
  // district; states with nothing tracked yet leave it empty rather than
  // stranding a district that belongs to the previous state.
  function handleStateChange(nextStateSlug) {
    setStateSlug(nextStateSlug);
    const next = regions.find((s) => s.slug === nextStateSlug)?.districts?.[0];
    setDistrictSlug(next ? next.slug : '');
  }

  // Keep the state dropdown honest if the districts arrive after first paint.
  useEffect(() => {
    if (!regions.length) return;
    const owner = regions.find((s) => s.districts.some((d) => d.slug === districtSlug));
    if (owner && owner.slug !== stateSlug) setStateSlug(owner.slug);
  }, [regions, districtSlug, stateSlug]);

  const data = homeReq.data;
  const districtName = data?.district?.name ?? '—';

  return (
    <div className="page">
      <NavBar />

      <div className="wrap">
        <Masthead
          regions={regions}
          stateSlug={stateSlug}
          districtSlug={districtSlug}
          districtName={districtName}
          onStateChange={handleStateChange}
          onDistrictChange={setDistrictSlug}
        />

        {homeReq.error ? (
          <section className="section-block">
            <h3 className="section-title">This district could not be loaded</h3>
            <p className="text-muted section-note">{homeReq.error}</p>
          </section>
        ) : homeReq.loading ? (
          <section className="section-block">
            <p className="text-muted section-note">Loading district records…</p>
          </section>
        ) : !data ? (
          <section className="section-block">
            <h3 className="section-title">No district selected</h3>
            <p className="text-muted section-note">
              Nothing is tracked in this state yet. Pick another state to see its records.
            </p>
          </section>
        ) : (
          <>
            <section id="parliament" className="split split-feed">
              <Feed items={data.feed} />
              <SpendingRail spending={data.spending} />
            </section>

            <SchemeGrid schemes={data.schemes} districtName={districtName} />
            <StatusTable rows={data.rollout} districtName={districtName} />
          </>
        )}
      </div>

      <PosterBanner lastUpdated={data?.lastUpdated} />
    </div>
  );
}
