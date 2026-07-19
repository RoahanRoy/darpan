import Tag from './Tag.jsx';
import { rolloutStatus } from '../data/homeContent.js';

export default function StatusTable({ district }) {
  return (
    <section id="status" className="section-block">
      <h3 className="section-title">Rollout status across {district} district</h3>
      <p className="text-muted section-note">
        Targets vs. progress reported this financial year.
      </p>
      <table className="table status-table">
        <thead>
          <tr>
            <th>Scheme</th>
            <th>Target</th>
            <th>Reached</th>
            <th className="status-col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rolloutStatus.map((row) => (
            <tr key={row.scheme}>
              <td>{row.href ? <a href={row.href}>{row.scheme}</a> : row.scheme}</td>
              <td className="tnum">{row.target}</td>
              <td className="tnum">{row.reached}</td>
              <td>
                <Tag tone={row.status === 'Behind' ? 'accent' : 'neutral'}>{row.status}</Tag>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
