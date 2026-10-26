
(()=>{'use strict';
const $=id=>document.getElementById(id),cloud=window.OpsCloud,frame=$('studio-frame');
let workflow='notices',tab='notices',records=[],editing=null,context=null,courtDirty=false,revision=0,cloudBatch=null,currentUser=null,propertyLoad=0;
const courtKeys=['reference','courtDate','courtTime','timezone','reminderDate','owner','notes'];
const pending=new Map(),META='oaktown-batch-meta-v04';
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
function cloudDirty(){revision++;say('cloud-status',cloud.user?'Changes saved in this browser · use Save to Supabase for a cloud copy.':'Local draft · sign in to save a cloud copy.');}
function showWorkflow(name){
 if(courtDirty&&workflow==='notices'&&tab==='court'&&name!=='notices'&&!confirm('Leave without saving these follow-up edits?'))return;
 if(name!==workflow)courtDirty=false;
 workflow=name;
 document.querySelectorAll('[data-workspace]').forEach(b=>{const on=b.dataset.workspace===name;b.classList.toggle('active',on);on?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current')});
 $('notices-workflow').hidden=name!=='notices';$('properties-workflow').hidden=name!=='properties';$('leads-workflow').hidden=name!=='leads';$('future-workflow').hidden=['notices','properties','leads'].includes(name);
 const titles={notices:'Notices',properties:'Properties',leads:'Lead Copilot',leases:'Leases & renewals',listings:'Listings',maintenance:'Maintenance'};
 const descriptions={notices:'Prepare the notice, communicate with the tenant, and keep court follow-ups together.',properties:'One shared property directory. Import records into notices and save property changes to Supabase.',leads:'Review Leslie-style responses with fictional scenarios. Live applicant screening is not enabled.',leases:'Lease generation and renewal preparation will live here.',listings:'Property descriptions and listing preparation will live here.',maintenance:'Maintenance requests, assignments and follow-up tasks will live here.'};
 say('workspace-title',titles[name]);say('breadcrumb',titles[name]);say('workspace-summary',descriptions[name]);
 if(!['notices','properties','leads'].includes(name)){say('future-title',titles[name]);say('future-description',descriptions[name]);}
 if(name==='notices')showTab(tab);
}
function showTab(next){
 if(courtDirty&&tab==='court'&&next!==tab&&!confirm('Leave without saving these follow-up edits?'))return;
 if(next!==tab)courtDirty=false;
 tab=next;
 document.querySelectorAll('[data-notice-tab]').forEach(b=>{const on=b.dataset.noticeTab===tab;b.classList.toggle('active',on);on?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current')});
 $('generator-area').hidden=tab!=='notices';$('message-area').hidden=tab!=='message';$('court-area').hidden=tab!=='court';
 if(tab==='notices')post({type:'oaktown-view',view:'notices'});
 if(tab==='message'){ $('copy-message').disabled=true;say('message-copy-status','Loading selected notice…');post({type:'oaktown-tenant-message-request'});}
 if(tab==='court')post({type:'oaktown-context-request'});
}
document.querySelectorAll('[data-workspace]').forEach(b=>b.addEventListener('click',()=>showWorkflow(b.dataset.workspace)));
document.querySelectorAll('[data-notice-tab]').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.noticeTab)));
$('open-properties').onclick=$('future-properties').onclick=()=>showWorkflow('properties');
$('account-button').onclick=$('properties-signin').onclick=account;
$('account-close').onclick=()=>$('account-dialog').close();
$('pilot-auth').onsubmit=async event=>{event.preventDefault();await busy($('pilot-login'),async()=>{try{say('pilot-auth-status','Signing in…');await cloud.signIn($('pilot-email').value.trim(),$('pilot-password').value);$('pilot-password').value='';$('account-dialog').close();say('pilot-auth-status','');}catch(e){say('pilot-auth-status',e.message);}})};
$('pilot-logout').onclick=()=>busy($('pilot-logout'),()=>cloud.signOut());
window.addEventListener('ops-auth-change',event=>{
 const user=event.detail.user,changed=currentUser!==user?.id;currentUser=user?.id||null;
 $('pilot-auth').hidden=!!user;$('account-signed-in').hidden=!user;$('properties-locked').hidden=!!user;
 $('pilot-properties').hidden=!user;$('property-editor').hidden=!user;
 say('account-label',user?'Signed in':'Sign in');document.querySelector('#account-button .account-dot')?.classList?.toggle('online',!!user);
 say('account-close',user?'Return to workspace':'Continue with local drafts');say('account-email',user?.email||'');
 if(event.detail.error)say('pilot-auth-status',event.detail.error);
 if(!user){
  propertyLoad++;records=[];editing=null;cloudBatch=null;$('pilot-property').replaceChildren();$('pilot-checklist').replaceChildren();$('cloud-batches').replaceChildren();$('property-form').reset();say('pilot-results','');say('pilot-status','');say('property-status','');$('batch-dialog').close();
  say('cloud-status','Local drafts remain on this browser. Sign in to reconnect to Supabase.');
 }else if(changed){
  try{const saved=JSON.parse(localStorage.getItem(META)||'null');if(saved?.owner===user.id){cloudBatch=saved;$('batch-title').value=saved.title||'Notice batch';}}catch{}
  newProperty();loadProperties().catch(e=>say('pilot-status',e.message));
  say('cloud-status','Connected · local changes are saved to Supabase when you choose Save.');
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
}
$('pilot-search').addEventListener('input',filterProperties);
async function loadProperties(){
 if(!cloud.user)return;const ticket=++propertyLoad;
 say('pilot-status','Loading properties…');
 const [props,people]=await Promise.all([cloud.api('/rest/v1/properties?select=id,street_address,unit,city,state,postal_code,landlord_entity,updated_at&order=street_address.asc'),cloud.api('/rest/v1/property_addressees?select=property_id,notice_addressee_text')]);
 if(ticket!==propertyLoad||!cloud.user)return;
 const peopleById=new Map(people.map(p=>[p.property_id,p.notice_addressee_text]));
 records=props.map(p=>({...p,tenant:peopleById.get(p.id)||''}));
 const list=$('pilot-checklist');list.replaceChildren();
 records.forEach((p,i)=>{const label=document.createElement('label');label.style.cssText='display:flex;gap:8px;align-items:center;padding:8px;border:1px solid #d6dfd2;border-radius:8px;font-size:13px';const check=document.createElement('input');check.type='checkbox';check.dataset.propertyIndex=String(i);check.style.width='auto';const name=document.createElement('span');name.textContent=[p.street_address,p.unit,p.postal_code].filter(Boolean).join(' ');label.append(check,name);list.append(label);});
 updateCount();say('pilot-load-all','Load all '+records.length+' properties');filterProperties();say('pilot-status','Property directory is up to date.');
}
$('properties-refresh').onclick=()=>busy($('properties-refresh'),async()=>{try{await loadProperties()}catch(e){say('pilot-status',e.message)}});
function selectedIndices(){return [...$('pilot-checklist').querySelectorAll('input:checked')].map(x=>Number(x.dataset.propertyIndex))}
function updateCount(){say('pilot-count',selectedIndices().length+' selected')}
$('pilot-checklist').onchange=updateCount;
$('pilot-select-all').onclick=()=>{$('pilot-checklist').querySelectorAll('input').forEach(x=>{if(x.closest('label').style.display!=='none')x.checked=true});updateCount()};
$('pilot-clear-all').onclick=()=>{$('pilot-checklist').querySelectorAll('input').forEach(x=>x.checked=false);updateCount()};
function importMany(items){
 if(!items.length){say('pilot-status','Select at least one property.');return;}
 if(items.some(p=>!p.tenant)){say('pilot-status','Every selected property needs a notice addressee. Edit the property first.');return;}
 if(!confirm('Load '+items.length+' properties into notices? Linked notices keep their charges. Verify landlord, addressee, dates and balances.'))return;
 post({type:'oaktown-import-properties',properties:items.map(p=>({id:p.id,street:[p.street_address,p.unit].filter(Boolean).join(' '),cityline:p.city+', '+p.state+' '+p.postal_code,tenant:p.tenant,owner:p.landlord_entity||''}))});
 showWorkflow('notices');showTab('notices');
}
$('pilot-load').onclick=()=>{const i=$('pilot-property').value;importMany(i===''?[]:[records[Number(i)]])};
$('pilot-load-selected').onclick=()=>importMany(selectedIndices().map(i=>records[i]));
$('pilot-load-all').onclick=()=>importMany(records);
const propKeys=['street_address','unit','city','state','postal_code','landlord_entity','tenant'];
function newProperty(){editing=null;$('property-form').reset();$('prop-state').value='KY';say('property-editor-title','Add property');say('property-status','');}
$('property-new').onclick=newProperty;
$('property-edit').onclick=()=>{const i=$('pilot-property').value;if(i===''){say('pilot-status','Select a property to edit.');return;}editing={...records[Number(i)]};for(const key of propKeys)$('prop-'+key).value=editing[key]||'';say('property-editor-title','Edit property');say('property-status','');$('property-editor').scrollIntoView({behavior:'smooth',block:'start'});};
$('property-form').onsubmit=async event=>{
 event.preventDefault();if(!requireUser())return;
 await busy($('property-save'),async()=>{
  const userId=cloud.user.id;const p_data=Object.fromEntries(propKeys.map(k=>[k,$('prop-'+k).value.trim()]));p_data.state=p_data.state.toUpperCase();
  try{
   say('property-status','Saving property…');
   const result=await cloud.api('/rest/v1/rpc/save_property',{method:'POST',body:JSON.stringify({p_id:editing?.id||null,p_expected_updated_at:editing?.updated_at||null,p_data})});
   if(cloud.user?.id!==userId)return;
   editing={...result.property,tenant:result.notice_addressee_text};say('property-editor-title','Edit property');say('property-status','Saved to Supabase.');
   await loadProperties();
  }catch(e){say('property-status',e.code==='23505'?'This address already exists. Select and edit its existing record. Separate units at one address are not supported yet.':e.message);}
 });
};
function fillCourt(value){context=value;say('court-notice',[value.tenant||'Unnamed tenant',value.street||'No address'].join(' · '));if(courtDirty)return;const c=value.court||{};for(const key of courtKeys)$('court-'+key).value=c[key]||'';for(const key of ['authorized','confirmed'])$('court-'+key).checked=c[key]===true;}
$('court-form').oninput=()=>{courtDirty=true;say('court-status','Unsaved follow-up changes.');};
async function saveCourt(){
 if(!context)throw Error('Select a notice first.');
 const court=Object.fromEntries(courtKeys.map(k=>[k,$('court-'+k).value.trim()]));court.authorized=$('court-authorized').checked;court.confirmed=$('court-confirmed').checked;
 if(court.confirmed&&(!court.authorized||!court.reference))throw Error('Record referral authorization and the attorney confirmation reference first.');
 if(court.courtDate&&!court.confirmed)throw Error('Record the attorney filing confirmation before adding a court date.');
 if(court.reminderDate&&court.courtDate&&court.reminderDate>court.courtDate)throw Error('The reminder date must be on or before the court date.');
 await frameRequest('oaktown-court-save',{noticeId:context.noticeId,court});courtDirty=false;say('court-status','Follow-up saved with this notice. Save the batch to Supabase for a cloud copy.');
}
$('court-form').onsubmit=async e=>{e.preventDefault();await busy($('court-save'),async()=>{try{await saveCourt()}catch(error){say('court-status',error.message)}})};
$('copy-message').onclick=async()=>{const box=$('tenant-message-text');try{await navigator.clipboard.writeText(box.value);say('message-copy-status','Copied. Paste the message into TurboTenant or email.');}catch{box.focus();box.select();say('message-copy-status','Text selected. Use your device’s Copy command.');}};
$('batch-title').oninput=cloudDirty;
$('cloud-save').onclick=async()=>{
 if(!requireUser())return;
 await batchOperation(async()=>{
  try{
   if(courtDirty)await saveCourt();
   const {payload}=await frameRequest('oaktown-workspace-request'),atRevision=revision,userId=cloud.user.id;
   const title=$('batch-title').value.trim();if(!title)throw Error('Give this notice batch a name before saving.');
   say('cloud-status','Saving to Supabase…');
   const saved=await cloud.api('/rest/v1/rpc/save_notice_batch',{method:'POST',body:JSON.stringify({p_id:cloudBatch?.id||null,p_expected_version:cloudBatch?.version||null,p_title:title,p_payload:payload})});
   if(cloud.user?.id!==userId)return;
   cloudBatch=saved;rememberBatch();
   say('cloud-status',revision===atRevision?'Saved to Supabase · '+title:'Saved the earlier snapshot. Newer edits are still local; save again.');
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
$('cloud-load').onclick=()=>batchOperation(async()=>{
 try{
  const id=$('cloud-batches').value;if(!id)return;
  if(!confirm('Replace this browser batch with the saved batch? Unsaved local changes will be replaced.'))return;
  const userId=cloud.user?.id,rows=await cloud.api('/rest/v1/notice_batches?id=eq.'+encodeURIComponent(id)+'&select=*');
  if(cloud.user?.id!==userId)return;
  if(rows.length!==1)throw Error('This saved batch is no longer available.');
  const saved=rows[0];await frameRequest('oaktown-workspace-load',{payload:saved.payload});
  courtDirty=false;cloudBatch={id:saved.id,version:saved.version};$('batch-title').value=saved.title;rememberBatch();$('batch-dialog').close();showWorkflow('notices');showTab('notices');say('cloud-status','Opened saved batch · '+saved.title);
 }catch(e){say('batch-status',e.message);}
});
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==frame.contentWindow||!event.data)return;
 const message=event.data;
 if(message.requestId&&pending.has(message.requestId)){const p=pending.get(message.requestId);clearTimeout(p.timer);pending.delete(message.requestId);message.type.endsWith('-error')?p.reject(Error(message.message)):p.resolve(message);}
 if(message.type==='oaktown-studio-size'){const h=Number(message.height);if(Number.isFinite(h)&&h>=700&&h<=30000)frame.style.height=Math.ceil(h+15)+'px';}
 if(message.type==='oaktown-notice-context'){if(context?.noticeId!==message.noticeId)courtDirty=false;fillCourt(message);}
 if(message.type==='oaktown-workspace-changed')cloudDirty();
 if(message.type==='oaktown-import-confirmed')say('cloud-status',(message.added||0)+' new notices · '+(message.updated||0)+' refreshed. Review the details, then save the batch.');
 if(message.type==='oaktown-tenant-message'&&tab==='message'){
  const issues=Array.isArray(message.issues)?message.issues:[];$('tenant-message-text').value=String(message.content||'');$('copy-message').disabled=!!issues.length||!message.content;$('message-checks').hidden=!issues.length;say('message-checks',issues.length?'Complete the selected notice: '+issues.join(' '):'');say('message-copy-status',issues.length?'':'Ready to copy · '+(message.recipient||'Selected tenant'));
 }
});
frame.addEventListener('load',()=>{post({type:'oaktown-context-request'});if(workflow==='notices')showTab(tab)});
cloud.start().then(()=>{if(!cloud.user)account()}).catch(e=>{account();say('pilot-auth-status',e.message)});
})();