export function EmptyRegistrationSection({ section }) {
  return (
    <section className="setup-section">
      <span className="setup-number">{section.number}</span>
      <p className="eyebrow">Registration module</p>
      <h2>{section.label}</h2>
      <p>
        This dashboard section will be connected after the registration fields
        and event list are finalised.
      </p>
      <span className="setup-status">{section.status}</span>
    </section>
  );
}
