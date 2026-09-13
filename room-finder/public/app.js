import {searchDirectory,readDirectory,CACHE_KEY} from './directory.js';
const $=id=>document.getElementById(id);
let directory=null, sequence=0, authGeneration=0, signedIn=false, syncing=false, loadingId=null;
async function api(path,options={}) {
 const response=await fetch('/api/'+path,{...options,cache:'no-store',signal:AbortSignal.timeout(15000)});
 const data=await response.json();
 if(!response.ok)throw Object.assign(new Error(data.error||'Please try again.'),{status:response.status});
 return data;
}
function clearCache(){directory=null;try{localStorage.removeItem(CACHE_KEY);}catch{}}
function show(allowed){
 signedIn=allowed;authGeneration++;sequence++;loadingId=null;
 $('login').hidden=allowed;$('finder').hidden=!allowed;$('logout').hidden=!allowed;$('refresh').hidden=!allowed;
 $('results').replaceChildren();$('detail').replaceChildren();
 if(allowed){try{directory=readDirectory(localStorage);}catch{directory=null;}renderSearch();$('query').focus();}
 else clearCache();
}
function failure(error,target){if(error.status===401){show(false);$('login-error').textContent='Please sign in again.';}else $(target).textContent=error.message||'Connection failed. Please try again.';}
function element(tag,text,className){const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;}
function card(team){const el=element('article','','team');el.append(element('h2',team.team_name),element('div',team.team_code,'meta'),element('div','Team leader: '+(team.captain||'Not recorded'),'meta'));
 if(team.room){const location=element('div','','location');for(const [label,value] of [['Room',team.room],['Table','T'+team.table_number]]){const box=element('div','');box.append(element('small',label),element('strong',value));location.append(box);}el.append(location);if(team.block)el.append(element('p',team.block+' block','meta'));}
 else {const text=!team.attendance_marked?'Not checked in. Direct the team to the check-in desk.':!team.project_mode?'Project mode missing. Ask the check-in desk to update it.':team.present_count<2||!team.lead_present?'Check-in incomplete. At least two members and the team lead must be present.':'Awaiting room allocation. Direct the team to Staff venues.';el.append(element('div',text,'notice'));}return el;}

function renderSearch(){
 sequence++;$('detail').replaceChildren();$('results').replaceChildren();
 $('synced').textContent=directory?'Last synced '+new Date(directory.syncedAt).toLocaleString()+' · '+directory.teams.length+' teams':'No directory saved on this phone.';
 if(!directory){$('status').textContent='Tap Refresh at the top to download the team directory.';return;}
 const q=$('query').value.trim();
 if(q.length<2){$('status').textContent='Type at least two characters to find a team.';return;}
 const matches=searchDirectory(directory.teams,q);
 $('status').textContent=matches.length>30?'Showing 30 matches. Type more to narrow the list.':matches.length+' matching team'+(matches.length===1?'':'s')+'. Tap a team to check its current room.';
 for(const team of matches.slice(0,30)){
  const button=element('button','','team team-choice');button.type='button';
  button.append(element('strong',team.team_name),element('span',team.team_code,'meta'),element('span','Team leader: '+(team.leader||team.captain||'Not recorded'),'meta'),element('span','View current room →','choice-action'));
  button.addEventListener('click',()=>loadRoom(team));$('results').append(button);
 }
 if(!matches.length)$('results').append(element('div','No matches. Try another name or code, or Refresh to download recent changes.','empty'));
}
async function loadRoom(team){
 if(loadingId===team.id)return;
 loadingId=team.id;const current=++sequence;
 $('detail').replaceChildren(element('p','Checking current room…','notice'));
 try{const data=await api('search?id='+team.id);if(current!==sequence||!signedIn)return;
  $('detail').replaceChildren(card(data.team));$('detail').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(error){if(current!==sequence)return;failure(error,'detail');}
 finally{if(loadingId===team.id)loadingId=null;}
}
$('refresh').addEventListener('click',async()=>{
 if(syncing)return;syncing=true;const generation=authGeneration;
 $('refresh').disabled=true;$('refresh').textContent='Syncing…';$('status').textContent='Downloading team directory…';
 try{const data=await api('directory');if(generation!==authGeneration||!signedIn)return;
  directory={teams:data.teams,syncedAt:data.syncedAt};let saved=true;
  try{localStorage.setItem(CACHE_KEY,JSON.stringify(directory));}catch{saved=false;}
  renderSearch();if(!saved)$('synced').textContent+=' · Available for this visit only';
 }catch(error){if(generation===authGeneration)failure(error,'status');}
 finally{syncing=false;$('refresh').disabled=false;$('refresh').textContent='Refresh';}
});
$('login-form').addEventListener('submit',async event=>{
 event.preventDefault();$('signin').disabled=true;$('login-error').textContent='';
 try{await api('auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});$('login-form').reset();show(true);}
 catch(error){$('login-error').textContent=error.message;}finally{$('signin').disabled=false;}
});
$('logout').addEventListener('click',async()=>{try{await api('auth',{method:'DELETE'});show(false);$('query').value='';}catch(error){failure(error,'status');}});
$('query').addEventListener('input',renderSearch);
$('search-form').addEventListener('submit',event=>{event.preventDefault();renderSearch();});
api('auth').then(data=>show(data.ok)).catch(()=>{$('login-error').textContent='Connect to sign in. Your saved directory will be available after authentication.';});
