export const DIRECTORY_KEY='production-checkin-directory-v3';
export function readTeamDirectory(storage){try{const data=JSON.parse(storage.getItem(DIRECTORY_KEY));return data&&Array.isArray(data.teams)&&Number.isFinite(Date.parse(data.syncedAt))&&data.teams.every(t=>Number.isSafeInteger(t.id)&&typeof t.team_name==='string')?data:null;}catch{return null;}}
export function filterTeams(teams,query){const q=query.trim().toLowerCase();return teams.filter(t=>[t.team_name,t.team_code,t.lead_name,t.captain_name].some(v=>String(v||'').toLowerCase().includes(q)));}
export function clearTeamDirectory(){try{localStorage.removeItem(DIRECTORY_KEY);localStorage.removeItem('production-room-overview-v6');}catch{}}
