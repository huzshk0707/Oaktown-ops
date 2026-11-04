/* Connected workspace. Staff-only reads; private records live only in memory. */
(()=>{'use strict';
const cloud=window.OpsCloud,M=window.OpsOperationsModel,T=window.OpsTodayModel,$=id=>document.getElementById(id);
if(!cloud||!M||!$('today-workflow'))return;
const el=(tag,value,cls)=>{const n=document.createElement(tag);if(value!=null)n.textContent=String(value);if(cls)n.className=cls;return n};
const button=(label,fn,cls='button')=>{const b=el('button',label,cls);b.type='button';b.onclick=fn;return b};
const date=d=>T.validDate(d)?new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z')):'Not recorded';
const endpoints={
 properties:'properties?select=id,portfolio_id,street_address,city,state,postal_code,portfolio_state',
 units:'units?select=id,property_id,unit_code,unit_label,unit_class,occupancy_status,managed_by,verification_status',
 leases:'leases?select=id,unit_id,tenancy_id,source_lease_key,lease_label,term_start,term_end,lease_status,verification_status',
 people:'people?select=id,display_name,phone,email,contact_verification',
 parties:'tenancy_people?select=id,tenancy_id,person_id',
 renewals:'renewal_cases?select=id,property_id,unit_id,lease_id,oak_record_id,recorded_end,is_applicable,action_status,next_action,action_owner_label',
 tasks:'ops_tasks?select=id,task_title,status,priority,due_at,intake_details,assigned_label,assigned_user_id,property_id,unit_id,lease_id,renewal_case_id,notes,workflow_key,updated_at,completed_at,archived_at',
 rents:'rent_schedules?select=id,lease_id,amount_usd,billing_period,effective_from,effective_to,rent_kind,verification_status,source_reference',
 events:'ops_events?select=id,entity_type,entity_id,event_type,actor_id,occurred_at,summary,event_metadata',
 documents:'lease_reference_documents?select=id,source_name,drive_file_id,page_count,received_at,sha256,reference_notes'
};
const optional=new Set(['rents','events','documents']);
let records=null,entries=[],generation=0,pending=null,owner=null,error='',filter='all',shown=25,active=-1,paletteRows=[],lastFocus=null,profileKey=null,canEdit=false;
const pref='oaktown-action-filter-v1',densityKey='oaktown-density-v1';
try{const saved=localStorage.getItem(pref);if(M.filters.includes(saved))filter=saved}catch{}
function navigate(name,tab){window.OpsWorkspace?.navigate(name,tab)}
function text(id,value){$(id).textContent=value}
function savePref(key,value){try{localStorage.setItem(key,value)}catch{}}

const toolbar=el('div',null,'operations-toolbar');
toolbar.append(button('Search / quick actions',openPalette,'button operations-search'),button('Comfortable',toggleDensity,'button operations-density'));
toolbar.firstChild.id='operations-search-open';toolbar.firstChild.setAttribute('aria-keyshortcuts','Control+k Meta+k');
toolbar.lastChild.id='operations-density';toolbar.lastChild.setAttribute('aria-pressed','false');
$('today-workflow').before(toolbar);
function applyDensity(value){const compact=value==='compact';document.documentElement.dataset.opsDensity=compact?'compact':'comfortable';text('operations-density',compact?'Compact':'Comfortable');$('operations-density').setAttribute('aria-pressed',String(compact))}
function toggleDensity(){const value=document.documentElement.dataset.opsDensity==='compact'?'comfortable':'compact';applyDensity(value);savePref(densityKey,value)}
try{applyDensity(localStorage.getItem(densityKey))}catch{applyDensity('comfortable')}

const centre=el('details',null,'operations-centre today-card');centre.id='operations-centre';
centre.innerHTML='<div class="operations-section-head"><div><span class="operations-eyebrow">YOUR WORK, CONNECTED</span><h3 id="operations-title" tabindex="-1">Action Centre</h3><p>Saved tasks and renewal follow-ups, with their source records.</p></div><div class="operations-head-actions"><button type="button" class="button" id="operations-documents-open">Reference library</button><button type="button" class="button" id="operations-refresh">Refresh records</button></div></div><div id="operations-coverage" class="operations-coverage"></div><div class="operations-filters"><label>Show <select id="operations-filter"><option value="all">All active work</option><option value="overdue">Overdue tasks</option><option value="today">Due today</option><option value="waiting">Waiting / on hold</option><option value="undated">Tasks without dates</option><option value="renewals">Renewal follow-ups</option><option value="maintenance">Maintenance tasks</option></select></label><button type="button" class="button" id="operations-save-filter">Save this view</button><span id="operations-filter-status" role="status"></span></div><p id="operations-status" role="status"></p><div id="operations-queue"></div><button type="button" class="button" id="operations-more" hidden>Show 25 more</button>';
const centreSummary=el('summary','Action Centre · saved tasks and renewal follow-ups');centre.prepend(centreSummary);
$('today-kpis').after(centre);$('operations-filter').value=filter;
$('operations-filter').onchange=()=>{filter=$('operations-filter').value;shown=25;text('operations-filter-status','');renderCentre()};
$('operations-save-filter').onclick=()=>{savePref(pref,filter);text('operations-filter-status','View saved on this device.')};
$('operations-more').onclick=()=>{shown+=25;renderCentre()};
$('operations-refresh').onclick=()=>refresh(true);
$('operations-documents-open').onclick=()=>openProfile('library','library');

const palette=el('dialog');palette.id='operations-search-dialog';palette.className='operations-dialog';palette.setAttribute('aria-labelledby','operations-search-title');
palette.innerHTML='<div class="operations-dialog-head"><h2 id="operations-search-title">Find a record or take an action</h2><button type="button" class="button" data-close>Close</button></div><label class="operations-search-label" for="operations-query">Search properties, units, people, leases, tasks and references</label><input id="operations-query" type="search" autocomplete="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="operations-results"><p id="operations-search-status" role="status"></p><div id="operations-results" role="listbox" aria-label="Search results and quick actions"></div><p class="operations-hint">↑ ↓ to choose · Enter to open · Esc to close</p>';
document.body.append(palette);palette.querySelector('[data-close]').onclick=()=>palette.close();
palette.addEventListener('close',()=>{$('operations-query').value='';$('operations-results').replaceChildren();paletteRows=[];if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true})});
const profile=el('dialog');profile.id='operations-profile-dialog';profile.className='operations-dialog operations-profile';profile.setAttribute('aria-labelledby','operations-profile-title');
profile.innerHTML='<div class="operations-dialog-head"><div><span id="operations-profile-kind" class="operations-eyebrow"></span><h2 id="operations-profile-title" tabindex="-1"></h2></div><button type="button" class="button" data-close>Close</button></div><div id="operations-profile-content"></div>';
document.body.append(profile);profile.querySelector('[data-close]').onclick=()=>profile.close();
profile.addEventListener('close',()=>{if(profile.open)return;profileKey=null;$('operations-profile-content').replaceChildren();text('operations-profile-title','');text('operations-profile-kind','')});

