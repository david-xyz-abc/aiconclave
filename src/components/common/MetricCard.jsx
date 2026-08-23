export function MetricCard({ label, value, detail, action }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
      {action}
    </article>
  );
}
