export default function Bar({ pct, className = '' }) {
  return (
    <div
      className={`bar-track ${className}`.trim()}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
