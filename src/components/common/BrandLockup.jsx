export function BrandLockup({ home = false }) {
  return (
    <div className="brand-lockup">
      <span className="brand-mark" aria-hidden="true">
        {home ? <i className="fas fa-home" /> : "AC"}
      </span>
      <span>AI Conclave 2026</span>
    </div>
  );
}
