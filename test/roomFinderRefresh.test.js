import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../room-finder/public/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function app(){
 const nodes=new Map(),requests=new Map();
 class Element {
  constructor(){this.hidden=false;this.children=[];this.listeners={};this.value='git';this.isConnected=false;}
  replaceChildren(...children){this.children=children;}
  append(...children){this.children.push(...children);}
  addEventListener(event,callback){this.listeners[event]=callback;}
  focus(){this.focused=true;}
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
 const team={id:1,team_name:'Git',team_code:'AIC-1',captain:'Captain'};
 const directory={teams:[team],syncedAt:'2026-09-14T00:00:00Z'};
 const context={document:{getElementById:get,createElement:()=>new Element()},window:{scrollY:25,scrollTo(){}},
  localStorage:{getItem(){},setItem(){},removeItem(){}},AbortSignal:{timeout(){}},FormData:class {},
  searchDirectory:teams=>teams,readDirectory:()=>directory,CACHE_KEY:'test',
  fetch:path=>path==='/api/auth'?Promise.resolve({ok:true,json:async()=>({ok:true})}):new Promise(resolve=>requests.set(path,data=>resolve({ok:true,json:async()=>data}))),
 };
 vm.createContext(context);vm.runInContext(source,context);
 return {get,requests,directory,team};
}
for(const directoryFirst of [true,false])test(`directory refresh preserves active room details (${directoryFirst?'directory':'room'} responds first)`,async()=>{
 const a=app();await tick();
 const syncing=a.get('refresh').listeners.click();
 a.get('results').children[0].listeners.click();
 assert.equal(a.get('detail-page').hidden,false);
 const room=()=>a.requests.get('/api/search?id=1')({team:{...a.team,room:'RS101',table_number:5}});
 const directory=()=>a.requests.get('/api/directory')(a.directory);
 if(directoryFirst){directory();await syncing;assert.equal(a.get('detail').children.length,1);room();await tick();}
 else{room();await tick();directory();await syncing;}
 assert.equal(a.get('detail-page').hidden,false);
 assert.equal(a.get('finder').hidden,true);
 assert.equal(a.get('detail').children.length,1);
 assert.equal(a.get('detail').children[0].children[0].textContent,'Git');
 a.get('back-search').listeners.click();
 assert.equal(a.get('finder').hidden,false);assert.equal(a.get('detail-page').hidden,true);
 assert.equal(a.get('results').children.length,1);
 assert.equal(a.get('query').focused,true);
 assert.equal(a.requests.size,2); // Back does not fetch anything.
});
