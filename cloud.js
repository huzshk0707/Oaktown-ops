/* Shared Supabase session. Public key only; database RLS authorizes every request. */
(()=>{'use strict';
const BASE='https://wjdzaexhhjsjtdgxivyw.supabase.co',KEY='sb_publishable_urQMXLaHY5J2ALLmCRoCjA_47yOehbD',STORE='oaktown-session-v04';
let session=null,user=null,refreshing=null,timer=null,epoch=0;
function read(){try{return JSON.parse(localStorage.getItem(STORE)||'null')}catch{return null}}
function remember(s){session=s;if(s){s.expires_at=s.expires_at||Math.floor(Date.now()/1000)+(s.expires_in||3600);localStorage.setItem(STORE,JSON.stringify(s));}else localStorage.removeItem(STORE);schedule();}
function signal(error=''){window.dispatchEvent(new CustomEvent('ops-auth-change',{detail:{user,error}}))}
function schedule(){clearTimeout(timer);if(session?.refresh_token)timer=setTimeout(()=>refresh().catch(e=>signal(e.message)),Math.max(1000,(session.expires_at*1000-Date.now()-60000)));}
async function raw(path,options={}){
 const res=await fetch(BASE+path,{...options,headers:{apikey:KEY,'Content-Type':'application/json',...(session?.access_token?{Authorization:'Bearer '+session.access_token}:{}),...options.headers}});
 const data=await res.json().catch(()=>({}));
 if(!res.ok){const e=Error(data.message||data.msg||data.error_description||'Connection failed ('+res.status+').');e.status=res.status;e.code=data.code;throw e;}return data;
}
async function refresh(){
 if(refreshing)return refreshing;
 const started=epoch;
 const run=async()=>{
  const saved=read();if(!saved?.refresh_token)throw Error('Please sign in to your workspace.');
  session=saved;if(saved.expires_at*1000>Date.now()+65000)return;
  try{const next=await raw('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:saved.refresh_token})});if(epoch===started)remember(next);}
  catch(e){if((e.status===400||e.status===401)&&epoch===started){remember(null);user=null;signal('Your session ended. Please sign in again.');}else{clearTimeout(timer);timer=setTimeout(()=>refresh().catch(()=>{}),60000);}throw e;}
 };
 refreshing=(navigator.locks?navigator.locks.request('oaktown-session-refresh',run):run()).finally(()=>{refreshing=null});return refreshing;
}
async function api(path,options={}){
 if(!session)throw Error('Sign in to use Supabase.');
 if(session.expires_at*1000<Date.now()+60000)await refresh();
 try{return await raw(path,options)}catch(e){if(e.status!==401)throw e;session.expires_at=0;localStorage.setItem(STORE,JSON.stringify(session));await refresh();return raw(path,options);}
}
async function verify(){
 const who=await api('/auth/v1/user');
 const rows=await api('/rest/v1/staff_memberships?select=role,is_active&user_id=eq.'+encodeURIComponent(who.id));
 if(rows.length!==1||!rows[0].is_active||!['admin','editor'].includes(rows[0].role)){const e=Error('Administrator or editor access not approved.');e.status=403;throw e;}
 user=who;signal();return who;
}
async function signIn(email,password){
 ++epoch;const next=await raw('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
 remember(next);try{return await verify()}catch(e){remember(null);user=null;signal(e.message);throw e;}
}
async function signOut(){
 ++epoch;let error='';try{if(session)await raw('/auth/v1/logout',{method:'POST'})}catch{error='Signed out on this device. Server sign-out could not be confirmed.';}
 remember(null);sessionStorage.removeItem('oaktown-pilot-session-v03');user=null;signal(error);
}
async function start(){
 session=read();
 if(!session){try{const old=JSON.parse(sessionStorage.getItem('oaktown-pilot-session-v03')||'null');if(old)remember(old)}catch{}}
 if(!session){signal();return;}
 schedule();try{await verify()}catch(e){if([400,401,403].includes(e.status)){remember(null);user=null;}signal(e.message);}
}
window.addEventListener('storage',event=>{if(event.key!==STORE)return;++epoch;session=read();if(!session){clearTimeout(timer);user=null;signal();}else{schedule();verify().catch(e=>{user=null;signal(e.message)})}});
window.addEventListener('online',()=>{if(session)verify().catch(e=>signal(e.message))});
window.OpsCloud={api,signIn,signOut,start,get user(){return user;}};
})();