import { useEffect, useRef, useState } from 'react';
import { excelApi, isUnauthorized } from '../../services/dashboardApi.js';
import { downloadOfflineJudgingWorkbook } from '../../services/offlineJudgingExport.js';

export function OfflineDownloads({busy,run,onLogout}) {
  const [judges,setJudges] = useState([]);
  const [judgeId,setJudgeId] = useState('');
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [refresh,setRefresh] = useState(0);
  const logout = useRef(onLogout);
  logout.current = onLogout;
  useEffect(()=>{
    let active=true;
    setLoading(true); setError('');
    excelApi.judges().then(({judges:next})=>{
      if (!active) return;
      setJudges(next);
      setJudgeId(current=>next.some(judge=>judge.id===current)?current:'');
    }).catch(e=>{
      if (!active) return;
      setError(e.message);
      if (isUnauthorized(e)) logout.current();
    }).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[refresh]);
  const selected = judges.find(judge=>judge.id===judgeId);
  return <div className="excel-cards excel-offline">
    <section>
      <span className="excel-tag">PAPER JUDGING</span>
      <h2>Offline judging sheets</h2>
      <p>Select a judge to download their assigned teams in visit order. One Excel file includes the evaluation and award nomination sheets, with marks left blank.</p>
      <div className="excel-offline-controls">
        <label>Judge<select value={judgeId} disabled={loading || Boolean(busy) || Boolean(error)} onChange={event=>setJudgeId(event.target.value)}>
          <option value="">{loading?'Loading judges…':'Select a judge'}</option>
          {judges.map(judge=><option key={judge.id} value={judge.id}>{judge.name} — {judge.team_count} {judge.team_count===1?'team':'teams'}</option>)}
        </select></label>
        <button type="button" className="button button-secondary" disabled={loading || Boolean(busy)} onClick={()=>setRefresh(value=>value+1)}>Refresh judges</button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!loading && !error && !judges.length && <p role="status">No judges have been added yet. Add judges and assign teams in Judging first.</p>}
      {selected && !selected.team_count && <p role="status">This judge has no assigned teams yet.</p>}
      <p className="excel-offline-print">A4 landscape · 13 teams per page · Scores out of 10, total 50. Download and print before going offline.</p>
      <button className="button button-primary" disabled={loading || Boolean(error) || Boolean(busy) || !selected?.team_count}
        onClick={()=>run('offline',async()=>downloadOfflineJudgingWorkbook(await excelApi.offline(judgeId)))}>
        {busy==='offline'?'Preparing…':'Download Excel'}
      </button>
    </section>
  </div>;
}
