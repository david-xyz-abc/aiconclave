import {RoomsTables} from './RoomsTables.jsx';
import { useEffect, useRef, useState } from 'react';
import { attendanceApi, venuesApi, isUnauthorized } from '../../services/dashboardApi.js';
import { OperationsHeader } from '../../components/layout/OperationsHeader.jsx';

function roomType(room) {
  return room.solution_type === 'Non-Technical' ? 'Non-Technical · Both project modes' : room.project_mode === 'Prepared' ? 'Technical · Exhibition (prepared)' : 'Technical · Starting from scratch';
}

function seatSummary(tables) {
  return [2,3,4].map(seats => ({ seats, count: tables.filter(t => t.seats === seats).length })).filter(t => t.count).map(t => `${t.count} × ${t.seats}-seat`).join(' · ');
}

const menus = [['allocate', 'Manual Allocation'], ['rooms', 'Rooms & Tables']];
function status(team) {
  if (!team.attendance_marked) return 'Not checked in — direct the team to the check-in desk.';
  if (team.table_id) return `${team.block ? team.block + ' block · ' : ''}${team.room_name} · Table ${`T${team.table_number}`}`;
  if (!team.project_mode) return 'Project mode missing — edit check-in to record it.';
  if (team.present_count < 2 || !team.lead_present) return 'Check-in needs correction — at least two members and the team lead must be present.';
  return 'Awaiting allocation';
}
function compatible(team, table) {
  return !table.team_id && (!table.project_mode || team.project_mode === table.project_mode) && (!table.sector || team.sector_track === table.sector) && team.solution_type === table.solution_type && team.registered_size <= table.seats;
}

