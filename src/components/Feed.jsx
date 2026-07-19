import Tag from './Tag.jsx';

function FeedItem({ item }) {
  return (
    <article className="feed-item">
      <div className="feed-meta">
        <Tag tone={item.tagTone}>{item.tag}</Tag>
        <span className="text-muted feed-date">{item.date}</span>
      </div>
      <h4 className="feed-title">
        {item.href ? <a href={item.href}>{item.title}</a> : item.title}
      </h4>
      <p className="text-muted feed-body">{item.body}</p>
    </article>
  );
}

export default function Feed({ items = [] }) {
  return (
    <div className="split-main">
      <h3 className="feed-heading">Raised this week</h3>
      {items.length === 0 ? (
        <p className="text-muted feed-body">Nothing filed for this district yet.</p>
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
