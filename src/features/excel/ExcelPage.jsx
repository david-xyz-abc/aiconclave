import { useRef, useState } from 'react';
import { OperationsHeader } from '../../components/layout/OperationsHeader.jsx';
import { excelApi, isUnauthorized } from '../../services/dashboardApi.js';
import { downloadRegistrationsWorkbook, downloadHackathonDivisionsWorkbook } from '../../services/registrationExport.js';
import './excel.css';

export function ExcelPage({onLogout}) {
  const pending = useRef(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  async function run(kind) {
    if (pending.current) return;
    pending.current = true; setBusy(kind); setError('');
    try {
      const {registrations} = await excelApi.export(kind === 'panel' ? 'panel' : 'hackathon');
      if (kind === 'panel') await downloadRegistrationsWorkbook('panel', registrations);
      if (kind === 'all') await downloadRegistrationsWorkbook('hackathon', registrations);
      if (kind === 'divisions') await downloadHackathonDivisionsWorkbook(registrations);
    } catch (e) { setError(e.message); if (isUnauthorized(e)) onLogout(); }
    finally { pending.current = false; setBusy(''); }
  }
  async function logout() {
    try { await excelApi.logout(); onLogout(); }
    catch(e) { setError(e.message); }
  }
  return <div className="excel-shell">
    <OperationsHeader active="admin" onLogout={logout} />
    <main>
      <div className="excel-heading"><div><h1>Excel downloads</h1><p>Registration downloads</p></div>
      </div>
      <div className="excel-cards">
        <section><span className="excel-tag">ALL REGISTRATIONS</span><h2>Complete hackathon list</h2><p>Team overview and every registered member, in separate sheets.</p><button className="button button-primary" disabled={Boolean(busy)} onClick={() => run('all')}>{busy === 'all' ? 'Preparing…' : 'Download Excel'}</button></section>
        <section><span className="excel-tag">BY SOLUTION TYPE</span><h2>Technical & non-technical</h2><p>Two sheets, with each team’s members grouped together and their registration details included.</p><button className="button button-primary" disabled={Boolean(busy)} onClick={() => run('divisions')}>{busy === 'divisions' ? 'Preparing…' : 'Download Excel'}</button></section>
        <section><span className="excel-tag">PANEL DISCUSSION</span><h2>Panel registrations</h2><p>All registered participants, contact details, organisations and panel selections.</p><button className="button button-primary" disabled={Boolean(busy)} onClick={() => run('panel')}>{busy === 'panel' ? 'Preparing…' : 'Download Excel'}</button></section>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </main>
  </div>;
}
