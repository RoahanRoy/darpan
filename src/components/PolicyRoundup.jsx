import formatDate from '../lib/formatDate.js';

/* The front page's answer to "why should I care yet?".

   Every other view here starts by asking the reader to pick a state. This one
   does not ask anything: it is what changed nationally in the last twelve
   months, and who each change lands on. A reader who arrives with no state in
   mind should still leave knowing that MGNREGA was repealed in July and what
   replaced it.

   Two lines per item, not one, and the second is the point. `summary` is what
   changed and is usually a press release restated. `impact` is who it falls
   on, which is the thing a reader came for and the thing that takes work to
   write. They are kept visually distinct so a roundup that quietly degenerates
   into a list of announcements looks like one.

   The covered span comes from the data, never from a claim typed alongside
   it — see /api/roundup. If nobody refreshes this for six months the heading
   says so, which is the intended behaviour and not a bug. */

export default function PolicyRoundup({ covers, items = [] }) {
  if (items.length === 0) return null;

  return (
    <section id="roundup" className="section-block">
      <h3 className="section-title">What changed across the country</h3>
      <p className="text-muted section-note">
        Policy and scheme changes and what they land on
        {covers ? (
          <>
            , from {formatDate(covers.from)} to {formatDate(covers.to)}
          </>
        ) : null}
        . Reviewed every quarter. Each item links to the government release or the
        outlet it was written from — these are pointers to other people’s reporting
        and announcements, not figures this site holds a document for.
      </p>

      <ol className="roundup-list">
        {items.map((item) => (
          <li key={item.href} className="roundup-item">
            <div className="roundup-meta">
              <span className="roundup-date tnum">{formatDate(item.happenedOn)}</span>
              <span className="roundup-region">{item.region}</span>
            </div>

            <h4 className="roundup-headline">
              <a href={item.href} target="_blank" rel="noopener noreferrer">
                {item.headline}
              </a>
            </h4>

            <p className="text-muted roundup-summary">{item.summary}</p>

            <p className="roundup-impact">
              <span className="roundup-impact-label">What it lands on</span>
              {item.impact}
            </p>

            <p className="roundup-credit text-muted">{item.outlet}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
