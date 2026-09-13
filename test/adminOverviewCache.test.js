import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the real hook's async cache transitions with a minimal hook runtime.
function harness(api) {
 const slots = []; let cursor = 0;
 const source = readFileSync(new URL('../src/hooks/useDashboardData.js', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '').replace(/export function /g, 'function ');
 const context = vm.createContext({
  useState(initial) { const i=cursor++; if (!(i in slots)) slots[i]=typeof initial==='function'?initial():initial; return [slots[i], value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}]; },
  useRef(initial) { const i=cursor++; if (!(i in slots)) slots[i]={current:initial}; return slots[i]; },
  useEffect() {}, useCallback: fn=>fn,
  localStorage: { getItem: ()=>JSON.stringify({owner:'admin',entries:{overview:{summary:{total:100},recent:[{id:1}]},hackathon:{registrations:[{id:1,team_name:'Original'}]}}}) },
  registrationsApi:api,isUnauthorized:()=>false,setTimeout:()=>0,clearTimeout(){},Date,
 });
 vm.runInContext(source,context);
 return ()=>{cursor=0;return vm.runInContext("useDashboardData('overview', ()=>{}, 'admin')", context);};
}

test('admin updates/deletes retain overview counts and mark them stale without fetching', async()=>{
 let reads=0;
 const render=harness({update:async()=>({registration:{id:1,team_name:'Edited'}}),remove:async()=>{},summary:async()=>{reads++;return {summary:{total:99}};}});
 let hook=render();
 await hook.updateRegistration('hackathon',{id:1},{});
 hook=render();assert.equal(hook.summary.total,100);assert.equal(hook.recent.length,1);assert.equal(hook.overviewStale,true);
 await hook.removeRegistration('hackathon',{id:1});
 hook=render();assert.equal(hook.summary.total,100);assert.equal(hook.overviewStale,true);assert.equal(reads,0);
 await hook.refresh();hook=render();assert.equal(hook.summary.total,99);assert.equal(hook.overviewStale,false);assert.equal(reads,1);
});

test('overview response started before a successful edit remains marked stale', async()=>{
 let resolveSummary;
 const render=harness({summary:()=>new Promise(resolve=>{resolveSummary=resolve;}),update:async()=>({registration:{id:1,team_name:'Edited'}})});
 const hook=render();const request=hook.refresh();
 await hook.updateRegistration('hackathon',{id:1},{});
 resolveSummary({summary:{total:100},recent:[{id:1}]});await request;
 const next=render();assert.equal(next.summary.total,100);assert.equal(next.overviewStale,true);
});
