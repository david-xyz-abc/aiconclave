import { authenticated, json } from '../../_shared/excelSession.js';
import { AWARDS, validScores, scoreTotal } from '../../../judging/shared/evaluation.js';

export const RESULTS_SQL = `SELECT e.team_id,e.scores,e.nominations,
 COALESCE(json_extract(e.team_snapshot,'$.score_max'),5) score_max,
 COALESCE(json_extract(e.team_snapshot,'$.not_present'),0) not_present,
 COALESCE(json_extract(e.team_snapshot,'$.team_name'),t.team_name) team_name,
 COALESCE(json_extract(e.team_snapshot,'$.team_code'),t.team_code) team_code,
 COALESCE(json_extract(e.team_snapshot,'$.leader_name'),
 (SELECT full_name FROM hackathon_team_members WHERE team_id=t.id AND id=t.attendance_lead_member_id),
 (SELECT full_name FROM hackathon_team_members WHERE team_id=t.id AND role='Captain' ORDER BY member_order LIMIT 1),'') leader_name,
 COALESCE(json_extract(e.team_snapshot,'$.participant_category'),t.participant_category) participant_category,
 COALESCE(json_extract(e.team_snapshot,'$.sector_track'),t.sector_track) sector
 FROM judging_evaluations e JOIN hackathon_teams t ON t.id=e.team_id
 WHERE e.status='submitted'`;
export function rankedResults(rows) {
 return rows.map(row => {
  const originalScores=JSON.parse(row.scores);
  const maximum=row.score_max ?? 5;
  if(![5,10].includes(maximum) || !validScores(originalScores,true,maximum)) throw new Error('Invalid submitted scores');
  const scores=Object.fromEntries(Object.entries(originalScores).map(([k,v])=>[k,v*10/maximum]));
  return {...row,scores,score_max:10,total:scoreTotal(scores)};
 }).sort((a,b) => b.total-a.total || a.team_name.localeCompare(b.team_name) || a.team_code.localeCompare(b.team_code) || a.team_id-b.team_id);
}
export async function onRequestGet(context) {
 if(!await authenticated(context))return json({ok:false,error:'Excel login required.'},401);
 const params=new URL(context.request.url).searchParams;
 const kind=params.get('kind'),sector=params.get('sector'),award=params.get('award');
 if(!['award','sector','overall'].includes(kind) || (kind!=='overall' && !Object.hasOwn(AWARDS,sector)) || (kind==='award' && !AWARDS[sector].some(([id])=>id===award)))return json({ok:false,error:'Choose a valid results list.'},400);
 let sql=RESULTS_SQL;const values=[];
 if(kind!=='overall'){sql+=" AND COALESCE(json_extract(e.team_snapshot,'$.sector_track'),t.sector_track)=?";values.push(sector);}
 if(kind==='award'){sql+=' AND EXISTS(SELECT 1 FROM json_each(e.nominations) WHERE value=?)';values.push(award);}
 try {
  const {results}=await context.env.DB.prepare(sql).bind(...values).all();
  return json({ok:true,rows:rankedResults(results || [])});
 }catch{return json({ok:false,error:'Could not generate results. Check that submitted evaluations have all five valid scores.'},500);}
}
