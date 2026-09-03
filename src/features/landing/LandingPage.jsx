import { BrandLockup } from "../../components/common/BrandLockup.jsx";

export function LandingPage() {
  return (
    <main className="portal-shell">
      <div className="portal-grid" aria-hidden="true" />
      <header className="portal-topbar"><BrandLockup /></header>
      <section className="portal-hero">
        <p className="eyebrow">AI Conclave 2026</p>
        <h1>Operations</h1>
      </section>
      <section className="portal-choices" aria-label="Operations">
        <a className="portal-choice portal-choice-admin" href="/login">
          <span className="portal-choice-number">01</span>
          <strong>Admin <span aria-hidden="true">→</span></strong>
        </a>
        <a className="portal-choice portal-choice-attendance" href="/attendance">
          <span className="portal-choice-number">02</span>
          <strong>Attendance <span aria-hidden="true">→</span></strong>
        </a>
      </section>
    </main>
  );
}
