import { BrandLockup } from "../../components/common/BrandLockup.jsx";

export function LandingPage() {
  return (
    <main className="ops-landing">
      <header><BrandLockup /></header>
      <section className="ops-landing-heading">
        <h1>Operations</h1>
        <p>Choose your workspace.</p>
      </section>
      <section className="ops-workspaces" aria-label="Operations">
        <a href="/login">
          <strong>Admin <span aria-hidden="true">→</span></strong>
          <p>Registrations, reports and event overview.</p>
        </a>
        <a href="/attendance">
          <strong>Attendance <span aria-hidden="true">→</span></strong>
          <p>Check in teams and assign their venues.</p>
        </a>
        <a href="/attendance/venues">
          <strong>Staff venues <span aria-hidden="true">→</span></strong>
          <p>Find teams, manage allocations and view rooms.</p>
        </a>
      </section>
    </main>
  );
}
