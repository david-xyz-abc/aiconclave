import {hashPassword,constantTimeEqual,isSameOrigin,readJsonBody} from '../../_shared/auth.js';
import {authenticated,json,token,cookie} from '../../_shared/excelSession.js';
export async function onRequest(context) {
 const {request,env}=context;
 if(request.method==='GET') return json({ok:await authenticated(context)});
 if(!['POST','DELETE'].includes(request.method)) return json({ok:false,error:'Method not allowed.'},405);
 if(!isSameOrigin(request)) return json({ok:false,error:'Invalid request origin.'},403);
 if(request.method==='DELETE') return json({ok:true},200,{'set-cookie':cookie('',0)});
 try {
  if(!env.EXCEL_PASSWORD_HASH || !env.EXCEL_PASSWORD_SALT || !env.EXCEL_SESSION_SECRET) return json({ok:false,error:'Sign-in is unavailable.'},503);
  const body=await readJsonBody(request);
  if(typeof body.password!=='string' || body.password.length>512) return json({ok:false,error:'Invalid username or password.'},401);
  const hash=await hashPassword(body.password,env.EXCEL_PASSWORD_SALT,100000);
  if(!(await constantTimeEqual(hash,env.EXCEL_PASSWORD_HASH)) || body.username?.trim()!=='dataexcel') return json({ok:false,error:'Invalid username or password.'},401);
  return json({ok:true},200,{'set-cookie':cookie(await token(env.EXCEL_SESSION_SECRET))});
 } catch {return json({ok:false,error:'Could not sign in. Please try again.'},400);}
}
