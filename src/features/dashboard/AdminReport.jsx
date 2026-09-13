import { useMemo, useState } from 'react';
import { formatDate } from '../../utils/registration.js';

export function AdminReport({ type, rows, loading, error, syncedAt }) {
 const [query, setQuery] = useState('');
 const [view, setView] = useState('teams');
 const checkedIn = type === 'checked-in';
 const byTeam = checkedIn && view === 'teams';
 const teams = useMemo(() => {
  const grouped = new Map();
  for (const row of rows) {
   const key = row.team_id || row.team_code || row.team_name;
   if (!grouped.has(key)) grouped.set(key, { ...row, groupKey: key, participants: [] });
   grouped.get(key).participants.push(row.full_name);
  }
  return [...grouped.values()];
 }, [rows]);
 const filtered = useMemo(() => (byTeam ? teams : rows).filter(row => [row.full_name, row.judge_name,
  row.team_name, row.team_code, row.room_name, row.sector_track, row.solution_type, ...(row.participants || [])]
  .filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase())), [rows,teams,byTeam,query]);
 const count = checkedIn ? rows.length : new Set(rows.map(row => row.judge_id)).size;
 return <section className="data-section">
  <div className="data-heading"><div><h2>{checkedIn ? (byTeam ? 'Checked-in teams' : 'Checked-in participants') : 'Judge assignments'}</h2>
   {syncedAt && <p>{checkedIn ? `${teams.length} teams · ${count} participants checked in` : `${count} judges · ${rows.filter(row => row.team_id).length} teams assigned`}</p>}
  </div>
   {checkedIn && <div className="checkin-view-options" role="group" aria-label="View checked in by">
    <button type="button" aria-pressed={byTeam} onClick={() => setView('teams')}>By team</button>
    <button type="button" aria-pressed={!byTeam} onClick={() => setView('participants')}>By participants</button>
   </div>}
  </div>
  <div className="filters"><label className="search-control"><span>Search {checkedIn ? (byTeam ? 'teams' : 'participants') : 'assignments'}</span>
   <input value={query} onChange={event => setQuery(event.target.value)} placeholder={checkedIn ? 'Name, team, code or room' : 'Judge, team, code or room'} />
  </label></div>
  {error && <p className="table-state table-error" role="alert">{error}</p>}
  {loading ? <p className="table-state" role="status">Refreshing…</p> : !syncedAt ? null : !filtered.length ?
   <p className="table-state">{query ? 'No matching entries.' : checkedIn ? 'No participants checked in yet.' : 'No judges added yet.'}</p> :
   byTeam ? <div className="table-scroll"><table><thead><tr>
    <th>Team</th><th>Checked in</th><th>Participants</th><th>Sector / Solution</th><th>Room / Table</th>
   </tr></thead><tbody>{filtered.map(row => <tr key={row.groupKey}>
    <td><strong className="cell-name">{row.team_name}</strong><span className="cell-secondary">{row.team_code}</span></td>
    <td>{row.participants.length}{row.team_size ? ` / ${row.team_size}` : ''}</td>
    <td>{row.participants.join(', ')}</td>
    <td>{row.sector_track || '—'}<span className="cell-secondary">{row.solution_type}</span></td>
    <td>{row.room_name || 'Not allocated'}<span className="cell-secondary">{row.table_number ? `Table ${row.table_number}` : ''}</span></td>
   </tr>)}</tbody></table></div> :
   <div className="table-scroll"><table><thead><tr>
    <th>{checkedIn ? 'Participant' : 'Judge'}</th><th>Team</th><th>Sector / Solution</th><th>Room / Table</th><th>{checkedIn ? 'Checked in' : 'Visit order'}</th>
   </tr></thead><tbody>{filtered.map(row => <tr key={checkedIn ? row.id : `${row.judge_id}-${row.team_id || 'none'}`}>
    <td><strong className="cell-name">{checkedIn ? row.full_name : row.judge_name}</strong>{checkedIn && <span className="cell-secondary">{row.role}</span>}</td>
    <td>{row.team_name || 'No teams assigned'}<span className="cell-secondary">{row.team_code}</span></td>
    <td>{row.sector_track || '—'}<span className="cell-secondary">{row.solution_type}</span></td>
    <td>{row.room_name || (checkedIn ? 'Not allocated' : '—')}<span className="cell-secondary">{row.table_number ? `Table ${row.table_number}` : ''}</span></td>
    <td>{checkedIn ? formatDate(row.marked_at) : row.visit_order || '—'}</td>
   </tr>)}</tbody></table></div>}
 </section>;
}
