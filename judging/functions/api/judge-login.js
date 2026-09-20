import { requireVenueAdmin, json } from "../_shared/auth.js";
import { isSameOrigin, readJsonBody } from "../../../functions/_shared/auth.js";
export async function onRequest(context) {
 const auth=await requireVenueAdmin(context); if(auth.response)return auth.response;
 if(context.request.method === "GET") {
  const row=await context.env.DB.prepare("SELECT enabled FROM judging_login_control WHERE id=1").first();
  return json({ok:true,enabled:row?.enabled===1});
 }
 if(context.request.method !== "POST")return json({ok:false,error:"Method not allowed."},405);
 if(!isSameOrigin(context.request))return json({ok:false,error:"Request origin could not be verified."},403);
 let body;try {body=await readJsonBody(context.request);}catch{return json({ok:false,error:"Invalid request."},400);}
 if(typeof body?.enabled !== "boolean")return json({ok:false,error:"Choose whether judge login is open."},400);
 await context.env.DB.prepare("UPDATE judging_login_control SET enabled=?,updated_at=CURRENT_TIMESTAMP,updated_by=? WHERE id=1").bind(body.enabled?1:0,auth.session.username).run();
 return json({ok:true,enabled:body.enabled});
}
