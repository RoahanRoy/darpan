import { useState } from 'react';
import NavBar from '../components/NavBar.jsx';
import Masthead from '../components/Masthead.jsx';
import Feed from '../components/Feed.jsx';
import SpendingRail from '../components/SpendingRail.jsx';
import SchemeGrid from '../components/SchemeGrid.jsx';
import StatusTable from '../components/StatusTable.jsx';
import PosterBanner from '../components/PosterBanner.jsx';

export default function Home() {
  const [state, setState] = useState('Maharashtra');
  const [district, setDistrict] = useState('Pune');

  return (
    <div className="page">
      <NavBar />

      <div className="wrap">
        <Masthead
          state={state}
          district={district}
          onStateChange={setState}
          onDistrictChange={setDistrict}
        />

        <section id="parliament" className="split split-feed">
          <Feed />
          <SpendingRail />
        </section>

        <SchemeGrid />
        <StatusTable district={district} />
      </div>

      <PosterBanner />
    </div>
  );
}
