import { useRef, useState } from 'react';
import { OperationsHeader } from '../../components/layout/OperationsHeader.jsx';
import { authApi, registrationsApi, isUnauthorized } from '../../services/dashboardApi.js';
import { downloadRegistrationsWorkbook, downloadHackathonDivisionsWorkbook } from '../../services/registrationExport.js';
import './excel.css';

export function ExcelPage({onLogout}) {
  const cache = useRef(null);
  const pending = useRef(false);
  const lastFetch = useRef(0);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  async function run(kind) {
    if (pending.current) return;
    if (kind === 'refresh' && Date.now() - lastFetch.current < 5000) {
      setError('Please wait five seconds between refreshes.'); return;
    }
    pending.current = true; setBusy(kind); setError('');
    try {
      if (!cache.current || kind === 'refresh') {
        lastFetch.current = Date.now();
        const data = await registrationsApi.export('hackathon');
        cache.current = data.registrations; setLoaded(true);
      }
      if (kind === 'all') await downloadRegistrationsWorkbook('hackathon', cache.current);
      if (kind === 'divisions') await downloadHackathonDivisionsWorkbook(cache.current);
    } catch (e) { setError(e.message); if (isUnauthorized(e)) onLogout(); }
    finally { pending.current = false; setBusy(''); }
  }
  async function logout() {
    try { await authApi.logout(); cache.current = null; onLogout(); }
    catch(e) { setError(e.message); }
  }
  return <div className="excel-shell">
    <OperationsHeader active="admin" onLogout={logout} />
    <main>
      <div className="excel-heading"><div><h1>Excel downloads</h1><p>Hackathon registrations</p></div>
        {loaded && <button className="button button-secondary" disabled={Boolean(busy)} onClick={() => run('refresh')}>{busy === 'refresh' ? 'Refreshing…' : 'Refresh data'}</button>}
      </div>
      <div className="excel-cards">
        <section><span className="excel-tag">ALL REGISTRATIONS</span><h2>Complete hackathon list</h2><p>Team overview and every registered member, in separate sheets.</p><button className="button button-primary" disabled={Boolean(busy)} onClick={() => run('all')}>{busy === 'all' ? 'Preparing…' : 'Download Excel'}</button></section>
        <section><span className="excel-tag">BY SOLUTION TYPE</span><h2>Technical & non-technical</h2><p>Two sheets, with each team’s members grouped together and their registration details included.</p><button className="button button-primary" disabled={Boolean(busy)} onClick={() => run('divisions')}>{busy === 'divisions' ? 'Preparing…' : 'Download Excel'}</button></section>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loaded && <p className="excel-note" role="status">Downloads use the same loaded data. Refresh data to include recent edits.</p>}
    </main>
  </div>;
}
