/* Daily dashboard: OpsToday owns all task reads; OpsCloud owns the staff session. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),cloud=window.OpsCloud,store=window.OpsToday,M=window.OpsDailyModel,T=window.OpsTodayModel,W=window.OpsReviewedWrite;
 let day=T.today(),record=null,phase='idle',issue='',lastRefresh=null,ticket=0,lastLocalId=null,highlighted=new Set();
 const readable=()=>!!cloud.user&&store.getState()==='ready'&&!!store.getData();
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=String(text);if(cls)n.className=cls;return n};
 const stamp=value=>new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'short'}).format(new Date(value));
 const openTask=id=>window.OpsOperations.openSource('task',id);
 const last=node('span','No successful refresh','daily-last-refresh');last.id='daily-last-refresh';last.hidden=true;$('morning-command-date').after(last);
 $('daily-date').value=day;
 const returnToMorning=node('button','Morning Command Center','button');returnToMorning.type='button';returnToMorning.id='focus-return-morning';returnToMorning.onclick=()=>window.OpsWorkspace.navigate('morning');document.querySelector('.focus-board-tools').append(returnToMorning);
 const planner=$('morning-secondary');
 function plannerView(open){
  planner.open=open;syncPlannerView();
  (open?$('morning-plan-title'):$('daily-prepare')).focus({preventScroll:true});
 }
 $('daily-prepare').onclick=()=>plannerView(true);
 $('daily-overview').onclick=()=>plannerView(false);
 function syncPlannerView(){
  $('daily-prepare').hidden=planner.open;$('daily-overview').hidden=!planner.open;
  $('morning-workflow').classList.toggle('planning-open',planner.open);
 }
 planner.addEventListener('toggle',syncPlannerView);
 function readiness(taskState,access,stale){
  const signed=!!cloud.user,loading=signed&&(taskState==='loading'||phase==='loading');
  $('morning-workflow').dataset.loadState=!signed?'signed-out':stale?'error':loading?'loading':access?'ready':'idle';
  const states=[
   ['access',signed?'ready':'idle',signed?'Verified staff session':'Sign in to begin'],
   ['tasks',!signed?'idle':taskState==='loading'?'loading':access?'ready':'error',!signed?'Awaiting sign-in':taskState==='loading'?'Loading shared tasks':access?'Shared snapshot ready':'Unavailable · retry refresh'],
   ['sod',!signed?'idle':phase==='loading'?'loading':stale?'error':phase==='ready'?(record?'ready':'empty'):'idle',!signed?'Awaiting sign-in':phase==='loading'?'Reading approved SOD':stale?'Unavailable · retry refresh':phase==='ready'?(record?'Approved plan available':'No approved plan yet'):'Awaiting task snapshot']
  ];
  for(const [name,state,label] of states){$('daily-'+name+'-step').dataset.state=state;$('daily-'+name+'-state').textContent=label}
  $('daily-dashboard').setAttribute('aria-busy',String(loading));
 }
 function taskRow(task){
  const row=node('li',null,'daily-task'),copy=node('div'),button=node('button',(task.task_code?task.task_code+' · ':'')+task.task_title,'daily-task-title');button.type='button';button.onclick=()=>openTask(task.id);
  row.dataset.urgency=window.OpsFocusBoardModel.lane(task,day);
  copy.append(button,node('span',window.OpsFocusBoardModel.appearance(task,day).label+' · '+task.status+' · '+(task.assigned_label||task.assigned_user_id||'Unassigned'),'daily-task-meta'));
  const info=task.intake_details||{},next=info.blocked_reason||info.waiting_on||info.next_action;if(next)copy.append(node('p',next));
  const schedule=T.scheduled(task);if(schedule)copy.append(node('span',schedule.type+' · '+schedule.date,'daily-task-meta'));
  row.append(copy);if(highlighted.has(task.id))row.append(node('span','In approved SOD','daily-tag'));return row;
 }
 function taskList(host,tasks,empty,limit=6){
  host.replaceChildren();if(!tasks.length){host.append(node('p',empty,'daily-empty'));return}
  const list=node('ul',null,'daily-task-list');tasks.slice(0,limit).forEach(t=>list.append(taskRow(t)));host.append(list);
  if(tasks.length>limit){const more=node('button','Show all '+tasks.length+' tasks','button');more.type='button';more.onclick=()=>taskList(host,tasks,empty,tasks.length);host.append(more)}
 }
 function approvedTaskIds(){if(!readable()||!record||phase!=='ready'||day!==T.today())return [];const active=new Set(M.project(store.getData().tasks,day).active.map(t=>t.id));return record.event_metadata.plan.rows.filter(r=>r.type==='task'&&active.has(r.id)).map(r=>r.id)}
 function renderFocusPlan(){
  const on=window.OpsWorkspace.getRoute().workflow==='focus',p=record?.event_metadata.plan,show=on&&readable()&&phase==='ready'&&day===T.today()&&!!p;
  $('focus-morning-plan').hidden=!show;
  if(show)$('focus-morning-summary').textContent='Approved SOD · revision '+p.revision+' · '+p.workDate+' · '+p.rows.filter(r=>r.type==='task').length+' saved tasks · '+window.OpsMorningModel.planningOnly(p)+' planning-only items. Task order is unchanged.';
 }
 function render(){
  const on=window.OpsWorkspace.getRoute().workflow==='morning',data=store.getData(),access=readable();last.hidden=!on;highlighted=new Set(approvedTaskIds());
  $('daily-dashboard').hidden=!cloud.user;
  const taskState=store.getState(),stale=taskState==='error'||['error','denied'].includes(phase),planState=taskState==='loading'?'loading':taskState==='error'?'error':phase;
  readiness(taskState,access,stale);
  $('daily-prepare').disabled=!access;
  $('daily-state').textContent=!cloud.user?'':taskState==='loading'||phase==='loading'?'Refreshing authorized records…':!access?'Shared task data unavailable. Refresh to retry.':stale?'Refresh incomplete. Last known records are stale; retry Refresh.':issue||'Authorized staff records · no automatic task or financial changes';
  last.textContent=lastRefresh?'Last successful refresh · '+stamp(lastRefresh)+(stale?' · stale':''):'No successful refresh';
  $('daily-start').disabled=!access;$('daily-date').disabled=!cloud.user;
  if(!access){for(const id of ['daily-priorities','daily-assignments','daily-followups'])$(id).replaceChildren();$('daily-counts').textContent='';for(const id of ['active','attention','followup'])$('daily-'+id+'-count').textContent='—';}
  else{
   const p=M.project(data.tasks,day);$('daily-active-count').textContent=p.active.length;$('daily-attention-count').textContent=p.attention;$('daily-followup-count').textContent=p.followups.length;$('daily-counts').textContent=p.active.length+' active tasks / '+p.attention+' need attention / '+p.followups.length+' follow-ups';
   taskList($('daily-priorities'),p.active,'No active saved tasks.');
   const owners=$('daily-assignments');owners.replaceChildren();
   for(const group of p.owners){const section=node('details',null,'daily-owner');section.open=true;section.append(node('summary',group.label+' · '+group.tasks.length+' active'));const list=node('div');taskList(list,group.tasks,'',3);section.append(list);owners.append(section)}
   if(!p.owners.length)owners.append(node('p','No saved assignments.','daily-empty'));
   taskList($('daily-followups'),p.followups,'No waiting, blocked or follow-up tasks recorded.',5);
  }
  const planHost=$('daily-plan');planHost.replaceChildren();
  $('daily-plan-status').textContent=planState==='ready'?(record?'Approved':'No approved SOD'):planState==='loading'?'Loading':planState==='denied'?'Access denied':planState==='error'?'Stale / unavailable':'Not loaded';
  if(record&&access){
   const p=record.event_metadata.plan;
   planHost.append(node('p','Revision '+p.revision+' · approved '+new Date(record.occurred_at).toLocaleString('en-US',{timeZone:'America/New_York'})+' Eastern','daily-task-meta'),node('p','Approving staff · '+record.actor_id,'daily-task-meta'));
   const conflicts=window.OpsMorningModel.conflicts(p,data.tasks,day);if(conflicts.length)planHost.append(node('p','Saved plan context: '+conflicts.join(' ')+' Current task records remain authoritative.','daily-notice'));
   planHost.append(node('pre',p.text,'daily-plan-text'));
   const sources=node('details');sources.append(node('summary','Source references · '+Object.keys(p.sources).length));
   for(const s of Object.values(p.sources)){if(!s||typeof s.label!=='string')continue;const detail=node('p',s.label+' · '+(s.verification||'Verification not recorded')+(s.version?' · version '+s.version:'')+(s.originRef?' · '+s.originRef:''));sources.append(detail)}
   planHost.append(sources,node('p',window.OpsMorningModel.planningOnly(p)+' planning-only items. Approval does not create saved tasks.','daily-task-meta'));
  }else planHost.append(node('p',planState==='ready'?'No valid approved plan is saved for '+day+' Eastern.':planState==='denied'?'Server-reviewed plan access was denied. No saved plan is displayed.':planState==='loading'?'Reading server-reviewed SOD…':'Approved SOD unavailable. Refresh to retry.','daily-empty'));
  $('daily-plan-status').dataset.state=planState==='ready'?(record?'approved':'empty'):planState;
  renderFocusPlan();
 }
 async function refreshPlan(fullSnapshot=false){
  if(!readable())return [];
  const id=++ticket,user=cloud.user.id,selected=day;phase='loading';issue='';render();const rows=[];
  const current=()=>ticket===id&&cloud.user?.id===user&&day===selected;
  try{
   // The server joins journal events to private review receipts; raw JSON is not approval proof.
   for(let offset=0;;offset+=100){
    const page=await window.OpsPlanApi.call('list',{work_date:selected,offset});
    if(!current())return [];
    if(!Array.isArray(page))throw Error('Unexpected approval response');rows.push(...page);if(page.length<100)break;
    if(offset>=9900)throw Error('Approval history needs a narrower read');
   }
   if(!current()||!readable())return [];
   record=M.latest(rows,selected);phase='ready';if(fullSnapshot)lastRefresh=new Date().toISOString();
   if(rows.some(r=>!M.validApproval(r,selected)))issue='Invalid approval records were ignored. The latest valid approved version is displayed.';
   render();return rows;
  }catch(error){
   if(!current())return [];
   phase=[401,403].includes(error.status)?'denied':'error';if(phase==='denied')record=null;
   issue=phase==='denied'?'Staff journal access denied.':'Approved SOD refresh failed. Previous approval, if shown, is stale.';render();return null;
  }
 }
 $('daily-date').onchange=()=>{if(!T.validDate($('daily-date').value)){$('daily-date').value=day;return}day=$('daily-date').value;ticket++;record=null;lastRefresh=null;phase='idle';render();refreshPlan()};
 $('daily-start').onclick=()=>{if(readable())window.OpsWorkspace.navigate('focus')};
 window.addEventListener('ops-today-state',()=>{if(store.getState()==='error'){ticket++;phase='error'}render()});
 window.addEventListener('ops-sod-change',()=>{const saved=window.OpsSod.getApproved();if(readable()&&M.validApproval(saved,day)&&saved.id!==lastLocalId){lastLocalId=saved.id;if(!record||M.latest([record,saved],day)===saved){record=saved;phase='ready'}}render()});
 window.addEventListener('ops-workspace-change',render);
 window.addEventListener('ops-auth-change',()=>{ticket++;record=null;lastLocalId=null;phase='idle';lastRefresh=null;issue='';day=T.today();$('daily-date').value=day;render()});
 let eastern=T.today();setInterval(()=>{const next=T.today();if(next!==eastern){const follow=day===eastern;eastern=next;if(follow){day=next;record=null;ticket++;phase='idle';lastRefresh=null;$('daily-date').value=day;render();if(readable())refreshPlan()}}},60000);
 window.OpsDaily=Object.freeze({refreshPlan,renderFocusPlan,approvedTaskIds});render();
})();
