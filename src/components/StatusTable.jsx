import Tag from './Tag.jsx';

export default function StatusTable({ rows = [], districtName }) {
  return (
    <section id="status" className="section-block">
      <h3 className="section-title">Rollout status across {districtName} district</h3>
      <p className="text-muted section-note">
        Targets vs. progress reported this financial year.
      </p>
      {rows.length === 0 ? (
        <p className="text-muted section-note">No rollout figures filed for this district yet.</p>
      ) : (
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
            {rows.map((row) => (
              <tr key={row.scheme}>
                <td>{row.href ? <a href={row.href}>{row.scheme}</a> : row.scheme}</td>
                <td className="tnum">{row.target}</td>
                <td className="tnum">{row.reached}</td>
                <td>
                  <Tag tone={row.status === 'On track' ? 'neutral' : 'accent'}>{row.status}</Tag>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
