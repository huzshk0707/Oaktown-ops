/* Pure projections of saved records. No writes, inferred occupants or synthetic deadlines. */
(function(root,factory){
 'use strict';
 const api=factory(typeof module==='object'&&module.exports?require('./today-model.js'):root.OpsTodayModel);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OpsOperationsModel=api;
})(typeof window!=='undefined'?window:null,function(T){
 'use strict';
 const list=x=>Array.isArray(x)?x:[],map=x=>new Map(list(x).map(r=>[r.id,r]));
 const terminal=new Set(['completed','closed','cancelled','canceled','done','declined']);
 const fold=x=>String(x??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function index(data){return {properties:map(data.properties),units:map(data.units),leases:map(data.leases),people:map(data.people),tasks:map(data.tasks),renewals:map(data.renewals)}}
 function location(row,i){
  const unit=i.units.get(row.unit_id),prop=i.properties.get(row.property_id||unit?.property_id);
  return [prop?.street_address,unit?.unit_label&&unit.unit_label!=='MAIN'?unit.unit_label:null].filter(Boolean).join(' · ')||'General operations / scope not recorded';
 }
 function actions(data,reference=T.today(),tracking={}){
  const i=index(data),tasks=T.classify(data.tasks,reference),overdue=new Set(tasks.overdue.map(t=>t.id)),due=new Set(tasks.today.map(t=>t.id));
  const out=tasks.all.map(t=>({kind:'task',id:t.id,title:(t.task_code?t.task_code+' · ':'')+(t.task_title||'Untitled task'),location:location(t,i),status:t.status||'pending',next:t.intake_details?.next_action||'',owner:t.assigned_label||'',schedule:t.schedule,group:overdue.has(t.id)?'overdue':due.has(t.id)?'today':t.schedule?'upcoming':'undated',workflow:t.workflow_key||'',row:t}));
  // Renewal cases are reference records, not implicit work items. Only saved tasks appear here.
  const rank={overdue:0,today:1,undated:2,renewals:3,upcoming:4},priority={urgent:0,high:1,normal:2,low:3};
  return out.sort((a,b)=>rank[a.group]-rank[b.group]||(priority[a.row.priority]??2)-(priority[b.row.priority]??2)||String(a.schedule?.date||'').localeCompare(String(b.schedule?.date||''))||a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
 }
 const filters=Object.freeze(['all','overdue','today','waiting','undated','renewals','maintenance']);
 function filterActions(rows,filter){return rows.filter(r=>filter==='all'||filter==='waiting'&&['waiting','blocked','on_hold','awaiting_signatures','sent_for_signature','partially_signed'].includes(r.status)||filter==='maintenance'&&r.kind==='task'&&r.workflow==='maintenance'||filter==='renewals'&&r.kind==='task'&&r.workflow==='renewal'||r.group===filter)}
 function searchIndex(data){
  const i=index(data),out=[];
  const add=(kind,row,title,detail,terms='')=>out.push({kind,id:row.id,title,detail,hay:fold([title,detail,terms].join(' '))});
  for(const p of list(data.properties))add('property',p,p.street_address||'Property',[p.city,p.state,p.postal_code].filter(Boolean).join(', '),p.portfolio_id);
  for(const u of list(data.units))add('unit',u,location({unit_id:u.id},i),u.unit_code||'Unit',u.occupancy_status);
  for(const p of list(data.people))add('person',p,p.display_name||'Person','Source-linked person · verify current occupancy',[p.email,p.phone].join(' '));
  for(const l of list(data.leases))add('lease',l,l.lease_label||l.source_lease_key||'Lease record',location(l,i),[l.lease_status,l.source_lease_key].join(' '));
  for(const r of list(data.renewals))add('renewal',r,r.oak_record_id||'Renewal case',location(r,i),r.next_action);
  for(const t of list(data.tasks).filter(t=>!t.archived_at))add('task',t,(t.task_code?t.task_code+' · ':'')+(t.task_title||'Task'),location(t,i),[t.task_code,t.status,t.assigned_label,t.intake_details?.next_action].join(' '));
  for(const d of list(data.documents))add('document',d,d.source_name||'Reference document','Lease reference · separate Drive access',d.reference_notes);
  return out;
 }
 function search(entries,query,limit=30){
  const words=fold(query).trim().split(/\s+/).filter(Boolean);if(!words.length)return [];
  return entries.filter(e=>words.every(w=>e.hay.includes(w))).sort((a,b)=>Number(!fold(a.title).startsWith(words.join(' ')))-Number(!fold(b.title).startsWith(words.join(' ')))||a.title.localeCompare(b.title)||a.id.localeCompare(b.id)).slice(0,limit);
 }
 function scope(data,kind,id){
  const i=index(data),unit=kind==='unit'?i.units.get(id):null,prop=kind==='property'?i.properties.get(id):i.properties.get(unit?.property_id);
  const units=unit?[unit]:list(data.units).filter(u=>u.property_id===prop?.id),unitIds=new Set(units.map(u=>u.id));
  const leases=list(data.leases).filter(l=>unitIds.has(l.unit_id)),leaseIds=new Set(leases.map(l=>l.id));
  const renewals=list(data.renewals).filter(r=>unit? r.unit_id===id:r.property_id===id||unitIds.has(r.unit_id)),renewalIds=new Set(renewals.map(r=>r.id));
  const linkedTasks=list(data.tasks).filter(t=>unitIds.has(t.unit_id)||!unit&&t.property_id===id||leaseIds.has(t.lease_id)||renewalIds.has(t.renewal_case_id)),tasks=linkedTasks.filter(t=>!t.archived_at),taskIds=new Set(linkedTasks.map(t=>t.id));
  const events=list(data.events).filter(e=>({property:e.entity_id===prop?.id&&!unit,unit:unitIds.has(e.entity_id),lease:leaseIds.has(e.entity_id),renewal_case:renewalIds.has(e.entity_id),ops_task:taskIds.has(e.entity_id),task:taskIds.has(e.entity_id)})[e.entity_type]).sort((a,b)=>String(b.occurred_at||'').localeCompare(String(a.occurred_at||''))||String(b.id).localeCompare(String(a.id)));
  return {prop,unit,units,leases,renewals,tasks,events,rents:list(data.rents).filter(r=>leaseIds.has(r.lease_id))};
 }
 function driveUrl(document){
  // Accept only the catalog's exact provider ID; never render arbitrary source URLs.
  return /^[A-Za-z0-9_-]{10,200}$/.test(document?.drive_file_id||'')?'https://drive.google.com/file/d/'+document.drive_file_id+'/view':null;
 }
 return Object.freeze({index,location,actions,filters,filterActions,searchIndex,search,scope,driveUrl});
});
