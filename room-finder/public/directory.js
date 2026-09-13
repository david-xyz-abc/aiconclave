const normalize=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function searchDirectory(teams,query) {
 const q=normalize(query);
 if(q.length<2)return [];
 return teams.filter(team=>[team.team_name,team.team_code,team.captain,team.leader].some(value=>normalize(value).includes(q)));
}
export const CACHE_KEY='room-finder-directory-v1';
export function readDirectory(storage) {
 try {const data=JSON.parse(storage.getItem(CACHE_KEY));
 if(!data||!Array.isArray(data.teams)||!Number.isFinite(Date.parse(data.syncedAt)))return null;
 if(!data.teams.every(t=>Number.isSafeInteger(t.id)&&t.id>0&&typeof t.team_name==='string'&&typeof t.team_code==='string'))return null;
 return data;
 }catch{return null;}
}
