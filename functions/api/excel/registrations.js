import { authenticated, json } from '../../_shared/excelSession.js';
import { getRegistrationTables, loadHackathonRegistrations } from '../../_shared/registrations.js';
export async function onRequestGet(context) {
  if (!await authenticated(context)) return json({ok:false,error:'Excel login required.'},401);
  try {
    const tables = await getRegistrationTables(context.env.DB);
    const registrations = await loadHackathonRegistrations(context.env.DB,tables);
    return json({ok:true,registrations});
  } catch { return json({ok:false,error:'Could not load hackathon registrations.'},500); }
}
