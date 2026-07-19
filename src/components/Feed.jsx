import Tag from './Tag.jsx';

/* Audit findings and budget gaps, for a state or for the centre. Replaces
   the design's "Raised this week" feed: there is no weekly wire of sourced
   district records to fill it, and a feed that refreshes on nothing is a
   claim of freshness the data cannot support.

   The heading is passed in rather than derived, because the caller is the
   only one that knows whose findings these are — and a union finding
   labelled with a state's name would be a false attribution. */

function FeedItem({ item }) {
  return (
    <article className="feed-item">
      <div className="feed-meta">
        <Tag tone={item.tagTone}>{item.tag}</Tag>
        <span className="text-muted feed-date">
          {item.publisher}
          {/* Readers should be able to tell a finding quoted from the
              document apart from arithmetic we did on its figures. */}
          {item.derived ? ' · derived from published figures' : ''}
        </span>
      </div>
      <h4 className="feed-title">
        {item.href ? (
          <a href={item.href} target="_blank" rel="noopener noreferrer">
            {item.title}
          </a>
        ) : (
          item.title
        )}
      </h4>
      <p className="text-muted feed-body">{item.body}</p>
    </article>
  );
}

export default function Feed({ items = [], heading, lede, emptyNote }) {
  return (
    <div className="split-main">
      <h3 className="feed-heading">{heading}</h3>
      <p className="text-muted feed-body feed-lede">
        {lede ??
          'Audit observations and gaps between what was budgeted and what was spent. Every item links to the document it came from.'}
      </p>
      {items.length === 0 ? (
        <p className="text-muted feed-body">{emptyNote ?? 'No findings recorded yet.'}</p>
      ) : (
        <div className="feed">
          {items.map((item) => (
            <FeedItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
