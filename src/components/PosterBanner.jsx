import formatDate from '../lib/formatDate.js';

/* The sources block. Every figure on the page traces to one of these, so
   this is load-bearing rather than a footer credit: without it a reader
   cannot check any number shown above. */

export default function PosterBanner({ sources = [], creditMap = false }) {
  return (
    <section className="poster">
      <div className="wrap">
        <div className="poster-line">PUBLIC MONEY. PUBLIC RECORD. NO LOGIN.</div>

        {sources.length === 0 ? (
          <p className="poster-meta">No sources loaded.</p>
        ) : (
          <>
            <p className="poster-meta">
              Every figure on this page comes from one of the documents below. Nothing is
              estimated or interpolated.
            </p>
            <ul className="source-list">
              {sources.map((s) => (
                <li key={s.slug} className="source-item">
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.title}
                  </a>
                  <span className="text-muted">
                    {' — '}
                    {s.publisher} ·{' '}
                    {s.dateIsInferred
                      ? `document undated; file generated ${formatDate(s.documentDate)}`
                      : formatDate(s.documentDate)}
                    {' · retrieved '}
                    {formatDate(s.retrievedOn)}
                  </span>
                  {s.note ? <div className="text-muted source-note">{s.note}</div> : null}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Map geometry is third-party and CC-BY-4.0, so it is credited here
            rather than left implicit — but only on pages that draw the map.
            A credit for an asset the page does not use is noise, and it
            makes the honest credits easier to skim past. */}
        {creditMap ? (
          <p className="poster-meta map-credit">
            India map geometry:{' '}
            <a
              href="https://github.com/VictorCazanave/svg-maps"
              target="_blank"
              rel="noopener noreferrer"
            >
              @svg-maps/india
            </a>{' '}
            by Victor Cazanave, CC-BY-4.0.
          </p>
        ) : null}
      </div>
    </section>
  );
}
