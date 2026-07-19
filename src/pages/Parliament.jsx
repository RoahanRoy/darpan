import useJson from '../hooks/useJson.js';
import NavBar from '../components/NavBar.jsx';
import Feed from '../components/Feed.jsx';
import BudgetSeriesTable from '../components/BudgetSeriesTable.jsx';
import PosterBanner from '../components/PosterBanner.jsx';
import { parliamentNavLinks } from '../data/homeContent.js';

/* The central government's budget.

   This page has no state or district picker, and that is deliberate. The
   union budget is not the states' budgets added together — it is a separate
   document, voted by a different house, reported against ministries rather
   than sectors. Offering a region filter here would imply the figures
   decompose by region, and they do not. */

export default function Parliament() {
  const { data, error, loading } = useJson('/api/parliament');

  // The API carries the year as the documents write it ('2025-26'); the
  // page sets it with an en dash, as every other year range here does.
  const fy = data?.fiscalYear.replace('-', '–');

  return (
    <div className="page">
      <NavBar links={parliamentNavLinks} currentPath="/parliament" />

      <div className="wrap">
        <section className="split split-masthead" id="top">
          <div className="split-main">
            <div className="kicker">Union Government · FY 2025–26</div>
            <h1 className="masthead-title">What Parliament voted, and what the centre spent</h1>
            <p className="text-muted masthead-lede">
              The Union Budget as presented to Parliament on 1 February 2025, with last
              year's budget set against last year's revised estimate. Every figure is
              from the document linked at the foot of this page.
            </p>
            <p className="text-muted masthead-note">
              These are central figures. They are not the state budgets added up — the
              two are voted separately, reported on different heads, and do not sum.
            </p>
          </div>

          <div className="split-rail">
            <div className="kicker kicker-neutral">Reading these figures</div>
            <p className="text-muted spend-sub">
              A <strong>budget estimate</strong> is what the government asked Parliament
              for. A <strong>revised estimate</strong> is what it later expected to
              actually spend. The gap between them, for a year that has already run, is
              the closest thing here to an outcome.
            </p>
            <p className="text-muted spend-sub">
              2025–26 figures are allocations. Nothing on this page reports what has been
              spent in 2025–26, because that document has not been published.
            </p>
          </div>
        </section>

        {error ? (
          <section className="section-block">
            <h3 className="section-title">The union budget could not be loaded</h3>
            <p className="text-muted section-note">{error}</p>
          </section>
        ) : loading ? (
          <section className="section-block">
            <p className="text-muted section-note">Loading records…</p>
          </section>
        ) : !data ? null : (
          <>
            <section className="section-block">
              <h3 className="section-title">Budget at a glance · {fy}</h3>
              <p className="text-muted section-note">
                Top-line figures as budgeted for {fy}.
              </p>
              <div className="grid-cells headline-grid">
                {data.headlines.map((h) => (
                  <div key={h.label} className="headline-cell">
                    <div className="headline-label">{h.label}</div>
                    <div className="headline-amount tnum">{h.amount ?? '—'}</div>
                    {h.qualifier ? (
                      <div className="text-muted headline-qual">{h.qualifier}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            <section id="ministries" className="section-block">
              <h3 className="section-title">Expenditure by ministry</h3>
              <p className="text-muted section-note">
                The thirteen largest ministries, then the published residual for all
                others. Share is each ministry's {fy} allocation as a
                percentage of total expenditure — our arithmetic on the document's own
                figures.
              </p>
              <BudgetSeriesTable rows={data.ministries} showShare />
            </section>

            <section id="union-schemes" className="section-block">
              <h3 className="section-title">Major central schemes</h3>
              <p className="text-muted section-note">
                Scheme allocations sit inside a ministry's total, so they are not shown
                as a share and must not be added to the table above.
              </p>
              <BudgetSeriesTable rows={data.schemes} />
            </section>

            <section id="union-findings" className="split split-feed">
              <Feed
                items={data.findings}
                heading="Findings for the central government"
                emptyNote="No findings recorded for the union budget yet."
              />
              <div className="split-rail">
                <div className="kicker kicker-neutral">Where these come from</div>
                <p className="text-muted spend-sub">
                  Items marked <em>derived from published figures</em> are arithmetic we
                  did on the document's tables. The rest are observations the document
                  makes itself. Both link back to it.
                </p>
              </div>
            </section>
          </>
        )}
      </div>

      <PosterBanner sources={data?.sources ?? []} />
    </div>
  );
}