export function VenueDashboard({ user, onLogout }) {
  const [menu, setMenu] = useState('rooms');
  const [data, setData] = useState({ teams: [], tables: [] });
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [tableId, setTableId] = useState('');
  const [block, setBlock] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updated, setUpdated] = useState('');
  const reload = useRef(null);
  useEffect(() => {
    if(menu === 'rooms')return;
    setLoading(true);
    let active = true, pending = false;
    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        const result = await venuesApi.load();
        if (active) { setData(result); setUpdated(new Date().toLocaleTimeString()); setError(''); }
      } catch (e) {
        if (active) { setError(e.message); if (isUnauthorized(e)) onLogout(); }
      } finally { pending = false; if (active) setLoading(false); }
    }
    reload.current = refresh;
    refresh();
    const timer = setInterval(refresh, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [onLogout,menu]);
  const canEdit = user?.attendanceAccess === 'write';
  const waiting = data.teams.filter(team => team.attendance_marked && !team.table_id);
  const selected = data.teams.find(team => team.team_id === selectedId);
  const matches = data.teams.filter(team => menu !== 'allocate' || team.attendance_marked)
    .filter(team => `${team.team_name} ${team.team_code}`.toLowerCase().includes(query.trim().toLowerCase()));
  const free = selected ? data.tables.filter(table => compatible(selected, table)).sort((a,b) => a.seats-b.seats || a.id-b.id || a.table_number-b.table_number) : [];
  const rooms = [...new Map(data.tables.map(table => [table.id, table])).values()].filter(room => !block || room.block === block);
  const currentRoom = rooms.find(room => String(room.id) === roomId);
  async function assign() {
    if (!selected || !tableId || saving) return;
    setSaving(true); setMessage(''); setError('');
    try {
      if (selected.table_id) await venuesApi.reallocate(selected.team_id, Number(tableId), selected.table_id);
      else await venuesApi.assign(selected.team_id, Number(tableId));
      setMessage(selected.table_id ? `${selected.team_name} reallocated successfully. The previous table is now free.` : `Table assigned to ${selected.team_name}.`); setTableId('');
      await reload.current();
    } catch (e) { await reload.current(); setError(e.message); }
    finally { setSaving(false); }
  }
  function changeMenu(value) { setMenu(value); setQuery(''); setSelectedId(null); setTableId(''); setMessage(''); }
  const selectedTables = currentRoom ? data.tables.filter(t => t.id === currentRoom.id) : [];
  const showTeams = menu === 'allocate' || query.trim();
  const shortStatus = team => team.table_id ? `${team.room_name} · Table ${`T${team.table_number}`}` : !team.attendance_marked ? 'Not checked in' : !team.project_mode ? 'Project mode needed' : 'Awaiting allocation';
  if(menu === 'rooms')return <RoomsTables onLogout={onLogout} onManual={()=>changeMenu('allocate')}/>;
  return <div className="attendance-app">
    <OperationsHeader active="venues" onLogout={async () => { await attendanceApi.logout().catch(() => {}); onLogout(); }} />
    <main className="venue-main">
      <div className="venue-heading">
        <div><h1>Room allocation</h1><p>Team locations and table availability</p></div>
        <button className="ops-secondary" title={updated ? `Last updated ${updated}. Refreshes automatically.` : 'Refresh availability'} onClick={() => reload.current?.()}>Refresh</button>
      </div>
      <nav className="venue-menus" aria-label="Staff venue menus">
        {menus.map(([id,label]) => <button key={id} aria-current={menu === id ? 'page' : undefined} onClick={() => changeMenu(id)}>{label}{id === 'allocate' && waiting.length > 0 && <span aria-label={`${waiting.length} waiting`}>{waiting.length}</span>}</button>)}
      </nav>
      <div className="venue-summary" aria-label="Allocation totals">
        <span><strong>{new Set(data.tables.map(t => t.id)).size}</strong> venues</span>
        <span><strong>{data.tables.length}</strong> total tables</span>
        <span><strong>{data.teams.filter(t => t.table_id).length}</strong> allocated</span>
        <span><strong>{waiting.length}</strong> waiting</span>
        <span><strong>{data.tables.filter(t => !t.team_id).length}</strong> free tables</span>
      </div>
      {error && <p className="ops-notice error" role="alert">{error}</p>}
      {message && <p className="ops-notice success" role="status">{message}</p>}
      {loading ? <div className="venue-empty" role="status">Loading venues…</div> : <>
        <div className="venue-toolbar">
          <label className="venue-field venue-search-field">Search team name or code<input value={query} onChange={e => { setQuery(e.target.value); setSelectedId(null); setTableId(''); }} placeholder="Team name or code" /></label>
        </div>
        {showTeams ? <div className={`venue-workspace ${selected ? 'detail-open' : ''}`}>
          <section className="venue-team-list" aria-label={menu === 'allocate' ? 'Checked-in teams' : 'Search results'}>
            <div className="venue-list-heading">{matches.length} {matches.length === 1 ? 'team' : 'teams'}</div>
            {matches.length ? matches.map(team => <button key={team.team_id} className="venue-list-row" onClick={() => { setSelectedId(team.team_id); setTableId(''); setMessage(''); }} aria-pressed={selectedId === team.team_id}>
              <span className="venue-row-main"><strong>{team.team_name}</strong><small>{team.team_code}</small><span className={`venue-row-status ${team.table_id ? 'assigned' : ''}`}>{shortStatus(team)}</span></span><span aria-hidden="true" className="venue-row-arrow">›</span>
            </button>) : <p className="venue-list-empty">{menu === 'allocate' && !query ? 'No teams have checked in yet.' : 'No matching teams.'}</p>}
          </section>
          <section className="venue-detail" aria-label="Team allocation">
            {selected ? <>
              <button className="venue-back" onClick={() => setSelectedId(null)}>← Back to teams</button>
              <p className="venue-team-code">{selected.team_code}</p><h2>{selected.team_name}</h2>
              <p className="venue-detail-meta">{selected.sector_track} · {selected.solution_type} · {selected.present_count} present<br />{selected.project_mode || 'Project mode not recorded'}</p>
              <div className={`venue-result ${selected.table_id ? 'is-assigned' : ''}`} role="status">
                {selected.table_id ? <><span>Assigned venue</span><strong>{selected.room_name} <span>·</span> Table {`T${selected.table_number}`}</strong>{selected.block && <small>{selected.block} block</small>}</> : status(selected)}
              </div>
              {!selected.attendance_marked || !selected.project_mode || selected.present_count < 2 || !selected.lead_present ? <a className="ops-primary" href="/attendance">Open check-in desk</a> : canEdit ? <div className="venue-assignment-form">
                <label className="venue-field">Compatible free room and table<select value={tableId} disabled={saving} onChange={e => setTableId(e.target.value)}><option value="">Choose a table</option>{free.map(t => <option key={t.table_id} value={t.table_id}>{t.name} · Table {`T${t.table_number}`} · {t.seats} seats</option>)}</select></label>
                {!free.length && <p className="venue-help">{selected.table_id ? 'No matching tables available. The current assignment is retained.' : 'No matching tables available. The team remains on the waiting list.'}</p>}
                <button className="ops-primary" disabled={saving || !free.some(t => String(t.table_id) === tableId)} onClick={assign}>{saving ? 'Saving…' : selected.table_id ? 'Reallocate room and table' : 'Assign room and table'}</button>
              </div> : <p className="venue-help">A check-in editor can change this assignment.</p>}
            </> : <div className="venue-empty"><h2>Select a team</h2><p>View its venue and allocation options.</p></div>}
          </section>
        </div> : <div className="venue-search-empty"><p>Find a team’s room and table.</p><small>Search by team name or registration code.</small></div>}
      </>}
    </main>
  </div>;
}
