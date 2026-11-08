/* Shared staff session only. No bearer token, password or client secret entry. */
(()=>{'use strict';
const $=id=>document.getElementById(id),cloud=window.OpsCloud,M=window.OpsTaskConnectionModel;
if(!cloud||!M||!$('task-connection'))return;
let epoch=0,busy=false,owner=cloud.user?.id||null,clients=[],canManage=false,consent=null;
const authId=new URLSearchParams(location.search).get('authorization_id');
const authorization=/^[0-9a-f-]{36}$/i.test(authId||'')?authId:null;
const el=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=String(text);return n};
const status=text=>{$('task-connection-status').textContent=text};
const rpc=(action,payload={})=>cloud.api('/rest/v1/rpc/ops_task_agent',{method:'POST',body:JSON.stringify({action,payload})});
function controls(){
 $('task-connection-refresh').disabled=busy||!cloud.user;
 $('task-connection-admin').hidden=!canManage||!cloud.user;
 for(const node of $('task-connection-form').elements)node.disabled=busy||!canManage||!cloud.user;
 $('task-consent-approve').disabled=busy||!cloud.user||!consent;
 $('task-consent-deny').disabled=busy||!cloud.user||!consent;
 $('task-consent-signin').hidden=!!cloud.user;
}
function reset(){
 epoch++;busy=false;clients=[];canManage=false;consent=null;
 $('task-connection-clients').replaceChildren();$('task-connection-activity').replaceChildren();
 $('task-connection-form').reset();$('task-connection-state').textContent=cloud.user?'Not checked':'Sign in';
 $('task-consent-details').replaceChildren();$('task-consent-message').textContent='Sign in with your Oaktown staff account to review this connection.';
 status(cloud.user?'Open this panel to check your task connection.':'Sign in to connect ChatGPT and view saved changes.');controls();
}
function renderClients(){
 const host=$('task-connection-clients');host.replaceChildren();
 for(const c of clients){
  const row=el('div');row.className='task-connection-client';const body=el('div');
  body.append(el('strong',c.label),el('p',(c.enabled?(c.can_write?'Read + reviewed task changes':'Read only'):'Disabled')),el('p','Client ID: '+c.client_id));row.append(body);
  if(c.enabled){const disable=el('button','Disable access');disable.type='button';disable.className='button';disable.disabled=busy;
   disable.addEventListener('click',()=>saveClient({...c,enabled:false}));row.append(disable)}host.append(row);
 }
}
function renderActivity(receipts){
 const host=$('task-connection-activity');host.replaceChildren();
 if(!receipts.length){host.append(el('p','No ChatGPT task saves are recorded for this account yet.'));return}
 for(const receipt of receipts){const row=M.differences(receipt);if(!row)throw Error('Saved activity receipt was incomplete');
  const article=el('article');article.append(el('strong',row.title),el('p',(row.operation==='create'?'Created':'Updated')+' · '+row.status.replaceAll('_',' ')+' · '+row.client));
  if(row.action)article.append(el('p','Next: '+row.action));
  if(row.when){const d=new Date(row.when);if(Number.isFinite(d.getTime()))article.append(el('p','Saved '+d.toLocaleString(undefined,{timeZone:'America/New_York'})+' Eastern'))}
  const open=el('button','Open saved task');open.type='button';open.className='button';
  open.addEventListener('click',()=>{
   if(!cloud.user)return;
   if(!window.OpsOperations?.openSource){status('Saved-record navigation is unavailable. Refresh Oaktown and retry.');return}
   Promise.resolve(window.OpsOperations.openSource('task',row.id)).catch(()=>status('Could not open the saved task. Refresh and retry.'));
  });article.append(open);
  const detail=el('details');detail.append(el('summary','View save receipt'),el('p','Task '+row.id),el('p','Proposal '+receipt.proposal_id));article.append(detail);host.append(article);
 }
}
async function refresh(){
 if(!cloud.user||busy)return;const ticket=epoch,account=cloud.user.id;busy=true;controls();status('Checking your task connection…');
 try{const [setup,activity]=await Promise.all([rpc('connections'),rpc('activity')]);
  if(ticket!==epoch||cloud.user?.id!==account)return;
  if(setup?.schema_version!=='oaktown.task-connection.v1'||!Array.isArray(setup.clients)||!Array.isArray(activity))throw Error('Connection response not confirmed');
  clients=setup.clients;canManage=setup.can_manage===true;renderClients();renderActivity(activity);
  $('task-connection-state').textContent=clients.some(c=>c.enabled)?'Client registered':'API available';
  status('OAuth sign-in is required in ChatGPT. A registered client alone does not confirm that ChatGPT is connected.');
 }catch(e){if(ticket===epoch){clients=[];canManage=false;$('task-connection-clients').replaceChildren();$('task-connection-activity').replaceChildren();
  $('task-connection-state').textContent='Setup required';status('Task connection unavailable: '+e.message+'. Existing task editing is still available.');}}
 finally{if(ticket===epoch){busy=false;controls();renderClients()}}
}
async function saveClient(c){
 if(busy||!canManage||!cloud.user)return;const ticket=epoch,account=cloud.user.id;busy=true;controls();
 let confirmed=false,error='';
 try{const result=await rpc('configure',{client_id:c.client_id,label:c.label,enabled:c.enabled,can_write:c.can_write});
  if(ticket!==epoch||cloud.user?.id!==account)return;
  if(result?.saved!==true)throw Error('Server did not confirm client settings');
  $('task-connection-form').reset();confirmed=true;
 }catch(e){error=e.message}
 finally{if(ticket===epoch){busy=false;controls();await refresh();
  if(ticket!==epoch||cloud.user?.id!==account)return;
  const actual=clients.find(x=>x.client_id===c.client_id);
  if(confirmed&&actual&&actual.enabled===c.enabled&&actual.can_write===c.can_write&&actual.label===c.label)
   status(c.enabled?'Client settings verified. Complete OAuth setup and sign-in in ChatGPT.':'Client access disabled and verified. New task API calls are blocked.');
  else status('Client settings not verified: '+(error||'Read-back did not match')+'. Check saved client access before retrying.');
 }}
}
async function loadConsent(){
 const dialog=$('task-consent-dialog');if(!authorization)return;
 if(!dialog.open)dialog.showModal();
 if(!cloud.user){controls();return}
 const ticket=epoch,account=cloud.user.id;busy=true;consent=null;controls();
 try{const details=await cloud.api('/auth/v1/oauth/authorizations/'+encodeURIComponent(authorization));
  if(ticket!==epoch||cloud.user?.id!==account)return;
  if(details.redirect_url){location.assign(M.redirect(details.redirect_url));return}
  if(details.authorization_id!==authorization||!details.client?.id||!details.redirect_uri)throw Error('OAuth request incomplete');
  M.redirect(details.redirect_uri);
  const client=await rpc('consent_client',{client_id:details.client.id});
  if(ticket!==epoch||cloud.user?.id!==account)return;
  consent=details;const host=$('task-consent-details');host.replaceChildren();
  host.append(el('h3',client.label),el('p',client.can_write?'Read tasks and history, prepare changes for review, and save approved task changes.':'Read tasks and task history. Task changes are disabled for this client.'),
   el('p','Each save records your staff identity. No notices, messages, payments or lease documents are sent or changed.'));
  host.append(el('p','Requested identity scopes: '+(details.scope||'None')));
  $('task-consent-message').textContent='Approve this connection only if you started it from ChatGPT.';
 }catch(e){if(ticket===epoch){consent=null;$('task-consent-details').replaceChildren();$('task-consent-message').textContent='Connection not approved: '+e.message;}}
 finally{if(ticket===epoch){busy=false;controls()}}
}
async function decide(action){
 if(busy||!consent||!cloud.user)return;const ticket=epoch,account=cloud.user.id,expected=consent.redirect_uri;busy=true;controls();
 try{const result=await cloud.api('/auth/v1/oauth/authorizations/'+encodeURIComponent(authorization)+'/consent',{method:'POST',body:JSON.stringify({action})});
  if(ticket!==epoch||cloud.user?.id!==account)return;
  location.assign(M.redirect(result?.redirect_url,expected));
 }catch(e){if(ticket===epoch)$('task-consent-message').textContent='Connection decision not confirmed: '+e.message}
 finally{if(ticket===epoch){busy=false;controls()}}
}
$('task-connection').addEventListener('toggle',()=>{if($('task-connection').open)refresh()});
$('task-connection-refresh').addEventListener('click',async()=>{await refresh();if(cloud.user)window.dispatchEvent(new Event('ops-today-refresh'))});
$('task-connection-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(M.server);status('Server URL copied. Add it under ChatGPT → Plugins → Custom MCP servers.')}catch{status('Copy this server URL: '+M.server)}});
$('task-connection-form').addEventListener('submit',e=>{e.preventDefault();saveClient({client_id:$('task-connection-client-id').value.trim(),label:$('task-connection-label').value.trim(),enabled:$('task-connection-enabled').checked,can_write:$('task-connection-write').checked})});
$('task-consent-signin').addEventListener('click',()=>{$('task-consent-dialog').close();$('account-button').click()});
$('task-consent-approve').addEventListener('click',()=>decide('approve'));
$('task-consent-deny').addEventListener('click',()=>decide('deny'));
$('task-consent-close').addEventListener('click',()=>{$('task-consent-dialog').close()});
window.addEventListener('ops-auth-change',event=>{const next=event.detail?.user?.id||null;if(next!==owner||!next){owner=next;reset()}if(next&&authorization)loadConsent();else if(next&&$('task-connection').open)refresh()});
reset();if(authorization)loadConsent();
})();
