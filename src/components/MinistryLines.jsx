import Bar from './Bar.jsx';

/* The inside of one ministry's allocation, as its Demand for Grants analysis
   publishes it.

   Close to BudgetSeriesTable but deliberately not the same component. Two
   differences make merging them a worse table than either:

     Every cell can be empty. The analyses mostly print three columns and skip
     the 2024-25 budget estimate, so "spent vs budgeted" often cannot be
     computed at all — a column BudgetSeriesTable treats as the point of the
     table. Here it is frequently blank, and blank has to read as "the
     document did not print this" rather than as a bar at zero.

     Rows nest. A department and the schemes inside it are not peers, and a
     flat list of them would invite a reader to add a parent to its own
     children.

   The nesting is one level, which is the depth the sources have. `parent` is
   a label rather than an id because the store that feeds this is a flat list
   per ministry with no ids to point at (migration 010). */

export default function MinistryLines({ lines = [] }) {
  const heads = lines.filter((l) => !l.parent);
  const childrenOf = (label) => lines.filter((l) => l.parent === label);

  // A line whose parent was never rendered would vanish silently. It cannot
  // happen — the store refuses to apply an orphan — but rendering the table
  // from `heads` alone is what would hide one, so the count is checked
  // instead of assumed.
  const rendered = heads.length + heads.reduce((n, h) => n + childrenOf(h.label).length, 0);
  const orphans = lines.length - rendered;

  return (
    <>
      <p className="text-muted table-hint">
        Scroll the table sideways for the full series.
      </p>
      <div className="table-scroll">
        <table className="table series-table">
          <thead>
            <tr>
              <th>Head</th>
              <th className="num">2023–24 actual</th>
              <th className="num">2024–25 budgeted</th>
              <th className="num">2024–25 revised</th>
              <th className="series-delivered">Spent vs budgeted</th>
              <th className="num">2025–26 budgeted</th>
            </tr>
          </thead>
          <tbody>
            {heads.map((head) => (
              <Row key={head.label} line={head} under={childrenOf(head.label)} />
            ))}
          </tbody>
        </table>
      </div>
      {orphans > 0 ? (
        <p className="text-muted section-note">
          {orphans} line{orphans === 1 ? '' : 's'} could not be placed under a head and
          {orphans === 1 ? ' is' : ' are'} not shown.
        </p>
      ) : null}
    </>
  );
}

function Row({ line, under = [] }) {
  return (
    <>
      <Cells line={line} />
      {under.map((child) => (
        <Cells key={child.label} line={child} nested />
      ))}
    </>
  );
}

function Cells({ line, nested = false }) {
  return (
    <tr className={nested ? 'series-nested' : undefined}>
      <th scope="row" className="series-name">
        {/* The source calls these "of which", and so does the page: the
            schemes under a department are a selection the analysis chose to
            name, not a partition of it. Saying it in the row rather than only
            in the note above means it survives being read out of order. */}
        {nested ? <span className="text-muted series-ofwhich">of which </span> : null}
        {line.label}
      </th>
      <td className="num tnum">{line.actualsPrev ?? '—'}</td>
      <td className="num tnum">{line.budgeted ?? '—'}</td>
      <td className="num tnum">{line.revised ?? '—'}</td>
      <td className="series-delivered">
        {line.deliveredPct == null ? (
          <span className="text-muted">—</span>
        ) : (
          <>
            <div className="series-pct tnum">{line.deliveredPct}%</div>
            <Bar pct={Math.min(line.deliveredPct, 100)} />
          </>
        )}
      </td>
      <td className="num tnum">{line.nextBudget ?? '—'}</td>
    </tr>
  );
}
