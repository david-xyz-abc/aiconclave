import {useEffect,useRef,useState} from 'react';
import {OperationsHeader} from '../../components/layout/OperationsHeader.jsx';
import {attendanceApi,venuesApi,isUnauthorized} from '../../services/dashboardApi.js';
const KEY='alpha-room-overview-v5';
function cached(){try{const d=JSON.parse(localStorage.getItem(KEY));return Array.isArray(d?.rooms)&&typeof d.syncedAt==='string'?d:null;}catch{return null;}}
function kind(room){return room.solution_type==='Non-Technical'?'Non-Technical · Both project modes':room.project_mode==='Prepared'?'Technical · Exhibition (prepared)':'Technical · Starting from scratch';}
function seats(room){return [2,3,4].filter(n=>room['seats_'+n]).map(n=>`${room['seats_'+n]} × ${n}-seat`).join(' · ');}
export function RoomsTables({onLogout,onManual}){
 const [overview,setOverview]=useState(cached);
 const [room,setRoom]=useState(null),[tables,setTables]=useState([]),[block,setBlock]=useState('');
 const [refreshing,setRefreshing]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[checkedAt,setCheckedAt]=useState('');
 const mounted=useRef(true),generation=useRef(0),pendingRefresh=useRef(false),pendingRoom=useRef(null);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;};},[]);
 function leave(){try{localStorage.removeItem(KEY);}catch{}onLogout();}
 function failed(e){setError(e.message);if(isUnauthorized(e))leave();}
 async function refresh(){
  if(pendingRefresh.current)return;pendingRefresh.current=true;setRefreshing(true);setError('');
  try{const d=await venuesApi.rooms();if(!mounted.current)return;
   const snapshot={rooms:d.rooms,syncedAt:d.syncedAt};setOverview(snapshot);try{localStorage.setItem(KEY,JSON.stringify(snapshot));}catch{}
  }catch(e){if(mounted.current)failed(e);}finally{pendingRefresh.current=false;if(mounted.current)setRefreshing(false);}
 }
 async function select(next){
  if(pendingRoom.current===next.id)return;
  const current=++generation.current;pendingRoom.current=next.id;setRoom(next);setTables([]);setCheckedAt('');setLoading(true);setError('');
  try{const d=await venuesApi.room(next.id);if(!mounted.current||generation.current!==current)return;setTables(d.tables);setCheckedAt(d.updatedAt);}
  catch(e){if(mounted.current&&generation.current===current)failed(e);}
  finally{if(pendingRoom.current===next.id)pendingRoom.current=null;if(mounted.current&&generation.current===current)setLoading(false);}
 }
 function back(){generation.current++;pendingRoom.current=null;setRoom(null);setTables([]);setLoading(false);setError('');}
 const all=overview?.rooms||[],rooms=all.filter(r=>!block||r.block===block);
 const total=all.reduce((n,r)=>n+r.table_count,0),occupied=all.reduce((n,r)=>n+r.occupied_count,0);
 return <div className="attendance-app">
  <OperationsHeader active="venues" onLogout={async()=>{await attendanceApi.logout().catch(()=>{});leave();}}/>
  <main className="venue-main">
   <div className="venue-heading"><div><h1>Room allocation</h1>{overview&&<p>Overview synced {new Date(overview.syncedAt).toLocaleString()}</p>}</div><button className="ops-secondary" onClick={refresh} disabled={refreshing}>{refreshing?'Refreshing…':'Refresh'}</button></div>
   <nav className="venue-menus" aria-label="Staff venue menus"><button onClick={onManual}>Manual Allocation</button><button aria-current="page">Rooms &amp; Tables</button></nav>
   {overview&&<div className="venue-summary" aria-label="Room overview"><span><strong>{all.length}</strong> venues</span><span><strong>{total}</strong> tables</span><span><strong>{occupied}</strong> allocated</span><span><strong>{total-occupied}</strong> free</span></div>}
   {error&&<p className="ops-notice error" role="alert">{error}</p>}
   {!overview?<div className="venue-empty">Refresh to load rooms.</div>:<>
    <div className="venue-toolbar">{all.some(r=>r.block)&&<label className="venue-field">Block<select value={block} onChange={e=>{setBlock(e.target.value);back();}}><option value="">All blocks</option>{[...new Set(all.map(r=>r.block))].filter(Boolean).map(b=><option key={b}>{b}</option>)}</select></label>}<span>{rooms.length} rooms</span></div>
    <div className={`venue-workspace ${room?'detail-open':''}`}>
     <section className="venue-room-list" aria-label="Rooms">{rooms.map(r=><button className="venue-list-row" key={r.id} aria-pressed={room?.id===r.id} onClick={()=>select(r)}><span className="venue-row-main"><strong>{r.name}</strong><small>{kind(r)}</small><small>{seats(r)}</small></span><span className="venue-row-end"><b>{r.table_count-r.occupied_count} free</b><small>{r.table_count} tables</small></span></button>)}</section>
     <section className="venue-detail" aria-label="Room tables">{room?<>
      <button className="venue-back" onClick={back}>← All rooms</button>
      <div className="venue-detail-heading"><h2>{room.name}</h2><button className="ops-secondary" disabled={loading} onClick={()=>select(room)}>Refresh room</button></div>
      <p className="venue-detail-meta">{kind(room)}{checkedAt&&<> · Checked {new Date(checkedAt).toLocaleTimeString()}</>}</p>
      {loading?<p role="status">Loading tables…</p>:checkedAt?<table className="venue-tables"><caption className="sr-only">Tables in {room.name}</caption><thead><tr><th scope="col">Table</th><th scope="col">Max seats</th><th scope="col">Team</th><th scope="col">Status</th></tr></thead><tbody>{tables.map(t=><tr key={t.table_id}><th scope="row">T{t.table_number}</th><td>{t.seats}</td><td>{t.team_id?<><strong>{t.team_name}</strong><small>{t.team_code}</small></>:<span className="venue-muted">—</span>}</td><td><span className={`venue-tag ${t.team_id?'':'available'}`}>{t.team_id?'Occupied':'Free'}</span></td></tr>)}</tbody></table>:null}
     </>:<div className="venue-empty"><h2>Select a room</h2></div>}</section>
    </div>
   </>}
  </main>
 </div>;
}
