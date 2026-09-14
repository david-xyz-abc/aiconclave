import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/excel/auth.js';
import {onRequestGet} from '../functions/api/excel/registrations.js';
import {hashPassword} from '../functions/_shared/auth.js';
import {authenticated,COOKIE} from '../functions/_shared/excelSession.js';
const base='https://example.test';
const env={EXCEL_PASSWORD_SALT:'test-salt',EXCEL_SESSION_SECRET:'test-session-key'};
const ctx=(method,body,cookie='',origin=base)=>({env,request:new Request(base+'/api/excel/auth',{method,headers:{origin,'content-type':'application/json',cookie},...(body?{body:JSON.stringify(body)}:{})})});
test('Excel credentials create an isolated secure session; wrong passwords, origins and tampering fail',async()=>{
 env.EXCEL_PASSWORD_HASH=await hashPassword('test-password',env.EXCEL_PASSWORD_SALT,100000);
 assert.equal((await onRequest(ctx('POST',{username:'dataexcel',password:'wrong'}))).status,401);
 assert.equal((await onRequest(ctx('POST',{username:'dataexcel',password:'test-password'},'','https://other.test'))).status,403);
 const login=await onRequest(ctx('POST',{username:'dataexcel',password:'test-password'}));assert.equal(login.status,200);
 const set=login.headers.get('set-cookie');assert.match(set,/HttpOnly; Secure; SameSite=Strict/);
 const cookie=set.split(';')[0];assert.equal(await authenticated(ctx('GET',null,cookie)),true);
 assert.equal(await authenticated(ctx('GET',null,cookie+'bad')),false);
 assert.equal(await authenticated(ctx('GET',null,'__Host-aiconclave_dashboard_session=admin')),false);
 assert.equal(await authenticated(ctx('GET',null,COOKIE+'=1.expired.signature')),false);
 assert.match((await onRequest(ctx('DELETE',null,cookie))).headers.get('set-cookie'),/Max-Age=0/);
});
test('Excel export rejects anonymous and other portal cookies before querying data',async()=>{
 for(const cookie of ['', '__Host-aiconclave_dashboard_session=admin','__Host-room_finder=finder']){
  const context=ctx('GET',null,cookie);context.env={...env,DB:{prepare(){throw new Error('Must not query');}}};
  assert.equal((await onRequestGet(context)).status,401);
 }
});
