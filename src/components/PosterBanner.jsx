import formatDate from '../lib/formatDate.js';

/* The sources block. Every figure on the page traces to one of these, so
   this is load-bearing rather than a footer credit: without it a reader
   cannot check any number shown above. */

export default function PosterBanner({ sources = [] }) {
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
      </div>
    </section>
  );
}
