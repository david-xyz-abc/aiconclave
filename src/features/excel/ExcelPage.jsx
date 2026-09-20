import { useRef, useState } from 'react';
import { OperationsHeader } from '../../components/layout/OperationsHeader.jsx';
import { excelApi, isUnauthorized } from '../../services/dashboardApi.js';
import { downloadRegistrationsWorkbook, downloadHackathonDivisionsWorkbook, downloadCheckedInParticipantsWorkbook, downloadCheckedInTeamsWorkbook } from '../../services/registrationExport.js';
import { AWARDS } from '../../../judging/shared/evaluation.js';
import { downloadJudgingResultsWorkbook } from '../../services/registrationExport.js';
import './excel.css';
import { OfflineDownloads } from './OfflineDownloads.jsx';

export function ExcelPage({onLogout}) {
  const pending = useRef(false);
  const [tab,setTab]=useState('registrations');
  const [sector,setSector]=useState('Agriculture');
  const [award,setAward]=useState(AWARDS.Agriculture[0][0]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  async function run(kind, action, category) {
    if (pending.current) return;
    pending.current = true; setBusy(category ? `${kind}-${category}` : kind); setError('');
    try {
      if (action) { await action(); return; }
      if (['award','sector','overall'].includes(kind)) {
        const {rows}=await excelApi.judging(kind,sector,award,category);
        await downloadJudgingResultsWorkbook(rows,{kind,sector,category,awardName:AWARDS[sector].find(([id])=>id===award)?.[1]});
        return;
      }
      const {registrations} = await excelApi.export(['checked-in','checked-in-teams'].includes(kind) ? 'checked-in' : kind === 'panel' ? 'panel' : 'hackathon');
      if (kind === 'checked-in-teams') await downloadCheckedInTeamsWorkbook(registrations);
      if (kind === 'checked-in') await downloadCheckedInParticipantsWorkbook(registrations);
      if (kind === 'panel') await downloadRegistrationsWorkbook('panel', registrations);
      if (kind === 'all') await downloadRegistrationsWorkbook('hackathon', registrations);
      if (kind === 'team-divisions') await downloadHackathonDivisionsWorkbook(registrations, 'teams');
      if (kind === 'divisions') await downloadHackathonDivisionsWorkbook(registrations);
    } catch (e) { setError(e.message); if (isUnauthorized(e)) onLogout(); }
    finally { pending.current = false; setBusy(''); }
  }
  async function logout() {
    try { await excelApi.logout(); onLogout(); }
    catch(e) { setError(e.message); }
  }
  function resultsButtons(kind) {
    return <div className="excel-download-options">{['College','School'].map(category => <button key={category} className={`button button-${category === 'College' ? 'primary' : 'secondary'}`} disabled={Boolean(busy)} onClick={() => run(kind, null, category)}>{busy === `${kind}-${category}` ? 'Preparing…' : `${category} Excel`}</button>)}</div>;
  }
  return <div className="excel-shell">
    <OperationsHeader active="admin" onLogout={logout} />
    <main>
      <div className="excel-heading"><div><h1>Excel downloads</h1></div>
      </div>
      <nav className="excel-tabs" aria-label="Download categories">
        <button aria-current={tab === 'registrations' ? 'page' : undefined} onClick={() => {setTab('registrations');setError('');}}>Registrations</button>
        <button aria-current={tab === 'judging' ? 'page' : undefined} onClick={() => {setTab('judging');setError('');}}>Judging results</button>
        <button aria-current={tab === 'offline' ? 'page' : undefined} onClick={() => {setTab('offline');setError('');}}>Offline</button>
      </nav>
      {tab === 'registrations' ? <div className="excel-cards">
        <section><span className="excel-tag">ALL REGISTRATIONS</span><h2>Complete hackathon list</h2><p>Team overview and every registered member, in separate sheets.</p><button className="button button-primary" disabled={Boolean(busy)} onClick={() => run('all')}>{busy === 'all' ? 'Preparing…' : 'Download Excel'}</button></section>
        <section><span className="excel-tag">BY SOLUTION TYPE</span><h2>Technical & non-technical</h2><p>Separate Technical and Non-Technical sheets. Choose one row per student or one row per team.</p><div className="excel-download-options"><button className="button button-primary" disabled={Boolean(busy)} onClick={() => run('divisions')}>{busy === 'divisions' ? 'Preparing…' : 'Student-wise Excel'}</button><button className="button button-secondary" disabled={Boolean(busy)} onClick={() => run('team-divisions')}>{busy === 'team-divisions' ? 'Preparing…' : 'Team-wise Excel'}</button></div></section>
        <section><span className="excel-tag">PANEL DISCUSSION</span><h2>Panel registrations</h2><p>All registered participants, contact details, organisations and panel selections.</p><button className="button button-primary" disabled={Boolean(busy)} onClick={() => run('panel')}>{busy === 'panel' ? 'Preparing…' : 'Download Excel'}</button></section>
        <section><span className="excel-tag">CHECK IN</span><h2>Checked-in participants</h2><p>Currently present hackathon participants, with their team, sector, room and table.</p><div className="excel-download-options"><button className="button button-primary" disabled={Boolean(busy)} onClick={() => run('checked-in')}>{busy === 'checked-in' ? 'Preparing…' : 'Student-wise Excel'}</button><button className="button button-secondary" disabled={Boolean(busy)} onClick={() => run('checked-in-teams')}>{busy === 'checked-in-teams' ? 'Preparing…' : 'Team-wise Excel'}</button></div></section>
      </div> : tab === 'offline' ? <OfflineDownloads busy={busy} run={run} onLogout={onLogout} /> : <>
        <div className="excel-results-controls"><label>Sector<select value={sector} disabled={Boolean(busy)} onChange={event => {setSector(event.target.value);setAward(AWARDS[event.target.value][0][0]);setError('');}}>{['Agriculture','Education','Healthcare'].map(value => <option key={value}>{value}</option>)}</select></label><p>Final submitted evaluations only.</p></div>
        <div className="excel-cards">
          <section><h2>Award rankings</h2><p>Teams nominated for the selected award, highest total first. Download college or school entries separately.</p><label className="excel-award">Award<select value={award} disabled={Boolean(busy)} onChange={event => {setAward(event.target.value);setError('');}}>{AWARDS[sector].map(([id,name]) => <option value={id} key={id}>{name}</option>)}</select></label>{resultsButtons('award')}</section>
          <section><h2>{sector} rankings</h2><p>Evaluated teams in this sector, highest total first, including None of the above nominations. Separate college and school lists.</p>{resultsButtons('sector')}</section>
          <section><h2>Overall score breakdown</h2><p>All sectors together, separated into college and school entries. Team name, team lead, five individual marks and the total, highest total first.</p>{resultsButtons('overall')}</section>
        </div>
      </>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </main>
  </div>;
}
