
(()=>{'use strict';
const $=id=>document.getElementById(id),cloud=window.OpsCloud,frame=$('studio-frame');
let workflow='notices',tab='notices',records=[],editing=null,revision=0,cloudBatch=null,currentUser=null,propertyLoad=0,preOpenUndo=null,selectedMessage=null;
const pending=new Map(),META='oaktown-batch-meta-v04',LOCAL_TITLE='oaktown-batch-title-v06';
const say=(id,text)=>$(id).textContent=text;
const post=message=>frame.contentWindow?.postMessage(message,location.origin);
function frameRequest(type,extra={}){
 const requestId=crypto.randomUUID();
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(requestId);reject(Error('The notice editor is still loading. Please retry.'))},10000);pending.set(requestId,{resolve,reject,timer});post({type,requestId,...extra});});
}
async function busy(button,action){
 const controls=button.id==='property-save'?[...$('property-form').querySelectorAll('input,button'),$('property-new'),$('property-edit'),$('properties-refresh')]:[button];
 const states=controls.map(control=>control.disabled);controls.forEach(control=>control.disabled=true);
 try{return await action()}finally{controls.forEach((control,i)=>control.disabled=states[i])}
}
let batchBusy=false;
async function batchOperation(action){
 if(batchBusy)return;batchBusy=true;
 for(const id of ['cloud-save','cloud-open','cloud-load'])$(id).disabled=true;
 try{return await action()}finally{batchBusy=false;$('cloud-save').disabled=false;$('cloud-open').disabled=false;$('cloud-load').disabled=!$('cloud-batches').value;}
}
function account(){if(!$('account-dialog').open)$('account-dialog').showModal()}
function requireUser(){if(cloud.user)return true;account();say('pilot-auth-status','Sign in once to use the shared property directory and cloud saves.');return false;}
function rememberBatch(){if(cloudBatch)localStorage.setItem(META,JSON.stringify({...cloudBatch,owner:cloud.user?.id,title:$('batch-title').value}));}
function saveLocalTitle(){try{localStorage.setItem(LOCAL_TITLE,$('batch-title').value.slice(0,120));return true}catch{return false}}
function timeLabel(){return new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}
function cloudDirty(){revision++;if(!saveLocalTitle()){say('cloud-status','Local storage unavailable · export a JSON backup before leaving.');return}say('cloud-status','Saved locally · '+timeLabel()+(cloud.user?' · unsynced changes (Save to cloud)':' · only on this browser'));}
function showWorkflow(name){
 workflow=name;
 document.querySelectorAll('[data-workspace]').forEach(b=>{const on=b.dataset.workspace===name;b.classList.toggle('active',on);on?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current')});
 $('notices-workflow').hidden=name!=='notices';$('properties-workflow').hidden=name!=='properties';$('future-workflow').hidden=['notices','properties'].includes(name);
 const titles={notices:'Notices',properties:'Properties',leases:'Leases & renewals',listings:'Listings',maintenance:'Maintenance'};
 const descriptions={notices:'Select properties, create notice drafts and prepare tenant messages.',properties:'Manage shared property records, addresses and verified notice addressees.',leases:'Generate renewal leases, track signatures and record status updates.',listings:'Property descriptions and listing preparation will live here.',maintenance:'Maintenance requests, assignments and follow-up tasks will live here.'};
 say('workspace-title',titles[name]);say('breadcrumb',titles[name]);say('workspace-summary',descriptions[name]);
 if(['listings','maintenance'].includes(name)){say('future-title',titles[name]);say('future-description',descriptions[name]);}
 if(name==='notices')showTab(tab);
 if(name==='properties'&&cloud.user)loadProperties().catch(e=>say('pilot-status',e.message));
}
function showTab(next){
 if(!['notices','message'].includes(next))next='notices';
 tab=next;
 document.querySelectorAll('[data-notice-tab]').forEach(b=>{const on=b.dataset.noticeTab===tab;b.classList.toggle('active',on);on?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current')});
 $('generator-area').hidden=tab!=='notices';$('message-area').hidden=tab!=='message';
 if(tab==='notices')post({type:'oaktown-view',view:'notices'});
 if(tab==='message'){
  selectedMessage=null;resetTenantEmail('Loading selected tenant contact…');
  $('copy-message').disabled=true;say('message-copy-status','Loading selected notice…');
  post({type:'oaktown-tenant-message-request'});
 }
}
function resetTenantEmail(text){
 $('tenant-email-value').replaceChildren();
 say('tenant-email-value',text);
 say('tenant-email-note','');
}
function updateTenantEmail(){
 const e=$('tenant-email-value');e.replaceChildren();
 if(!cloud.user){resetTenantEmail('Sign in to view tenant email.');return;}
 if(!selectedMessage){resetTenantEmail('Select a notice first.');return;}
 const result=window.OpsNoticeContact?.lookup(window.OpsPortfolio?.getData(),selectedMessage.sourceUnitId,selectedMessage.recipient);
 if(!result){resetTenantEmail('Tenant contact lookup unavailable.');return;}
 if(!result.emails.length){resetTenantEmail(result.message);return;}
 result.emails.forEach((email,i)=>{
  if(i)e.append(document.createTextNode(' · '));
  const item=document.createElement('span');item.className='tenant-email-address';item.textContent=email;e.append(item);
 });
 say('tenant-email-note',result.message);
}
window.addEventListener('ops-portfolio-loaded',()=>{if(tab==='message')updateTenantEmail()});
document.querySelectorAll('[data-workspace]').forEach(b=>b.addEventListener('click',()=>showWorkflow(b.dataset.workspace)));
document.querySelectorAll('[data-notice-tab]').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.noticeTab)));
$('open-properties').onclick=$('future-properties').onclick=()=>showWorkflow('properties');
$('notices-load-all').onclick=()=>busy($('notices-load-all'),async()=>{if(!requireUser())return;try{await loadProperties();importMany(records)}catch(e){say('cloud-status','Could not load the property directory: '+e.message)}});
$('property-add-top').onclick=()=>{if(!requireUser())return;showWorkflow('properties');newProperty();$('property-editor').scrollIntoView({behavior:'smooth',block:'start'});$('prop-street_address').focus();};
$('account-button').onclick=$('properties-signin').onclick=account;
$('staff-access-signin').onclick=account;
$('account-close').onclick=()=>$('account-dialog').close();
$('forgot-password').onclick=()=>{
 $('password-request').hidden=!$('password-request').hidden;
 $('recovery-email').value=$('pilot-email').value.trim();
 say('recovery-status','');
};
$('password-request').onsubmit=async e=>{
 e.preventDefault();
 await busy($('password-request').querySelector('button'),async()=>{
  try{
   await cloud.requestPasswordReset($('recovery-email').value);
   say('recovery-status','If this is an approved account, a password reset link will arrive by email. Check your spam folder if needed.');
   $('password-request').hidden=true;
  }catch(error){say('recovery-status','Could not send reset request: '+error.message)}
 });
};
window.addEventListener('ops-password-recovery',()=>{
 $('password-change').hidden=false;
 $('password-request').hidden=true;
 $('pilot-auth').hidden=true;
 $('forgot-password').hidden=true;
 say('recovery-status','Reset link opened. Enter a new password below.');
 account();
});
$('password-change').onsubmit=async e=>{
 e.preventDefault();
 await busy($('password-change').querySelector('button'),async()=>{
  try{
   await cloud.completePasswordRecovery($('recovery-new-password').value);
   $('recovery-new-password').value='';
   $('password-change').hidden=true;
   $('forgot-password').hidden=false;
   $('pilot-auth').hidden=false;
   say('recovery-status','Password updated. Sign in with your new password.');
  }catch(error){say('recovery-status','Password update failed: '+error.message)}
 });
};
$('pilot-auth').onsubmit=async event=>{event.preventDefault();await busy($('pilot-login'),async()=>{try{say('pilot-auth-status','Signing in…');await cloud.signIn($('pilot-email').value.trim(),$('pilot-password').value);$('pilot-password').value='';$('account-dialog').close();say('pilot-auth-status','');}catch(e){say('pilot-auth-status',e.message);}})};
$('pilot-logout').onclick=()=>busy($('pilot-logout'),()=>cloud.signOut());
window.addEventListener('ops-auth-change',event=>{
 const user=event.detail.user,changed=currentUser!==user?.id;currentUser=user?.id||null;
 $('pilot-auth').hidden=!!user||!$('password-change').hidden;$('account-signed-in').hidden=!user;
 $('staff-access').hidden=!!user;document.body.classList.toggle('ops-signed-out',!user);$('properties-locked').hidden=!!user;
 $('pilot-properties').hidden=!user;$('property-editor').hidden=!user;
 say('account-label',user?'Signed in':'Sign in');document.querySelector('#account-button .account-dot')?.classList?.toggle('online',!!user);
 say('account-close',user?'Return to workspace':'Continue with local drafts');say('account-email',user?.email||'');
 if(event.detail.error)say('pilot-auth-status',event.detail.error);
 if(!user){
  propertyLoad++;records=[];editing=null;cloudBatch=null;$('pilot-property').replaceChildren();$('pilot-checklist').replaceChildren();$('property-record-list').replaceChildren();say('property-directory-count','');$('cloud-batches').replaceChildren();$('property-form').reset();say('pilot-results','');say('pilot-status','');say('property-status','');$('batch-dialog').close();
  say('cloud-status','Saved locally on this browser · sign in to sync to cloud.');preOpenUndo=null;$('undo-batch').hidden=true;
 }else if(changed){
  try{const saved=JSON.parse(localStorage.getItem(META)||'null');if(saved?.owner===user.id){cloudBatch=saved;$('batch-title').value=saved.title||'Notice batch';}}catch{}
  newProperty();loadProperties().catch(e=>say('pilot-status',e.message));
  say('cloud-status','Saved locally · select Save to cloud to sync this batch.');
 }
});
function propertySearchMatches(property,search){
 const query=String(search||'').toLowerCase().trim().replace(/\s+/g,' ');
 if(!query)return true;
 const address=[property.street_address,property.unit,property.city,property.state,property.postal_code].filter(Boolean).join(' ').toLowerCase().replace(/\s+/g,' ');
 return query.split(' ').every(token=>address.includes(token));
}
function filterProperties(){
 const dropdown=$('pilot-property'),previous=dropdown.value;
 const matches=records.map((p,i)=>({p,i})).filter(({p})=>propertySearchMatches(p,$('pilot-search').value));
 dropdown.replaceChildren(new Option(matches.length?'Select a property':'No matching properties',''),...matches.map(({p,i})=>new Option([p.street_address,p.unit].filter(Boolean).join(' ')+', '+p.city+' '+p.postal_code,String(i))));
 dropdown.value=matches.some(({i})=>String(i)===previous)?previous:'';
 const ids=new Set(matches.map(({i})=>i));
 $('pilot-checklist').querySelectorAll('input[data-property-index]').forEach(check=>{const row=check.closest('label');if(row)row.style.display=ids.has(Number(check.dataset.propertyIndex))?'flex':'none'});
 say('pilot-results',matches.length+' of '+records.length+' properties shown'+(matches.length===0?' — try another street or ZIP.':''));
 const list=$('property-record-list');list.replaceChildren();
 for(const {p,i} of matches){
  const b=document.createElement('button');b.type='button';b.className='property-record';
  const addr=document.createElement('strong');addr.textContent=[p.street_address,p.unit].filter(Boolean).join(' ');
  const meta=document.createElement('span');meta.className='property-record-meta';meta.textContent=[p.city+', '+p.state+' '+p.postal_code,p.tenant?'Notice recipient on file':'No notice recipient yet'].join(' · ');
  b.append(addr,meta);b.setAttribute('aria-label','Open property '+p.street_address);
  b.onclick=()=>openPropertyEditor(i);list.append(b);
 }
 say('property-directory-count',records.length+' properties in shared records · '+records.filter(p=>p.tenant).length+' have a notice recipient.');
}
$('pilot-search').addEventListener('input',filterProperties);
async function loadProperties(){
 if(!cloud.user)return;const ticket=++propertyLoad;
 const selectedId=records[Number($('pilot-property').value)]?.id;
 say('pilot-status','Refreshing shared property records…');
 const [props,people]=await Promise.all([cloud.api('/rest/v1/properties?select=id,street_address,unit,city,state,postal_code,landlord_entity,updated_at&order=street_address.asc'),cloud.api('/rest/v1/property_addressees?select=property_id,notice_addressee_text')]);
 if(ticket!==propertyLoad||!cloud.user)return;
 const peopleById=new Map(people.map(p=>[p.property_id,p.notice_addressee_text]));
 records=props.map(p=>({...p,tenant:peopleById.get(p.id)||''}));
 const list=$('pilot-checklist');list.replaceChildren();
 records.forEach((p,i)=>{const label=document.createElement('label');label.style.cssText='display:flex;gap:8px;align-items:center;padding:8px;border:1px solid #d6dfd2;border-radius:8px;font-size:13px';const check=document.createElement('input');check.type='checkbox';check.dataset.propertyIndex=String(i);check.style.width='auto';const name=document.createElement('span');name.textContent=[p.street_address,p.unit,p.postal_code].filter(Boolean).join(' ');label.append(check,name);list.append(label);});
 updateCount();say('pilot-load-all','Load all '+records.length+' properties');filterProperties();
 if(selectedId){const i=records.findIndex(p=>p.id===selectedId);if(i>=0&&[...$('pilot-property').options].some(o=>o.value===String(i)))$('pilot-property').value=String(i)}
 say('pilot-status','Property directory is up to date.');
}
$('properties-refresh').onclick=()=>busy($('properties-refresh'),async()=>{try{await loadProperties()}catch(e){say('pilot-status',e.message)}});
function selectedIndices(){return [...$('pilot-checklist').querySelectorAll('input:checked')].map(x=>Number(x.dataset.propertyIndex))}
function updateCount(){say('pilot-count',selectedIndices().length+' selected')}
$('pilot-checklist').onchange=updateCount;
$('pilot-select-all').onclick=()=>{$('pilot-checklist').querySelectorAll('input').forEach(x=>{if(x.closest('label').style.display!=='none')x.checked=true});updateCount()};
$('pilot-clear-all').onclick=()=>{$('pilot-checklist').querySelectorAll('input').forEach(x=>x.checked=false);updateCount()};
function importMany(items){
 if(!items.length){say('pilot-status','No properties found. Add a property in the Properties tab.');return;}
 const ready=items.filter(p=>p.tenant&&String(p.tenant).trim());
 const skipped=items.length-ready.length;
 if(!ready.length){say('pilot-status','No selected properties have a notice recipient yet. Add notice addressees to those properties before creating notices.');say('cloud-status','No notices imported: verified notice recipients are missing.');return;}
 if(!confirm('Create or refresh '+ready.length+' notices'+(skipped?'? '+skipped+' vacant/unverified properties will be skipped.':'?')+' Existing linked notices keep their charges. Verify all addressees, landlords, dates and balances.'))return;
 post({type:'oaktown-import-properties',properties:ready.map(p=>({id:p.id,street:[p.street_address,p.unit].filter(Boolean).join(' '),cityline:p.city+', '+p.state+' '+p.postal_code,tenant:p.tenant,owner:p.landlord_entity||''}))});
 say('cloud-status','Loading '+ready.length+' properties into notices'+(skipped?' · '+skipped+' without addressees skipped':'')+'…');
 showWorkflow('notices');showTab('notices');
}
$('pilot-load').onclick=()=>{const i=$('pilot-property').value;importMany(i===''?[]:[records[Number(i)]])};
$('pilot-load-selected').onclick=()=>importMany(selectedIndices().map(i=>records[i]));
$('pilot-load-all').onclick=()=>importMany(records);
const propKeys=['street_address','unit','city','state','postal_code','landlord_entity','tenant'];
function newProperty(){editing=null;$('property-form').reset();$('prop-state').value='KY';say('property-editor-title','Add property');say('property-status','');}
$('property-new').onclick=()=>{newProperty();$('prop-street_address').focus();};
function openPropertyEditor(i){
 const source=records[Number(i)];if(!source){say('pilot-status','Select a property to edit.');return;}
 editing={...source};$('pilot-search').value='';filterProperties();
 $('pilot-property').value=String(records.findIndex(p=>p.id===source.id));
 for(const key of propKeys)$('prop-'+key).value=editing[key]||'';
 say('property-editor-title','Edit property');say('property-status','');$('property-editor').scrollIntoView({behavior:'smooth',block:'start'});
}
$('property-edit').onclick=()=>{const i=$('pilot-property').value;if(i===''){say('pilot-status','Select a property to edit.');return;}openPropertyEditor(i)};
$('property-form').onsubmit=async event=>{
 event.preventDefault();if(!requireUser())return;
 await busy($('property-save'),async()=>{
  const userId=cloud.user.id;const p_data=Object.fromEntries(propKeys.map(k=>[k,$('prop-'+k).value.trim()]));p_data.state=p_data.state.toUpperCase();
  try{
   say('property-status','Saving property…');
   const result=await cloud.api('/rest/v1/rpc/save_property',{method:'POST',body:JSON.stringify({p_id:editing?.id||null,p_expected_updated_at:editing?.updated_at||null,p_data})});
   if(cloud.user?.id!==userId)return;
   editing={...result.property,tenant:result.notice_addressee_text};say('property-editor-title','Edit property');
   $('pilot-search').value='';await loadProperties();
   const savedIndex=records.findIndex(p=>p.id===editing.id);
   if(savedIndex>=0)$('pilot-property').value=String(savedIndex);
   say('property-status','Saved to shared property records. It will be available for future notice drafts once a recipient is verified.');
  }catch(e){say('property-status',e.code==='23505'?'This address already exists. Select and edit its existing record. Separate units at one address are not supported yet.':e.message);}
 });
};
$('copy-message').onclick=async()=>{const box=$('tenant-message-text');try{await navigator.clipboard.writeText(box.value);say('message-copy-status','Copied. Paste the message into TurboTenant or email.');}catch{box.focus();box.select();say('message-copy-status','Text selected. Use your device’s Copy command.');}};
$('batch-title').oninput=cloudDirty;
$('cloud-save').onclick=async()=>{
 if(!requireUser())return;
 await batchOperation(async()=>{
  try{
   const {payload}=await frameRequest('oaktown-workspace-request'),atRevision=revision,userId=cloud.user.id;
   const title=$('batch-title').value.trim();if(!title)throw Error('Give this notice batch a name before saving.');
   say('cloud-status','Syncing to cloud…');
   const saved=await cloud.api('/rest/v1/rpc/save_notice_batch',{method:'POST',body:JSON.stringify({p_id:cloudBatch?.id||null,p_expected_version:cloudBatch?.version||null,p_title:title,p_payload:payload})});
   if(cloud.user?.id!==userId)return;
   cloudBatch=saved;rememberBatch();
   say('cloud-status',revision===atRevision?'Synced to cloud · '+timeLabel()+' · '+title:'Earlier snapshot synced · newer edits still saved locally. Save to cloud again.');
  }catch(e){say('cloud-status',e.message);}
 });
};
$('cloud-open').onclick=async()=>{
 if(!requireUser())return;
 await batchOperation(async()=>{
 $('batch-dialog').showModal();$('cloud-load').disabled=true;say('batch-status','Loading saved batches…');
 try{
  const userId=cloud.user.id,rows=await cloud.api('/rest/v1/notice_batches?select=id,title,version,updated_at&order=updated_at.desc');
  if(cloud.user?.id!==userId)return;
  $('cloud-batches').replaceChildren(...rows.map(x=>new Option(x.title+' · '+new Date(x.updated_at).toLocaleDateString(),x.id)));
  $('cloud-load').disabled=!rows.length;say('batch-status',rows.length?'Choose a batch to open.':'No cloud batches yet. Save your current batch first.');
 }catch(e){say('batch-status',e.message);}
 });
};
$('batch-close').onclick=()=>$('batch-dialog').close();
$('cloud-undo').onclick=async()=>{
 if(!preOpenUndo)return;
 const backup=preOpenUndo;
 await busy($('cloud-undo'),async()=>{
  try{
   await frameRequest('oaktown-workspace-load',{payload:backup.payload});
   cloudBatch=backup.cloudBatch;
   $('batch-title').value=backup.title;saveLocalTitle();
   if(cloudBatch)rememberBatch();else localStorage.removeItem(META);
   preOpenUndo=null;$('undo-batch').hidden=true;
   showWorkflow('notices');showTab('notices');
   say('cloud-status','Previous local batch restored · '+timeLabel()+'. Save to cloud to sync if needed.');
  }catch(e){say('cloud-status','Could not undo opening the batch: '+e.message)}
 });
};
$('cloud-load').onclick=()=>batchOperation(async()=>{
 try{
  const id=$('cloud-batches').value;if(!id)return;
  if(!confirm('Replace this browser batch with the saved batch? Unsaved local changes will be replaced.'))return;
  const userId=cloud.user?.id,rows=await cloud.api('/rest/v1/notice_batches?id=eq.'+encodeURIComponent(id)+'&select=*');
  if(cloud.user?.id!==userId)return;
  if(rows.length!==1)throw Error('This saved batch is no longer available.');
  const saved=rows[0];const old=await frameRequest('oaktown-workspace-request');const backup={payload:old.payload,title:$('batch-title').value,cloudBatch:cloudBatch?{...cloudBatch}:null};await frameRequest('oaktown-workspace-load',{payload:saved.payload});
  cloudBatch={id:saved.id,version:saved.version};$('batch-title').value=saved.title;saveLocalTitle();rememberBatch();preOpenUndo=backup;$('undo-batch').hidden=false;$('batch-dialog').close();showWorkflow('notices');showTab('notices');say('cloud-status','Opened cloud batch · '+saved.title+' · previous local batch can be restored.');
 }catch(e){say('batch-status',e.message);}
});
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==frame.contentWindow||!event.data)return;
 const message=event.data;
 if(message.requestId&&pending.has(message.requestId)){const p=pending.get(message.requestId);clearTimeout(p.timer);pending.delete(message.requestId);message.type.endsWith('-error')?p.reject(Error(message.message)):p.resolve(message);}
 if(message.type==='oaktown-studio-size'){const h=Number(message.height);if(Number.isFinite(h)&&h>=700&&h<=30000)frame.style.height=Math.ceil(h+15)+'px';}
 if(message.type==='oaktown-workspace-changed')cloudDirty();
 if(message.type==='oaktown-import-confirmed')say('cloud-status',(message.added||0)+' new notices · '+(message.updated||0)+' refreshed. Review the details, then save the batch.');
 if(message.type==='oaktown-tenant-message'&&tab==='message'){
  selectedMessage={noticeId:String(message.noticeId||''),sourceUnitId:String(message.sourceUnitId||''),recipient:String(message.recipient||'')};
  const issues=Array.isArray(message.issues)?message.issues:[];
  $('tenant-message-text').value=String(message.content||'');
  $('copy-message').disabled=!!issues.length||!message.content;
  $('message-checks').hidden=!issues.length;
  say('message-checks',issues.length?'Complete the selected notice: '+issues.join(' '):'');
  say('message-copy-status',issues.length?'':'Ready to copy · '+(message.recipient||'Selected tenant'));
  updateTenantEmail();
 }
});
frame.addEventListener('load',()=>{if(workflow==='notices')showTab(tab)});
try{const previousTitle=localStorage.getItem(LOCAL_TITLE);if(previousTitle&&previousTitle.length<=120)$('batch-title').value=previousTitle}catch{}
cloud.start().catch(e=>{say('pilot-auth-status',e.message);$('staff-access').hidden=false;document.body.classList.add('ops-signed-out')});
})();