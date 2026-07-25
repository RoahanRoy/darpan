import useJson from '../hooks/useJson.js';
import useDocumentMeta from '../hooks/useDocumentMeta.js';
import formatDate from '../lib/formatDate.js';
import { ministryPath } from '../lib/routes.js';
import { handleRouteClick } from '../hooks/useRoute.js';
import NavBar from '../components/NavBar.jsx';
import BudgetSeriesTable from '../components/BudgetSeriesTable.jsx';
import MinistryLines from '../components/MinistryLines.jsx';
import PosterBanner from '../components/PosterBanner.jsx';
import { parliamentNavLinks } from '../data/homeContent.js';

/* One ministry, opened out.

   The Parliament page can say that Jal Shakti spent half of what Parliament
   voted it. It cannot say on what, because the answer is in a different
   document — the Demand for Grants analysis for that ministry, one per
   ministry per year. This page holds those.

   Two records sit here that must not be added together, and the page keeps
   them under separate headings for that reason alone:

     the BREAKDOWN, read off the ministry's own Demand for Grants analysis,
     which is usually a partition of the ministry's total; and

     the SCHEMES, from the Union Budget analysis's scheme table, which is the
     centre's own selection of major schemes and cuts across ministries.

   A scheme can appear in both with figures a crore or two apart, because two
   documents rounded separately. Showing them in one table would make that
   look like an error in the data rather than what it is. */

