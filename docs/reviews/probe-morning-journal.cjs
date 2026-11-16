'use strict';
// Disposable-only review probe. Every identifier and source excerpt is fictional.
const {spawnSync}=require('node:child_process'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
if(process.env.PGDATABASE!=='oaktown_portfolio_ci')throw Error('Disposable oaktown_portfolio_ci required');
const output=process.argv[2];if(!output)throw Error('Supply evidence output path');
const bin=process.env.OAKTOWN_PSQL_BIN||'psql',db='oaktown_hp_journal_review_ci',quote=s=>"'"+String(s).replaceAll("'","''")+"'",writer='00000000-0000-4000-8000-000000000001',viewer='00000000-0000-4000-8000-000000000003',inactive='00000000-0000-4000-8000-000000000004',event='90000000-0000-4000-8000-000000000059';
function sql(database,input,mayFail=false){const r=spawnSync(bin,['-X','-qAt','-v','ON_ERROR_STOP=1','-d',database],{input,encoding:'utf8',timeout:20000});if(r.error)throw r.error;if(r.status&&!mayFail)throw Error(r.stderr);return r}
const auth=id=>`set role authenticated;select set_config('request.jwt.claim.sub',${quote(id)},false);`,last=r=>r.stdout.trim().split('\n').at(-1);let created=false;
try{
 assert.equal(last(sql('oaktown_portfolio_ci',"select current_database()='oaktown_portfolio_ci' and exists(select 1 from pg_trigger where tgname='ops_stamp_event_attribution');")),'t');sql('postgres',`create database ${db} template oaktown_portfolio_ci;`);created=true;
 const before=last(sql(db,'select jsonb_agg(to_jsonb(t) order by id) from public.ops_tasks t;'));
 const metadata={schema_version:'not-a-valid-plan',review_confirmed:false,plan:{sources:{fictional:{body:'Fictional review-only source excerpt'}}}};
 const row={id:event,entity_type:'morning_plan',entity_id:'90000000-0000-4000-8000-000000000060',event_type:'morning_plan_approved_v1',summary:'Fictional schema/retention boundary probe',event_metadata:metadata};
 sql(db,auth(writer)+`insert into public.ops_events select x.* from jsonb_populate_record(null::public.ops_events,${quote(JSON.stringify(row))}::jsonb)x;`);
 const own=last(sql(db,auth(writer)+`select actor_id=${quote(writer)}::uuid and occurred_at is not null from public.ops_events where id=${quote(event)};`));assert.equal(own,'t');
 const exposed=last(sql(db,auth(viewer)+`select event_metadata->'plan'->'sources'->'fictional'->>'body' from public.ops_events where id=${quote(event)};`));assert.equal(exposed,metadata.plan.sources.fictional.body);
 assert.equal(last(sql(db,auth(inactive)+`select count(*) from public.ops_events where id=${quote(event)};`)),'0');assert.notEqual(sql(db,'set role anon;select count(*) from public.ops_events;',true).status,0);
 assert.equal(last(sql(db,'select jsonb_agg(to_jsonb(t) order by id) from public.ops_tasks t;')),before);
 const evidence={sourceContract:'Phase 4 existing generic ops_events; no schema change',fictionalOnly:true,disposableDatabase:db,malformedApprovalEventAcceptedByEditor:true,serverActorAndTimeStamped:true,activeViewerCanReadSelectedSourceBody:true,inactiveReadCount:0,anonymousDenied:true,taskRecordsUnchanged:true,productionWrites:0};fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
}finally{if(created)sql('postgres',`drop database ${db} with (force);`)}
