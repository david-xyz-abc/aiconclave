import { CHECKED_IN_SQL } from '../admin/reports.js';
import { authenticated, json } from '../../_shared/excelSession.js';
import { getRegistrationTables, loadHackathonRegistrations, loadPanelRegistrations } from '../../_shared/registrations.js';
export async function onRequestGet(context) {
  if (!await authenticated(context)) return json({ok:false,error:'Excel login required.'},401);
  const type = new URL(context.request.url).searchParams.get('type') || 'hackathon';
  if (!['hackathon','panel','checked-in'].includes(type)) return json({ok:false,error:'Invalid registration type.'},400);
  try {
    if (type === 'checked-in') {
      const {results} = await context.env.DB.prepare(CHECKED_IN_SQL).all();
      return json({ok:true,registrations:results || []});
    }
    const tables = await getRegistrationTables(context.env.DB);
    const registrations = await (type === 'panel' ? loadPanelRegistrations : loadHackathonRegistrations)(context.env.DB,tables);
    return json({ok:true,registrations});
  } catch { return json({ok:false,error:'Could not load registrations.'},500); }
}
