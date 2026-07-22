import formatDate from '../lib/formatDate.js';

/* Dated budget news for a state: a credited link to what an outlet reported,
   not a figure this site vouches for. Kept visually distinct from the Findings
   feed for exactly that reason — a finding is our own reading of a document, a
   news item points at someone else's reporting, and the two must not read as
   the same kind of claim. Every item names its outlet and date and links out.

   Renders nothing when a state has no news, so a page for a state whose budget
   we have not found coverage for simply omits the block rather than showing an
   empty heading. */

export default function BudgetNews({ items = [], stateName }) {
  if (items.length === 0) return null;

  return (
    <section id="news" className="section-block">
      <h3 className="section-title">In the news · {stateName}</h3>
      <p className="text-muted section-note">
        What outlets reported about this state’s budget. These are links to others’
        reporting, dated and credited — not figures taken from a government document.
      </p>

      <div className="news-list">
        {items.map((item) => (
          <article key={item.href} className="news-item">
            <div className="news-meta">
              <span className="news-outlet">{item.outlet}</span>
              <span className="text-muted news-date">{formatDate(item.publishedOn)}</span>
            </div>
            <h4 className="news-title">
              <a href={item.href} target="_blank" rel="noopener noreferrer">
                {item.headline}
              </a>
            </h4>
            <p className="text-muted news-body">{item.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
