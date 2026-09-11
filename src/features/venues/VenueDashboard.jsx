import { useEffect, useRef, useState } from 'react';
import { attendanceApi, venuesApi, isUnauthorized } from '../../services/dashboardApi.js';
import { BrandLockup } from '../../components/common/BrandLockup.jsx';

const menus = [['finder', 'Venue Finder'], ['allocate', 'Manual Allocation'], ['rooms', 'Rooms & Tables']];
function status(team) {
  if (!team.attendance_marked) return 'Attendance not marked — direct the team to the attendance desk.';
  if (team.table_id) return `${team.block} block · ${team.room_name} · Table ${String(team.table_number).padStart(2, '0')}`;
  if (!team.project_mode) return 'Project mode missing — edit attendance to record it.';
  if (team.present_count < 2 || !team.lead_present) return 'Attendance needs correction — at least two members and the team lead must be present.';
  return 'Awaiting allocation';
}
function compatible(team, table) {
  return !table.team_id && team.project_mode === table.project_mode && team.sector_track === table.sector && team.solution_type === table.solution_type && team.present_count === table.seats;
}

export function VenueDashboard({ user, onLogout }) {
  const [menu, setMenu] = useState('finder');
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
  }, [onLogout]);
  const canEdit = user?.attendanceAccess === 'write';
  const waiting = data.teams.filter(team => team.attendance_marked && !team.table_id);
  const selected = data.teams.find(team => team.team_id === selectedId);
  const matches = (menu === 'allocate' ? waiting : data.teams).filter(team => `${team.team_name} ${team.team_code}`.toLowerCase().includes(query.trim().toLowerCase()));
  const free = selected ? data.tables.filter(table => compatible(selected, table)) : [];
  const rooms = [...new Map(data.tables.map(table => [table.id, table])).values()].filter(room => !block || room.block === block);
  const currentRoom = rooms.find(room => String(room.id) === roomId);
  async function assign() {
    if (!selected || !tableId || saving) return;
    setSaving(true); setMessage(''); setError('');
    try {
      await venuesApi.assign(selected.team_id, Number(tableId));
      setMessage(`Table assigned to ${selected.team_name}.`); setTableId('');
      await reload.current();
    } catch (e) { await reload.current(); setError(e.message); }
    finally { setSaving(false); }
  }
  function changeMenu(value) { setMenu(value); setQuery(''); setSelectedId(null); setTableId(''); setMessage(''); }
  return <div className="attendance-app">
    <header className="attendance-topbar"><BrandLockup /><div className="attendance-topbar-actions">
      <a className="button button-quiet" href="/attendance">Attendance</a>
      <a className="button button-quiet" href="/">Operations</a>
      <button className="button button-quiet" onClick={async () => { await attendanceApi.logout().catch(() => {}); onLogout(); }}>Log out</button>
    </div></header>
    <main className="venue-main">
      <div className="venue-heading"><div><p className="eyebrow">Hackathon · Staff</p><h1>Room Allocation</h1><p>Find a team’s venue, resolve waiting teams, and check every table.</p></div>
        <button className="button button-quiet" onClick={() => reload.current?.()}>Refresh availability</button></div>
      <nav className="venue-menus" aria-label="Staff venue menus">{menus.map(([id,label]) => <button key={id} className={menu === id ? 'active' : ''} aria-current={menu === id ? 'page' : undefined} onClick={() => changeMenu(id)}>{label}{id === 'allocate' && <span>{waiting.length}</span>}</button>)}</nav>
      <div className="venue-summary"><span><strong>{data.teams.filter(t => t.table_id).length}</strong> teams allocated</span><span><strong>{waiting.length}</strong> awaiting allocation</span><span><strong>{data.tables.filter(t => !t.team_id).length}</strong> free tables</span><small>{updated ? `Updated ${updated} · refreshes every 10 seconds` : 'Loading availability…'}</small></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="attendance-success" role="status">{message}</p>}
      {loading ? <p role="status">Loading venues…</p> : menu === 'rooms' ? <>
        <label className="venue-field">Block<select value={block} onChange={e => { setBlock(e.target.value); setRoomId(''); }}><option value="">All blocks</option>{['RS','R','CC','D'].map(b => <option key={b}>{b}</option>)}</select></label>
        <div className="venue-workspace"><section className="venue-room-list" aria-label="Rooms">{rooms.map(room => {
          const tables = data.tables.filter(t => t.id === room.id), occupied = tables.filter(t => t.team_id).length;
          return <button key={room.id} className={`venue-room-card ${roomId === String(room.id) ? 'selected' : ''}`} onClick={() => setRoomId(String(room.id))} aria-pressed={roomId === String(room.id)}>
            <strong>{room.name}</strong><span>{room.project_mode}</span><span>{room.sector} · {room.solution_type}</span><span>{room.seats} seats per table</span><b>{occupied}/{tables.length} occupied · {tables.length-occupied} free</b>
          </button>;
        })}</section><section className="venue-detail" aria-label="Room tables">{currentRoom ? <><h2>{currentRoom.name}</h2><p>{currentRoom.project_mode} · {currentRoom.sector} · {currentRoom.solution_type} · {currentRoom.seats} seats per table</p><div className="venue-table-grid">{data.tables.filter(t => t.id === currentRoom.id).map(table => <article key={table.table_id} className={`venue-table ${table.team_id ? 'occupied' : 'free'}`}><strong>Table {String(table.table_number).padStart(2,'0')}</strong><span>{table.team_id ? 'Occupied' : 'Free'}</span>{table.team_id && <><b>{table.team_name}</b><small>{table.team_code}</small></>}</article>)}</div></> : <p>Select a room to view its tables and assigned teams.</p>}</section></div>
      </> : <>
        <label className="venue-field">Search team name or code<input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. Git-R-Done or AIC26-H-03FF1331" /></label>
        <div className="venue-workspace"><section className="venue-team-list" aria-label={menu === 'allocate' ? 'Waiting teams' : 'Search results'}>
          {menu === 'finder' && !query.trim() ? <p>Enter a team name or code to find its room and table.</p> : matches.length ? matches.map(team => <button key={team.team_id} className={`venue-room-card ${selectedId === team.team_id ? 'selected' : ''}`} onClick={() => { setSelectedId(team.team_id); setTableId(''); setMessage(''); }} aria-pressed={selectedId === team.team_id}><strong>{team.team_name}</strong><small>{team.team_code}</small><span>{status(team)}</span></button>) : <p>{menu === 'allocate' && !query ? 'No teams are waiting for allocation.' : 'No matching teams found.'}</p>}
        </section><section className="venue-detail" aria-label="Team allocation">{selected ? <>
          <p className="eyebrow">{selected.team_code}</p><h2>{selected.team_name}</h2><p>{selected.sector_track} · {selected.solution_type} · {selected.present_count} present</p><p>{selected.project_mode || 'Project mode not recorded'}</p><div className="venue-result" role="status">{status(selected)}</div>
          {!selected.attendance_marked || !selected.project_mode || selected.present_count < 2 || !selected.lead_present ? <a className="button button-quiet" href="/attendance">Open attendance desk</a> : !selected.table_id && (menu === 'finder' ? <button className="button" onClick={() => { setMenu('allocate'); setQuery(''); }}>Open Manual Allocation</button> : canEdit ? <>
            <label className="venue-field">Compatible free room and table<select value={tableId} disabled={saving} onChange={e => setTableId(e.target.value)}><option value="">Select a table…</option>{free.map(t => <option key={t.table_id} value={t.table_id}>{t.name} · Table {String(t.table_number).padStart(2,'0')} · {t.seats} seats</option>)}</select></label>
            {!free.length && <p>No compatible free tables. The team remains on the waiting list.</p>}
            <button className="button" disabled={saving || !free.some(t => String(t.table_id) === tableId)} onClick={assign}>{saving ? 'Assigning…' : 'Assign room and table'}</button>
          </> : <p>Your account can view allocations. An attendance editor can assign a table.</p>)}
        </> : <p>Select a team to view its allocation details.</p>}</section></div>
      </>}
    </main>
  </div>;
}
