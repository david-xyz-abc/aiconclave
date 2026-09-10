import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('login, counts, stale refresh, and logout states', async () => {
  const ids = ['signin','dashboard','logout','login-form','login-button','login-error','data-error','refresh','status','title','veg','nonVeg','present','unrecorded'];
  const elements = Object.fromEntries(ids.map(id => [id, {textContent:'',hidden:false,disabled:false,addEventListener(event,fn){this[event]=fn;},focus(){}}]));
  elements['login-form'].elements = {username:{value:'user1',focus(){}},password:{value:'test'}};
  elements['login-form'].reset = () => {};
  let status = 200;
  const counts = {veg:12,nonVeg:18,present:33,unrecorded:3};
  const settle = () => new Promise(resolve => setImmediate(resolve));
  runInNewContext(readFileSync(new URL('../public/app.js',import.meta.url),'utf8'), {
    document:{hidden:false,getElementById:id=>elements[id],addEventListener(){}},
    TextEncoder, btoa, AbortController, setTimeout, clearTimeout, setInterval(){},
    fetch:async()=>({ok:status===200,status,json:async()=>({counts,updatedAt:'2026-09-10T12:00:00Z',error:'Invalid username or password.'})}),
  });
  elements['login-form'].submit({preventDefault(){},currentTarget:elements['login-form']});
  await settle();
  assert.equal(elements.dashboard.hidden,false);
  assert.equal(elements.veg.textContent,'12');
  assert.equal(elements.unrecorded.textContent,'3');
  status = 503;
  elements.refresh.click();
  await settle();
  assert.match(elements['data-error'].textContent,/outdated/);
  assert.equal(elements.veg.textContent,'12');
  elements.logout.click();
  assert.equal(elements.dashboard.hidden,true);
  assert.equal(elements.veg.textContent,'—');
  status = 401;
  elements['login-form'].submit({preventDefault(){},currentTarget:elements['login-form']});
  await settle();
  assert.equal(elements.signin.hidden,false);
  assert.match(elements['login-error'].textContent,/Invalid/);
});
