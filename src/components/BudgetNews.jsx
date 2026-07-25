import formatDate from '../lib/formatDate.js';

/* Dated budget news for a state: a credited link to what an outlet reported,
   not a figure this site vouches for. Kept visually distinct from the Findings
   feed for exactly that reason — a finding is our own reading of a document, a
   news item points at someone else's reporting, and the two must not read as
   the same kind of claim. Every item names its outlet and date and links out.

   Two blocks, not one, because the feed carries two different claims. Budget
   coverage says what a state announced. A reported loss says an auditor, an
   investigating agency or the government itself put a figure on money paid out
   that should not have been — usually under a named scheme. Run together they
   would read as one register of fact; the amount in a loss item is an
   allegation someone made, and the heading has to say so before the reader
   reaches the number.

   Renders nothing when a state has no news, so a page for a state whose budget
   we have not found coverage for simply omits the block rather than showing an
   empty heading. The same is true of each block on its own. */

function Item({ item }) {
  return (
    <article className="news-item">
      <div className="news-meta">
        <span className="news-outlet">{item.outlet}</span>
        <span className="text-muted news-date">{formatDate(item.publishedOn)}</span>
      </div>
      <h4 className="news-title">
        <a href={item.href} target="_blank" rel="noopener noreferrer">
          {item.headline}
        </a>
      </h4>

      {/* Only for loss items, and only when the story carries them. A scheme
          the outlet did not name and a figure it did not give are both left
          out rather than guessed at. */}
      {(item.schemeName || item.reportedAmount) && (
        <div className="news-tags">
          {item.reportedAmount && (
            <span className="news-amount tnum">{item.reportedAmount}</span>
          )}
          {item.schemeName && <span className="news-scheme">{item.schemeName}</span>}
        </div>
      )}

      <p className="text-muted news-body">{item.summary}</p>
    </article>
  );
}

export default function BudgetNews({ items = [], stateName }) {
  const budget = items.filter((i) => i.category !== 'loss');
  const losses = items.filter((i) => i.category === 'loss');

  if (items.length === 0) return null;

  return (
    <>
      {budget.length > 0 && (
        <section id="news" className="section-block">
          <h3 className="section-title">In the news · {stateName}</h3>
          <p className="text-muted section-note">
            What outlets reported about this state’s budget. These are links to others’
            reporting, dated and credited — not figures taken from a government document.
          </p>

          <div className="news-list">
            {budget.map((item) => (
              <Item key={item.href} item={item} />
            ))}
          </div>
        </section>
      )}

      {losses.length > 0 && (
        <section id="losses" className="section-block">
          <h3 className="section-title">Money reported lost · {stateName}</h3>
          <p className="text-muted section-note">
            Scheme money an auditor, an investigating agency or the government itself has
            reported as wrongly paid, diverted or unaccounted for. Each amount is the
            figure the named outlet reported, with its own qualifiers kept — an
            allegation or an audit observation, not a loss this site has established, and
            not a court’s finding.
          </p>

          <div className="news-list">
            {losses.map((item) => (
              <Item key={item.href} item={item} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
