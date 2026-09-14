import { useRef, useState } from 'react';
import { OperationsHeader } from '../../components/layout/OperationsHeader.jsx';
import { excelApi, isUnauthorized } from '../../services/dashboardApi.js';
import { downloadRegistrationsWorkbook, downloadHackathonDivisionsWorkbook, downloadCheckedInParticipantsWorkbook } from '../../services/registrationExport.js';
import { AWARDS } from '../../../judging/shared/evaluation.js';
import { downloadJudgingResultsWorkbook } from '../../services/registrationExport.js';
import './excel.css';

export function ExcelPage({onLogout}) {
  const pending = useRef(false);
  const [tab,setTab]=useState('registrations');
  const [sector,setSector]=useState('Agriculture');
  const [award,setAward]=useState(AWARDS.Agriculture[0][0]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  async function run(kind) {
    if (pending.current) return;
    pending.current = true; setBusy(kind); setError('');
    try {
      if (['award','sector','overall'].includes(kind)) {
        const {rows}=await excelApi.judging(kind,sector,award);
        await downloadJudgingResultsWorkbook(rows,{kind,sector,awardName:AWARDS[sector].find(([id])=>id===award)?.[1]});
        return;
      }
      const {registrations} = await excelApi.export(kind === 'checked-in' ? 'checked-in' : kind === 'panel' ? 'panel' : 'hackathon');
      if (kind === 'checked-in') await downloadCheckedInParticipantsWorkbook(registrations);
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
      <div className="excel-heading"><div><h1>Excel downloads</h1></div>
      </div>
      <nav className="excel-tabs" aria-label="Download categories">
        <button aria-current={tab === 'registrations' ? 'page' : undefined} onClick={() => {setTab('registrations');setError('');}}>Registrations</button>
        <button aria-current={tab === 'judging' ? 'page' : undefined} onClick={() => {setTab('judging');setError('');}}>Judging results</button>
      </nav>
      {tab === 'registrations' ? <div className="excel-cards">
        <section><span className="excel-tag">ALL REGISTRATIONS</span><h2>Complete hackathon list</h2><p>Team overview and every registered member, in separate sheets.</p><button className="button button-primary" disabled={Boolean(busy)} onClick={() => run('all')}>{busy === 'all' ? 'Preparing…' : 'Download Excel'}</button></section>
        <section><span className="excel-tag">BY SOLUTION TYPE</span><h2>Technical & non-technical</h2><p>Two sheets, with each team’s members grouped together and their registration details included.</p><button className="button button-primary" disabled={Boolean(busy)} onClick={() => run('divisions')}>{busy === 'divisions' ? 'Preparing…' : 'Download Excel'}</button></section>
        <section><span className="excel-tag">PANEL DISCUSSION</span><h2>Panel registrations</h2><p>All registered participants, contact details, organisations and panel selections.</p><button className="button button-primary" disabled={Boolean(busy)} onClick={() => run('panel')}>{busy === 'panel' ? 'Preparing…' : 'Download Excel'}</button></section>
        <section><span className="excel-tag">CHECK IN</span><h2>Checked-in participants</h2><p>Currently present hackathon participants, with their team, sector, room and table.</p><button className="button button-primary" disabled={Boolean(busy)} onClick={() => run('checked-in')}>{busy === 'checked-in' ? 'Preparing…' : 'Download Excel'}</button></section>
      </div> : <>
        <div className="excel-results-controls"><label>Sector<select value={sector} disabled={Boolean(busy)} onChange={event => {setSector(event.target.value);setAward(AWARDS[event.target.value][0][0]);setError('');}}>{['Agriculture','Education','Healthcare'].map(value => <option key={value}>{value}</option>)}</select></label><p>Final submitted evaluations only.</p></div>
        <div className="excel-cards">
          <section><h2>Award rankings</h2><p>Teams nominated for the selected award, highest total first.</p><label className="excel-award">Award<select value={award} disabled={Boolean(busy)} onChange={event => {setAward(event.target.value);setError('');}}>{AWARDS[sector].map(([id,name]) => <option value={id} key={id}>{name}</option>)}</select></label><button className="button button-primary" disabled={Boolean(busy)} onClick={() => run('award')}>{busy === 'award' ? 'Preparing…' : 'Download Excel'}</button></section>
          <section><h2>{sector} rankings</h2><p>All evaluated teams in this sector, highest total first, including None of the above nominations.</p><button className="button button-primary" disabled={Boolean(busy)} onClick={() => run('sector')}>{busy === 'sector' ? 'Preparing…' : 'Download Excel'}</button></section>
          <section><h2>Overall score breakdown</h2><p>All sectors together. Team name, team lead, five individual marks and the total, highest total first.</p><button className="button button-primary" disabled={Boolean(busy)} onClick={() => run('overall')}>{busy === 'overall' ? 'Preparing…' : 'Download Excel'}</button></section>
        </div>
      </>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </main>
  </div>;
}
