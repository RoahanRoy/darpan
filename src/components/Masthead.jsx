import { states, districts } from '../data/homeContent.js';

export default function Masthead({ state, district, onStateChange, onDistrictChange }) {
  return (
    <section className="split split-masthead" id="top">
      <div className="split-main">
        <div className="kicker">This week · {district} district</div>
        <h1 className="masthead-title">Where the money goes, and who is asking</h1>
        <p className="text-muted masthead-lede">
          A weekly read of what {district} is raising in Parliament and under RTI, matched to the
          schemes and the rupees behind them. Public records only — no login.
        </p>
      </div>
      <div className="split-rail masthead-controls">
        <div className="field">
          <label htmlFor="state">State</label>
          <select
            id="state"
            className="input"
            value={state}
            onChange={(e) => onStateChange(e.target.value)}
          >
            {states.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="district">District</label>
          <select
            id="district"
            className="input"
            value={district}
            onChange={(e) => onDistrictChange(e.target.value)}
          >
            {districts.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <a href="/map" className="btn btn-primary btn-block">
          View district map →
        </a>
      </div>
    </section>
  );
}
