import Bar from './Bar.jsx';
import { handleRouteClick } from '../hooks/useRoute.js';

/* The four-column series the Union documents publish for every ministry and
   every major scheme: what was spent last year, what was budgeted and then
   revised this year, and what is budgeted next year.

   The "Spent vs budgeted" column is the point of the table. It is last
   year's revised estimate over last year's budget — not a comparison
   against the new allocation, which has not been spent and cannot be
   delivered against yet.

   `linkFor` optionally turns a row's name into a link to that row's own page,
   returning null for a row with nowhere to go — the ministry table's
   published residual — which stays plain text. A link that goes nowhere
   teaches a reader that none of the links here mean anything.

   `underName` renders a second line beneath the name. The schemes table uses
   it to name the ministry a scheme is demanded under, and that is deliberately
   NOT done by making the scheme name itself a link to the ministry: a link
   reading "MGNREGS" that lands on Rural Development is a link that lied about
   where it went. */

export default function BudgetSeriesTable({
  rows = [],
  showShare = false,
  linkFor,
  underName,
}) {
  return (
    <>
      {/* Shown only where the table cannot fit, so the clipped columns read
          as scrollable rather than as missing. */}
      <p className="text-muted table-hint">
        Scroll the table sideways for the full series.
      </p>
      <div className="table-scroll">
        <table className="table series-table">
          <thead>
            <tr>
              <th>{showShare ? 'Ministry' : 'Scheme'}</th>
              <th className="num">2023–24 actual</th>
              <th className="num">2024–25 budgeted</th>
              <th className="num">2024–25 revised</th>
              <th className="series-delivered">Spent vs budgeted</th>
              <th className="num">2025–26 budgeted</th>
              {showShare ? <th className="num">Share</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const href = linkFor ? linkFor(row) : null;
              return (
                <tr key={row.name}>
                  <th scope="row" className="series-name">
                    {href ? (
                      /* A real href, not a click handler on a span. That is
                         what makes the row openable in a new tab, previewable
                         on hover, and followable by a crawler that runs no
                         JavaScript at all. */
                      <a
                        className="series-link"
                        href={href}
                        onClick={(e) => handleRouteClick(e, href)}
                      >
                        {row.name}
                      </a>
                    ) : (
                      row.name
                    )}
                    {underName ? underName(row) : null}
                  </th>
                  {/* A scheme that did not exist yet has no actual. An em dash
                    says that; "₹0 Cr" would say something false. */}
                  <td className="num tnum">{row.actualsPrev ?? '—'}</td>
                  <td className="num tnum">{row.budgeted}</td>
                  <td className="num tnum">{row.revised}</td>
                  <td className="series-delivered">
                    <div className="series-pct tnum">{row.deliveredPct}%</div>
                    {/* Heads can be revised UP; the bar caps at 100 so it stays
                      readable, but the printed percentage is not clamped. */}
                    <Bar pct={Math.min(row.deliveredPct, 100)} />
                  </td>
                  <td className="num tnum">{row.nextBudget}</td>
                  {showShare ? (
                    <td className="num tnum">
                      {row.sharePct == null ? '—' : `${row.sharePct}%`}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
