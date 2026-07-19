import formatDate from '../lib/formatDate.js';

/* District-level physical delivery. This is the only block whose figures are
   genuinely per-district, and the only one where a scheme's progress can be
   compared across areas. */

export default function StatusTable({ rows = [], areaName, unitType }) {
  const unitWord = unitType === 'urban_local_body' ? '' : ' district';

  return (
    <section id="status" className="section-block">
      <h3 className="section-title">
        Delivery in {areaName}
        {unitWord}
      </h3>

      {rows.length === 0 ? (
        <p className="text-muted section-note">
          No district-level delivery figures are published for this area yet.
        </p>
      ) : (
        rows.map((row) => (
          <div key={row.scheme} className="progress-block">
            <p className="text-muted section-note">
              {row.scheme} · figures as of {formatDate(row.asOf)}
              {row.asOfIsInferred ? ' (date taken from the file, not stated in the document)' : ''}
              {row.sourceUrl ? (
                <>
                  {' · '}
                  <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer">
                    source
                  </a>
                </>
              ) : null}
            </p>
            <table className="table status-table">
              <thead>
                <tr>
                  {row.metrics.map((m) => (
                    <th key={m.label}>{m.label}</th>
                  ))}
                  <th className="status-col">Completed</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {row.metrics.map((m) => (
                    <td key={m.label} className="tnum">
                      {m.value}
                    </td>
                  ))}
                  <td className="tnum">
                    {row.completionPct == null ? '—' : `${row.completionPct}%`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ))
      )}
    </section>
  );
}
