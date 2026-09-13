import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './venueFixture.js';
import {onRequest as auth} from '../room-finder/functions/api/auth.js';
import {onRequest as search} from '../room-finder/functions/api/search.js';
import {onRequest as directory} from '../room-finder/functions/api/directory.js';
import {searchDirectory,readDirectory,CACHE_KEY} from '../room-finder/public/directory.js';
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
test('directory is authenticated and compact; selected-team lookup uses one query and reflects reallocation',async()=>{
 const f=fixture();let queries=0;
 const DB={prepare(sql){queries++;return f.DB.prepare(sql);}};
 try{
 assert.equal((await directory(ctx(req('directory'),{DB}))).status,401);
 assert.equal((await search(ctx(req('search?id=1'),{DB}))).status,401);
 assert.equal(queries,0);
 const session=cookie(await token(env.FINDER_SESSION_SECRET));
 const request=path=>ctx(req(path,{headers:{cookie:session}}),{DB});
 const snapshot=await (await directory(request('directory'))).json();
 assert.equal(queries,1);assert.equal(snapshot.teams.length,1);
 assert.deepEqual(Object.keys(snapshot.teams[0]).sort(),['captain','id','leader','team_code','team_name']);
 for(const q of ['Git-R','AIC-1','Captain'])assert.equal(searchDirectory(snapshot.teams,q).length,1);
 assert.equal(queries,1); // local searching does not touch DB.
 const find=async()=>await (await search(request('search?id=1'))).json();
 let before=queries;let result=await find();assert.equal(queries-before,1);
 assert.equal(result.team.room,null);assert.equal(result.team.attendance_marked,0);
 f.sqlite.exec("INSERT INTO venue_allocations(team_id,table_id,assigned_by) SELECT 1,id,'test' FROM venue_tables LIMIT 1");
 result=await find();assert.ok(result.team.room);const oldRoom=result.team.room;
 f.sqlite.exec("UPDATE venue_allocations SET table_id=(SELECT id FROM venue_tables WHERE room_id != (SELECT room_id FROM venue_tables WHERE id=venue_allocations.table_id) LIMIT 1)");
 assert.notEqual((await find()).team.room,oldRoom);
 before=queries;
 assert.equal((await search(request('search?q=Git'))).status,400);
 assert.equal((await search(request('search?id=1%20OR%201=1'))).status,400);
 assert.equal(queries,before);
 assert.equal((await search(request('search?id=9999'))).status,404);
 }finally{f.sqlite.close();}
});
test('local directory handles names, codes, designated leaders and corrupted cache',()=>{
 const teams=[{id:1,team_name:'Café Makers',team_code:'AIC-123',captain:'Sam',leader:'Alex'}];
 for(const query of ['cafe','aic-123','SAM','alex'])assert.equal(searchDirectory(teams,query).length,1);
 assert.deepEqual(searchDirectory(teams,''),[]);
 assert.deepEqual(searchDirectory(teams,'unknown'),[]);
 assert.equal(readDirectory({getItem:()=>'{broken'}),null);
 assert.equal(readDirectory({getItem:()=>JSON.stringify({teams:[{id:'bad'}],syncedAt:new Date().toISOString()})}),null);
 const stored={teams,syncedAt:new Date().toISOString()};
 assert.deepEqual(readDirectory({getItem:key=>{assert.equal(key,CACHE_KEY);return JSON.stringify(stored);}}),stored);
});
