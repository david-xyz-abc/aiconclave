import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './venueFixture.js';
import {onRequest as auth} from '../room-finder/functions/api/auth.js';
import {onRequest as search} from '../room-finder/functions/api/search.js';
import {token,cookie,authenticated} from '../room-finder/shared/session.js';
import {hashPassword} from '../functions/_shared/auth.js';
const env={FINDER_SESSION_SECRET:'test-only-session-secret',FINDER_PASSWORD_SALT:'test-only-salt'};
const ctx=(request,extra={})=>({request,env:{...env,...extra}});
const req=(path,options={})=>new Request('https://finder.test/api/'+path,options);
test('login accepts the configured credentials and rejects incorrect and cross-origin requests',async()=>{
 env.FINDER_PASSWORD_HASH=await hashPassword('test-password',env.FINDER_PASSWORD_SALT,100000);
 const attempt=(password,origin='https://finder.test')=>auth(ctx(req('auth',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({username:'hospitality',password})})));
 assert.equal((await attempt('wrong')).status,401);
 assert.equal((await attempt('test-password','https://elsewhere.test')).status,403);
 const success=await attempt('test-password');assert.equal(success.status,200);
 assert.match(success.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);
 const session=success.headers.get('set-cookie').split(';')[0];
 assert.equal(await authenticated(ctx(req('search',{headers:{cookie:session}}))),true);
 assert.equal(await authenticated(ctx(req('search',{headers:{cookie:session+'tampered'}}))),false);
 const logout=await auth(ctx(req('auth',{method:'DELETE',headers:{origin:'https://finder.test',cookie:session}})));
 assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
});
test('room search requires login, matches all supported fields, and reports allocated and unallocated teams',async()=>{
 const f=fixture();try{
 assert.equal((await search(ctx(req('search?q=Git'),{DB:f.DB}))).status,401);
 const session=cookie(await token(env.FINDER_SESSION_SECRET));
 const find=async q=>await (await search(ctx(req('search?q='+encodeURIComponent(q),{headers:{cookie:session}}),{DB:f.DB}))).json();
 for(const q of ['Git-R','AIC-1','Captain']){const data=await find(q);assert.equal(data.teams.length,1);assert.equal(data.teams[0].room,null);assert.equal(data.teams[0].attendance_marked,0);assert.equal('email' in data.teams[0],false);}
 f.sqlite.exec("INSERT INTO venue_allocations(team_id,table_id,assigned_by) SELECT 1,id,'test' FROM venue_tables LIMIT 1");
 assert.ok((await find('Git')).teams[0].room);
 assert.equal((await find("' OR 1=1 --")).teams.length,0);
 assert.equal((await find('%')).ok,false);
 assert.equal((await search(ctx(req('search?q=Git',{method:'POST',headers:{cookie:session}}),{DB:f.DB}))).status,405);
 }finally{f.sqlite.close();}
});
