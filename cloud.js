/* Shared Supabase session. Public key only; database RLS authorizes every request. */
(()=>{'use strict';
const BASE='https://wjdzaexhhjsjtdgxivyw.supabase.co',KEY='sb_publishable_urQMXLaHY5J2ALLmCRoCjA_47yOehbD',STORE='oaktown-session-v04';
let session=null,user=null,refreshing=null,timer=null,epoch=0,recoveryToken=null;
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
function superseded(){const error=Error('Account changed. Please retry.');error.cancelled=true;return error;}
async function api(path,options={}){
 const started=epoch;
 if(!session)throw Error('Sign in to use Supabase.');
 if(session.expires_at*1000<Date.now()+60000)await refresh();
 if(started!==epoch||!session)throw superseded();
 try{const data=await raw(path,options);if(started!==epoch)throw superseded();return data;}catch(e){if(started!==epoch||!session)throw superseded();if(e.status!==401)throw e;session.expires_at=0;localStorage.setItem(STORE,JSON.stringify(session));await refresh();if(started!==epoch||!session)throw superseded();const data=await raw(path,options);if(started!==epoch)throw superseded();return data;}
}
async function verify(){
 const started=epoch;
 const who=await api('/auth/v1/user');
 const rows=await api('/rest/v1/staff_memberships?select=role,is_active&user_id=eq.'+encodeURIComponent(who.id));
 if(rows.length!==1||!rows[0].is_active||!['admin','editor'].includes(rows[0].role)){const e=Error('Administrator or editor access not approved.');e.status=403;throw e;}
 if(started!==epoch)throw superseded();user=who;signal();return who;
}
async function requestPasswordReset(email){
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email||'').trim()))throw Error('Enter a valid account email.');
 // Destination must be the current Oaktown Ops origin, not an arbitrary external URL.
 const destination=location.origin+location.pathname;
 return raw('/auth/v1/recover?redirect_to='+encodeURIComponent(destination),{
  method:'POST',body:JSON.stringify({email:email.trim()})
 });
}
async function completePasswordRecovery(newPassword){
 if(!recoveryToken)throw Error('Open the latest valid password reset link from your email.');
 if(typeof newPassword!=='string'||newPassword.length<12)throw Error('Use a password of at least 12 characters.');
 const token=recoveryToken;
 // Never save recovery tokens in browser storage or attach them to ordinary sessions.
 const result=await raw('/auth/v1/user',{method:'PUT',headers:{Authorization:'Bearer '+token},body:JSON.stringify({password:newPassword})});
 recoveryToken=null;
 return result;
}
async function signIn(email,password){
 const started=++epoch;const next=await raw('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
 if(started!==epoch)throw superseded();remember(next);try{return await verify()}catch(e){if(started===epoch){remember(null);user=null;signal(e.message);}throw e;}
}
async function signOut(){
 const started=++epoch;const remote=session?raw('/auth/v1/logout',{method:'POST'}):Promise.resolve();
 remember(null);sessionStorage.removeItem('oaktown-pilot-session-v03');user=null;signal();
 try{await remote}catch{if(started===epoch)signal('Signed out on this device. Server sign-out could not be confirmed.');}
}
async function start(){
 const fragment=new URLSearchParams(location.hash.replace(/^#/,''));
 if(fragment.get('type')==='recovery'&&fragment.get('access_token')){
  recoveryToken=fragment.get('access_token');
  ++epoch;remember(null);user=null;
  history.replaceState(null,'',location.pathname+location.search);
  signal();
  window.dispatchEvent(new Event('ops-password-recovery'));
  return;
 }
 const started=epoch;session=read();
 if(!session){try{const old=JSON.parse(sessionStorage.getItem('oaktown-pilot-session-v03')||'null');if(old)remember(old)}catch{}}
 if(!session){signal();return;}
 schedule();try{await verify()}catch(e){if(started!==epoch)return;if([400,401,403].includes(e.status)){remember(null);user=null;}signal(e.message);}
}
window.addEventListener('storage',event=>{if(event.key!==STORE)return;++epoch;session=read();if(!session){clearTimeout(timer);user=null;signal();}else{schedule();verify().catch(e=>{if(!e.cancelled){user=null;signal(e.message)}})}});
window.addEventListener('online',()=>{if(session)verify().catch(e=>signal(e.message))});
window.OpsCloud={api,signIn,signOut,start,requestPasswordReset,completePasswordRecovery,get user(){return user;}};
})();