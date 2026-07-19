import Bar from './Bar.jsx';
import { spending } from '../data/homeContent.js';

export default function SpendingRail() {
  return (
    <div className="split-rail" id="spending">
      <div className="kicker">{spending.period}</div>
      <div className="spend-total">{spending.spent}</div>
      <p className="text-muted spend-sub">{spending.summary}</p>
      <Bar pct={spending.releasedPct} className="spend-bar" />

      <div className="kicker kicker-neutral">By scheme</div>
      <div className="spend-list">
        {spending.byScheme.map((row) => (
          <div key={row.name}>
            <div className="spend-row">
              <span>{row.name}</span>
              <span className="tnum">{row.pct}%</span>
            </div>
            <Bar pct={row.pct} />
          </div>
        ))}
      </div>

      <a href="/schemes/jal-jeevan" className="btn btn-ghost spend-drill">
        Drill into Jal Jeevan →
      </a>
    </div>
  );
}
