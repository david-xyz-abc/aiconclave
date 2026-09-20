import { useEffect, useState } from 'react';
import { attendanceApi } from '../../services/dashboardApi.js';
const labels={excluded:'Existing check-in · not sent',pending:'Waiting to send',sending:'Sending',sent:'Sent',failed:'Delivery failed · no resend',uncertain:'Delivery unconfirmed · no resend'};
export function StockSyncStatus({teamId,version}) {
  const [rows,setRows]=useState([]),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
  useEffect(()=>{
    let cancelled=false,timer;
    setRows([]); setError('');
    async function load() {
      try {
        const data=await attendanceApi.stockSync(teamId);
        if(cancelled) return;
        setRows(data.deliveries);setError('');
        if(data.deliveries.some(row=>['pending','sending'].includes(row.status))) timer=setTimeout(load,5000);
      } catch(err) {if(!cancelled) setError(err.message);}
    }
    load();return()=>{cancelled=true;clearTimeout(timer);};
  },[teamId,version,refresh]);
  return <details className="venue-attendance-panel">
    <summary>Event participant API status{rows.some(row=>['failed','uncertain'].includes(row.status))?' · Needs attention':''}</summary>
    {error && <p role="alert">{error}</p>}
    {rows.length>0?<ul>{rows.map(row=><li key={row.member_id}>{row.name}: {labels[row.status]}</li>)}</ul>:<p>No deliveries recorded for this team.</p>}
    <button type="button" className="attendance-edit-button" onClick={()=>setRefresh(value=>value+1)}>Refresh status</button>
  </details>;
}
