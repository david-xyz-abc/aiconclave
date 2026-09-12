import { BrandLockup } from '../common/BrandLockup.jsx';

export function OperationsHeader({ active, onLogout, children }) {
  return <header className="ops-header">
    <a className="ops-brand" href="/" aria-label="AI Conclave operations"><BrandLockup /></a>
    <nav aria-label="Operations navigation">
      <a href="/attendance" aria-current={active === 'attendance' ? 'page' : undefined}>Attendance</a>
      <a href="/attendance/venues" aria-current={active === 'venues' ? 'page' : undefined}>Staff venues</a>
      {children}
    </nav>
    <button className="ops-logout" onClick={onLogout}>Log out</button>
  </header>;
}
