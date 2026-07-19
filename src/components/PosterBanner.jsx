function formatUpdated(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function PosterBanner({ lastUpdated }) {
  const updated = formatUpdated(lastUpdated);

  return (
    <section className="poster">
      <div className="wrap">
        <div className="poster-line">PUBLIC MONEY. PUBLIC RECORD. NO LOGIN.</div>
        <p className="poster-meta">
          Refreshed weekly by AI
          {updated ? ` · Last updated ${updated}` : ''} · Public data from data.gov.in, PRS
          Legislative Research, Sansad questions and local news.
        </p>
      </div>
    </section>
  );
}
