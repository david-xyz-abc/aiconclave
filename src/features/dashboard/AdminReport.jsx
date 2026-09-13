import { useMemo, useState } from 'react';
import { formatDate } from '../../utils/registration.js';

export function AdminReport({ type, rows, loading, error, syncedAt }) {
 const [query, setQuery] = useState('');
 const checkedIn = type === 'checked-in';
 const filtered = useMemo(() => rows.filter(row => [row.full_name, row.judge_name,
  row.team_name, row.team_code, row.room_name, row.sector_track, row.solution_type]
  .filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase())), [rows,query]);
 const count = checkedIn ? rows.length : new Set(rows.map(row => row.judge_id)).size;
 return <section className="data-section">
  <div className="data-heading"><div><h2>{checkedIn ? 'Checked-in participants' : 'Judge assignments'}</h2>
   {syncedAt && <p>{checkedIn ? `${count} participants checked in` : `${count} judges · ${rows.filter(row => row.team_id).length} teams assigned`}</p>}
  </div></div>
  <div className="filters"><label className="search-control"><span>Search {checkedIn ? 'participants' : 'assignments'}</span>
   <input value={query} onChange={event => setQuery(event.target.value)} placeholder={checkedIn ? 'Name, team, code or room' : 'Judge, team, code or room'} />
  </label></div>
  {error && <p className="table-state table-error" role="alert">{error}</p>}
  {loading ? <p className="table-state" role="status">Refreshing…</p> : !syncedAt ? null : !filtered.length ?
   <p className="table-state">{query ? 'No matching entries.' : checkedIn ? 'No participants checked in yet.' : 'No judges added yet.'}</p> :
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