export default function Ministry({ slug }) {
  const { data, error, loading } = useJson(
    `/api/ministry?slug=${encodeURIComponent(slug)}`
  );

  useDocumentMeta({
    title: data
      ? `${data.name} — what it was voted, and what it spent · Yojana Darpan`
      : 'Union ministry · Yojana Darpan',
    description: data
      ? `Spending by the Ministry of ${data.name}, broken down by department and ` +
        `scheme, with each budget estimate set against the revised estimate.`
      : 'Central government spending by ministry, from the documents laid before Parliament.',
  });

  const series = data?.series;

  return (
    <div className="page">
      <NavBar links={parliamentNavLinks} currentPath="/parliament" />

      <div className="wrap">
        <section className="split split-masthead" id="top">
          <div className="split-main">
            <div className="kicker">
              <a
                className="crumb-link"
                href="/parliament"
                onClick={(e) => handleRouteClick(e, '/parliament')}
              >
                Union Government
              </a>
              {data ? ' · Ministry' : ''}
            </div>
            <h1 className="masthead-title">{data?.name ?? 'Ministry'}</h1>

            {series ? (
              <p className="text-muted masthead-lede">
                Allocated <strong>{series.nextBudget}</strong> for 2025–26
                {series.sharePct ? `, ${series.sharePct}% of total central expenditure` : ''}.
                {/* Two sentences, chosen by which way the year actually went.
                    A ministry whose head was revised upwards has no shortfall
                    to report, and printing a negative one as though it were a
                    gap would be a figure that means the opposite of what it
                    says. */}
                {series.revisedUp ? (
                  <>
                    {' '}
                    In 2024–25 it was voted {series.budgeted} and the revised estimate rose
                    to {series.revised} — {series.deliveredPct}% of what Parliament first
                    approved.
                  </>
                ) : (
                  <>
                    {' '}
                    In 2024–25 it was voted {series.budgeted} and expected to spend{' '}
                    {series.revised} — {series.deliveredPct}%, leaving{' '}
                    <strong>{series.shortfallCr}</strong> budgeted and not spent.
                  </>
                )}
              </p>
            ) : null}

            <p className="text-muted masthead-note">
              Figures are as each document printed them. Where a line differs from the
              ministry total by a crore or two, that rounding is the source's and has
              been left alone.
            </p>
          </div>

          <div className="split-rail">
            <div className="kicker kicker-neutral">Other ministries</div>
            {/* The whole list, not a next/previous pair. A reader who came
                here to compare two ministries should not have to go back to
                the table and find the row again. */}
            <nav className="ministry-switch" aria-label="Ministries">
              {(data?.ministries ?? []).map((m) => (
                <a
                  key={m.slug}
                  href={ministryPath(m.slug)}
                  aria-current={m.slug === data?.slug ? 'page' : undefined}
                  onClick={(e) => handleRouteClick(e, ministryPath(m.slug))}
                >
                  {m.name}
                </a>
              ))}
            </nav>
          </div>
        </section>

        {error ? (
          <section className="section-block">
            <h3 className="section-title">This ministry could not be loaded</h3>
            <p className="text-muted section-note">{error}</p>
            <p className="text-muted section-note">
              <a href="/parliament" onClick={(e) => handleRouteClick(e, '/parliament')}>
                Back to the union budget
              </a>
            </p>
          </section>
        ) : loading ? (
          <section className="section-block">
            <p className="text-muted section-note">Loading records…</p>
          </section>
        ) : !data ? null : (
          <>
            <section className="section-block">
              <h3 className="section-title">The four-year series</h3>
              <p className="text-muted section-note">
                The same row this ministry has on the union budget page, alone.
              </p>
              <div className="grid-cells headline-grid">
                <Cell label="2023–24 actual" value={series.actualsPrev} />
                <Cell label="2024–25 budgeted" value={series.budgeted} />
                <Cell label="2024–25 revised" value={series.revised} />
                <Cell
                  label="2025–26 budgeted"
                  value={series.nextBudget}
                  qualifier={series.sharePct ? `${series.sharePct}% of all spending` : null}
                />
              </div>
            </section>

            <section id="breakdown" className="section-block">
              <h3 className="section-title">Where the money goes</h3>
              {data.breakdown ? (
                <>
                  <p className="text-muted section-note">{data.breakdown.basis}</p>
                  <MinistryLines lines={data.breakdown.lines} />
                  {/* Cited here rather than in the sources block at the foot.
                      That block is for documents this project parsed figures
                      out of through the ingestion gate; these were read and
                      typed by a person, which is a weaker claim and is made
                      in a weaker place. */}
                  <p className="text-muted section-note">
                    Transcribed from{' '}
                    <a
                      href={data.breakdown.document.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {data.breakdown.document.title}
                    </a>
                    , PRS Legislative Research, {formatDate(data.breakdown.document.date)}.
                    An empty cell is a figure that analysis did not print.
                  </p>
                </>
              ) : (
                <p className="text-muted section-note">
                  PRS published no Demand for Grants analysis for this ministry in
                  2025–26, so this site holds no breakdown of its allocation. The series
                  above is everything it has.
                </p>
              )}
            </section>

            <section id="ministry-schemes" className="section-block">
              <h3 className="section-title">
                Major central schemes under this ministry
              </h3>
              {data.schemes.length ? (
                <>
                  <p className="text-muted section-note">
                    From the Union Budget analysis's own scheme table — a different
                    document from the breakdown above, and a different selection. A
                    scheme appearing in both may carry figures a crore or two apart,
                    which is the two documents rounding separately and not a
                    disagreement about what was spent.
                  </p>
                  <BudgetSeriesTable rows={data.schemes} />
                </>
              ) : (
                <p className="text-muted section-note">
                  None of the major central schemes the Union Budget analysis lists is
                  demanded under this ministry. That does not mean it runs no schemes —
                  only that none is large enough to be named in that table.
                </p>
              )}
            </section>
          </>
        )}
      </div>

      <PosterBanner sources={data?.sources ?? []} />
    </div>
  );
}

function Cell({ label, value, qualifier }) {
  return (
    <div className="headline-cell">
      <div className="headline-label">{label}</div>
      <div className="headline-amount tnum">{value ?? '—'}</div>
      {qualifier ? <div className="text-muted headline-qual">{qualifier}</div> : null}
    </div>
  );
}