async function readAll(endpoint,ticket){
 const out=[];
 for(let offset=0;offset<100000;offset+=1000){
  const page=await cloud.api('/rest/v1/'+endpoint+'&order=id.asc&limit=1000&offset='+offset);
  if(ticket!==generation||!cloud.user)throw Error('Session changed');
  if(!Array.isArray(page))throw Error('Unexpected saved-record response');
  out.push(...page);if(page.length<1000)return out;
 }
 throw Error('Record limit reached; narrow the data scope before loading more.');
}
function invalidate(){
 generation++;pending=null;records=null;entries=[];error='';canEdit=false;profileKey=null;
 $('operations-queue').replaceChildren();$('operations-coverage').replaceChildren();$('operations-results').replaceChildren();$('operations-query').value='';paletteRows=[];
 if(palette.open)palette.close();if(profile.open)profile.close();
 $('operations-profile-content').replaceChildren();text('operations-profile-title','');text('operations-profile-kind','');renderCentre();
}
async function refresh(force=false){
 if(!cloud.user){invalidate();return}
 if(pending&&!force)return pending;
 if(records&&!force)return records;
 const ticket=++generation,userId=cloud.user.id;error='';
 text('operations-status','Loading saved work…');if(palette.open)text('operations-search-status','Loading saved records…');
 const job=(async()=>{
  const result=await Promise.allSettled(Object.entries(endpoints).map(async([key,path])=>[key,await readAll(path,ticket)]));
  if(ticket!==generation||cloud.user?.id!==userId)return;
  const next={unavailable:[]};
  result.forEach((r,i)=>{const key=Object.keys(endpoints)[i];if(r.status==='fulfilled')next[key]=r.value[1];else if(optional.has(key)){next[key]=[];next.unavailable.push(key)}else throw Error('Saved '+key+' could not be loaded')});
  records=next;entries=M.searchIndex(records);renderCentre();if(palette.open)renderSearch();if(profile.open&&profileKey)renderProfile(...profileKey);
  window.dispatchEvent(new CustomEvent('ops-operations-data',{detail:records}));return records;
 })().catch(()=>{
  if(ticket!==generation)return;
  records=null;entries=[];error='Could not load saved records. Refresh to retry.';renderCentre();if(palette.open)renderSearch();if(profile.open){$('operations-profile-content').replaceChildren(el('p',error))}
 }).finally(()=>{if(ticket===generation)pending=null});
 pending=job;return job;
}
function tracking(){
 const R=window.OpsRenewalTrackingRules,result={};if(!R||!records||records.unavailable.includes('events'))return result;
 for(const r of records.renewals){const snapshot=R.snapshot(R.latest(records.events,r.id));if(snapshot)result[r.id]=snapshot}
 return result;
}
function sourceButton(kind,id,label){return button(label,()=>openSource(kind,id),'button operations-source')}
function renderCentre(){
 const host=$('operations-queue');host.replaceChildren();$('operations-more').hidden=true;$('operations-refresh').disabled=!cloud.user;
 if(!cloud.user){text('operations-status','Sign in to see saved work across your portfolio.');$('operations-coverage').replaceChildren();return}
 if(!records){text('operations-status',error||'Loading saved work…');$('operations-coverage').replaceChildren();return}
 const rows=M.actions(records,T.today(),tracking()),filtered=M.filterActions(rows,filter),maintenance=rows.filter(r=>r.kind==='task'&&r.workflow==='maintenance').length;
 const coverage=$('operations-coverage');coverage.replaceChildren();
 for(const [value,label] of [[maintenance,'Open maintenance tasks'],['Not tracked','Approvals'],['Guides only','Leads / applications']]){const metric=el('div');metric.append(el('strong',value),el('span',label));coverage.append(metric)}
 text('operations-status',filtered.length+' item'+(filtered.length===1?'':'s')+' in this view · '+rows.length+' active saved sources'+(records.unavailable.includes('events')?' · Journal unavailable; renewal statuses use imported records.':''));
 if(!filtered.length)host.append(el('p','No saved work matches this view.','operations-empty'));
 for(const a of filtered.slice(0,shown)){
  const row=el('article',null,'operations-action');row.dataset.group=a.group;
  const content=el('div',null,'operations-action-body'),meta=el('div',null,'operations-meta');
  const label=a.kind==='task'?a.status:window.OpsRenewalTrackingRules?.label(a.status)||a.status;
  meta.append(el('span',a.kind==='task'?'TASK':'RENEWAL','operations-badge'),el('span',a.kind==='renewal'&&!a.reported?'Imported · '+a.status:label));
  content.append(meta,el('h4',a.title),el('p',a.location,'operations-location'));
  if(a.next)content.append(el('p',a.next));
  const facts=[];if(a.schedule)facts.push(a.schedule.type+': '+date(a.schedule.date));else if(a.kind==='task')facts.push('No date assigned');
  if(a.kind==='renewal'&&a.row.recorded_end)facts.push('Recorded lease end: '+date(a.row.recorded_end));if(a.owner)facts.push('Owner: '+a.owner);
  if(facts.length)content.append(el('p',facts.join(' · '),'operations-meta'));
  const actions=el('div',null,'operations-row-actions');actions.append(sourceButton(a.kind,a.id,a.kind==='task'?(canEdit?'Review task':'View task'):'Open renewal'));
  if(a.row.unit_id)actions.append(sourceButton('unit',a.row.unit_id,'Unit profile'));else if(a.row.property_id)actions.append(sourceButton('property',a.row.property_id,'Property profile'));
  row.append(content,actions);host.append(row);
 }
 $('operations-more').hidden=filtered.length<=shown;
}
const quick=[
 ['Open Action Centre','actions'],['Review task intake','tasks',null,'task-json'],['Draft a notice','notices'],['Prepare a renewal','leases','prepare'],['Prepare a new lease','leases','new'],['Browse properties','properties'],['Open reference library','library']
];
async function openPalette(){
 if(document.querySelector('dialog[open]'))return;
 lastFocus=document.activeElement;palette.showModal();$('operations-query').focus();renderSearch();if(cloud.user)await refresh();if(palette.open)renderSearch();
}
function renderSearch(){
 const host=$('operations-results'),query=$('operations-query').value.trim();host.replaceChildren();paletteRows=[];active=-1;$('operations-query').removeAttribute('aria-activedescendant');
 const commands=quick.filter(q=>!query||q[0].toLowerCase().includes(query.toLowerCase())).map(q=>({title:q[0],detail:'Quick action',run:()=>{if(q[1]==='library')openProfile('library','library');else if(q[1]==='actions'){navigate('today');centre.open=true;$('operations-title').focus()}else{navigate(q[1],q[2]);if(q[3])$(q[3])?.focus()}}}));
 const found=records?M.search(entries,query):[];
 const rows=[...commands,...found.map(r=>({...r,detail:r.kind+' · '+r.detail,run:()=>openSource(r.kind,r.id)}))];
 text('operations-search-status',!cloud.user?'Sign in to search private records. Quick actions open the existing workflows.':error||(!records?'Loading saved records…':query?(found.length===30?'Showing the first 30 matching records. Refine your search.':found.length+' matching records.'):'Search your saved records, or choose a quick action.'));
 rows.forEach((r,i)=>{
  const b=button('',()=>{palette.close();r.run()},'operations-result');b.id='operations-result-'+i;b.setAttribute('role','option');b.setAttribute('aria-selected','false');b.tabIndex=-1;b.append(el('strong',r.title),el('span',r.detail));host.append(b);paletteRows.push(b);
 });
 if(!rows.length)host.append(el('p','No matches. Try an address, unit code, name or task title.','operations-empty'));
}
$('operations-query').addEventListener('input',renderSearch);
$('operations-query').addEventListener('keydown',e=>{
 if(!['ArrowDown','ArrowUp','Enter'].includes(e.key)||!paletteRows.length)return;e.preventDefault();
 if(e.key==='Enter'){if(active>=0)paletteRows[active].click();return}
 active=active<0?(e.key==='ArrowDown'?0:paletteRows.length-1):(active+(e.key==='ArrowDown'?1:paletteRows.length-1))%paletteRows.length;
 paletteRows.forEach((b,i)=>b.setAttribute('aria-selected',String(i===active)));$('operations-query').setAttribute('aria-activedescendant',paletteRows[active].id);paletteRows[active].scrollIntoView({block:'nearest'});
});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&!e.altKey){if(palette.open){e.preventDefault();palette.close()}else if(!document.querySelector('dialog[open]')){e.preventDefault();openPalette()}}});

async function openSource(kind,id){
 if(!cloud.user){$('account-button').click();return}
 if(kind==='renewal'){
  const userId=cloud.user.id;if(profile.open)profile.close();navigate('leases','track');const ok=await window.OpsPortfolio?.openRenewal(id);
  if(cloud.user?.id!==userId)return;if(!ok)openProfile(kind,id);return;
 }
 if(kind==='task'){
  const t=records?.tasks.find(t=>t.id===id&&!t.archived_at);if(!t)return;
  if(canEdit){
   const userId=cloud.user.id;if(profile.open)profile.close();navigate('today');await window.OpsToday?.refresh();
   if(cloud.user?.id!==userId)return;
   const data=window.OpsToday?.getData(),current=data?.tasks.find(t=>t.id===id&&!t.archived_at);
   if(data?.canEdit&&current)window.dispatchEvent(new CustomEvent('ops-today-edit',{detail:{task:current}}));else openProfile('task',id);
  }else openProfile('task',id);return;
 }
 openProfile(kind,id);
}
async function openProfile(kind,id){
 if(!cloud.user){$('account-button').click();return}
 if(palette.open)palette.close();profileKey=[kind,id];
 if(!profile.open)profile.showModal();text('operations-profile-title','Loading saved record…');$('operations-profile-content').replaceChildren();
 await refresh();if(profile.open&&profileKey?.[0]===kind&&profileKey?.[1]===id){renderProfile(kind,id);profile.scrollTop=0;$('operations-profile-title').focus({preventScroll:true})}
}
function section(host,title,collapsed=false){const s=el(collapsed?'details':'section',null,'operations-profile-section');s.append(el(collapsed?'summary':'h3',title));host.append(s);return s}
function fact(host,label,value){const p=el('p');p.append(el('strong',label+': '),document.createTextNode(String(value||'Not recorded')));host.append(p)}
function documentRow(d){const card=el('article',null,'operations-document');card.append(el('h4',d.source_name),el('p',(d.page_count||'?')+' pages · Received '+date(String(d.received_at||'').slice(0,10))));const url=M.driveUrl(d);if(url){const a=el('a','Open original in Drive','button');a.href=url;a.target='_blank';a.rel='noopener noreferrer';card.append(a)}return card}
function renderProfile(kind,id){
 const host=$('operations-profile-content');host.replaceChildren();text('operations-profile-kind',kind==='library'?'REFERENCE LIBRARY':kind.toUpperCase()+' RECORD');
 if(!records){text('operations-profile-title','Record unavailable');host.append(el('p',error||'Refresh records to retry.'));return}
 const i=M.index(records);
 if(kind==='library'){
  text('operations-profile-title','Lease reference library');host.append(el('p','Original reference files in private Drive. These are not automatically linked to a current tenancy, verified condition or signed lease. Drive permissions are checked separately.'));
  if(records.unavailable.includes('documents'))host.append(el('p','The reference catalog could not be loaded. Refresh records to retry.'));
  else if(!records.documents.length)host.append(el('p','No reference files are cataloged.'));
  for(const d of records.documents)host.append(documentRow(d));return;
 }
 if(kind==='document'){
  const d=records.documents.find(d=>d.id===id);text('operations-profile-title',d?.source_name||'Reference unavailable');if(d){host.append(documentRow(d));fact(host,'Reference use','Original source only; confirm any terms against the current case.');fact(host,'SHA-256',d.sha256)}return;
 }
 if(kind==='person'){
  const p=i.people.get(id);text('operations-profile-title',p?.display_name||'Person unavailable');if(!p)return;
  fact(host,'Email',p.email);fact(host,'Phone',p.phone);fact(host,'Contact verification',p.contact_verification);
  const tenancyIds=new Set(records.parties.filter(x=>x.person_id===id).map(x=>x.tenancy_id));const leases=records.leases.filter(l=>l.tenancy_id&&tenancyIds.has(l.tenancy_id));
  const linked=section(host,'Source-linked leases');linked.append(el('p','These links do not establish current occupancy.'));
  for(const l of leases)linked.append(sourceButton('lease',l.id,(l.lease_label||'Lease')+' · '+M.location(l,i)));
  if(!leases.length)linked.append(el('p','No lease is linked to this person.'));return;
 }
 if(kind==='task'){
  const t=i.tasks.get(id);text('operations-profile-title',t?.task_title||'Task unavailable');if(!t)return;
  fact(host,'Status',t.status);fact(host,'Scope',M.location(t,i));fact(host,'Owner',t.assigned_label);fact(host,'Next action',t.intake_details?.next_action);fact(host,'Notes',t.notes);
  const schedule=T.scheduled(t);fact(host,schedule?.type||'Due / follow-up',schedule?date(schedule.date):'No date assigned');
  if(t.unit_id)host.append(sourceButton('unit',t.unit_id,'Open unit profile'));else if(t.property_id)host.append(sourceButton('property',t.property_id,'Open property profile'));return;
 }
 if(kind==='renewal'){
  const r=i.renewals.get(id);text('operations-profile-title',r?.oak_record_id||'Renewal unavailable');if(!r)return;
  const update=tracking()[id];fact(host,'Scope',M.location(r,i));fact(host,'Imported action status',r.action_status);
  if(update)fact(host,'Staff journal status',window.OpsRenewalTrackingRules.label(update.status));
  fact(host,'Next action',update?update.nextAction:r.next_action);fact(host,'Owner',r.action_owner_label);fact(host,'Recorded lease end',date(r.recorded_end));
  host.append(el('p','The renewal tracker could not open this record. This read-only summary uses the connected saved records. Refresh the originating workflow before editing.'),sourceButton('renewal',id,'Retry opening renewal tracker'));return;
 }
 if(kind==='lease'){
  const l=i.leases.get(id);text('operations-profile-title',l?.lease_label||l?.source_lease_key||'Lease unavailable');if(!l)return;
  fact(host,'Scope',M.location(l,i));fact(host,'Recorded status',l.lease_status);fact(host,'Verification',l.verification_status);fact(host,'Recorded start',date(l.term_start));fact(host,'Recorded end',date(l.term_end));
  host.append(el('p','A saved status or generated PDF is not independent proof of execution.'));
  const linked=section(host,'Source-linked people · verify occupancy');const personIds=new Set(records.parties.filter(p=>p.tenancy_id===l.tenancy_id&&l.tenancy_id).map(p=>p.person_id));
  for(const personId of personIds){const p=i.people.get(personId);if(p)linked.append(sourceButton('person',p.id,p.display_name||'Person'))}
  if(!personIds.size)linked.append(el('p','No people are linked to this lease.'));host.append(sourceButton('unit',l.unit_id,'Open unit profile'));return;
 }
 if(kind!=='unit'&&kind!=='property'){text('operations-profile-title','Source unavailable');host.append(el('p','Refresh the originating workflow and retry.'));return}
 const s=M.scope(records,kind,id),record=kind==='unit'?s.unit:s.prop;
 if(!record){text('operations-profile-title','Record unavailable');return}
 text('operations-profile-title',kind==='property'?s.prop.street_address:M.location({unit_id:id},i));
 const summary=section(host,'Overview');fact(summary,'Property',s.prop?.street_address);fact(summary,'Lifecycle',s.prop?.portfolio_state);
 if(s.unit){fact(summary,'Unit code',s.unit.unit_code);fact(summary,'Occupancy (recorded)',s.unit.occupancy_status);fact(summary,'Verification',s.unit.verification_status);summary.append(sourceButton('property',s.prop.id,'View property and all units'))}
 else{const units=section(host,'Units ('+s.units.length+')');for(const u of s.units)units.append(sourceButton('unit',u.id,[u.unit_label,u.unit_code,u.occupancy_status].filter(Boolean).join(' · ')));if(!s.units.length)units.append(el('p','No units are linked.'))}
 const leases=section(host,'Lease history ('+s.leases.length+')');
 for(const l of s.leases){const row=el('div',null,'operations-history-row');row.append(sourceButton('lease',l.id,l.lease_label||l.source_lease_key||'Lease'),el('p',[l.lease_status,'Start '+date(l.term_start),'End '+date(l.term_end),'Verification: '+(l.verification_status||'not recorded')].join(' · ')));leases.append(row)}
 if(!s.leases.length)leases.append(el('p','No lease record is linked. This does not establish vacancy.'));
 const rents=section(host,'Recorded rent schedules');
 if(records.unavailable.includes('rents'))rents.append(el('p','Rent schedules could not be loaded.'));
 else if(!s.rents.length)rents.append(el('p','No rent schedule is linked. Offers are not shown as contracted rent.'));
 for(const r of s.rents)fact(rents,i.leases.get(r.lease_id)?.lease_label||'Lease schedule',new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(r.amount_usd)+' / '+r.billing_period+' · '+r.rent_kind+' · '+date(r.effective_from)+' to '+date(r.effective_to)+' · '+r.verification_status);
 const work=section(host,'Related work');
 for(const t of s.tasks)work.append(sourceButton('task',t.id,(t.task_title||'Task')+' · '+t.status));
 for(const r of s.renewals)work.append(sourceButton('renewal',r.id,(r.oak_record_id||'Renewal')+' · '+r.action_status));
 if(!s.tasks.length&&!s.renewals.length)work.append(el('p','No saved tasks or renewal cases are linked.'));
 const activity=section(host,'Activity timeline',true);activity.append(el('p','Saved staff journal, including historical imports. Verify signing, delivery and payment against original evidence.'));
 if(records.unavailable.includes('events'))activity.append(el('p','Activity could not be loaded. Refresh records to retry.'));
 else if(!s.events.length)activity.append(el('p','No saved journal entries are linked to this scope.'));
 for(const e of s.events.slice(0,100)){
  const row=el('article',null,'operations-history-row'),when=new Date(e.occurred_at);
  row.append(el('strong',e.summary||e.event_type),el('p',Number.isNaN(when.getTime())?'Journal time not recorded':when.toLocaleString('en-US',{timeZone:T.ZONE,dateStyle:'medium',timeStyle:'short'})+' ET'));
  if(T.validDate(e.event_metadata?.activity?.work_date))fact(row,'Reported work date',date(e.event_metadata.activity.work_date));
  fact(row,'Recorded staff ID',e.actor_id||'Not recorded');fact(row,'Source',e.entity_type+' · '+e.entity_id);
  const sourceKind={renewal_case:'renewal',ops_task:'task',task:'task',lease:'lease',unit:'unit',property:'property'}[e.entity_type];if(sourceKind)row.append(sourceButton(sourceKind,e.entity_id,'Open source record'));activity.append(row);
 }
 if(s.events.length>100)activity.append(el('p','Showing the latest 100 entries.'));
 const coverage=section(host,'Other records');coverage.append(el('p','Notices and generated drafts remain in their existing workflows. Reference files have no verified property/unit associations yet. Maintenance tasks appear under Related work; a work-order and approval system is not tracked.'));
 coverage.append(button('Browse reference library',()=>openProfile('library','library')));
}
window.addEventListener('ops-auth-change',e=>{const id=e.detail?.user?.id||null;if(id!==owner){owner=id;invalidate();if(id)refresh()}});
window.addEventListener('ops-today-data',e=>{canEdit=!!e.detail?.canEdit;if(records)renderCentre()});
for(const event of ['ops-today-refresh','ops-task-archive-change','ops-renewal-tracking-change'])window.addEventListener(event,()=>{if(cloud.user)refresh(true)});
window.addEventListener('ops-unit-selected',e=>{
 const host=$('ops-portfolio-detail');if(!host||host.querySelector('.operations-connected-profile'))return;
 const b=button('Open connected unit profile',()=>openProfile('unit',e.detail.id),'button operations-connected-profile');host.append(b);
});
window.OpsOperations={openSearch:openPalette,openProfile,refresh};
owner=cloud.user?.id||null;renderCentre();if(owner)refresh();
})();
