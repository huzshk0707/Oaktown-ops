/* Disposable database only: two staff sessions race the first monthly update. */
'use strict';
const {spawn}=require('node:child_process'),assert=require('node:assert/strict');
const executable=process.env.OAKTOWN_BILLS_PSQL||'psql';
function sql(query){return new Promise((resolve,reject)=>{let out='';const p=spawn(executable,['-X','-d','oaktown_portfolio_ci','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-At','-c',query]);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>out+=d);p.on('error',reject);p.on('close',code=>resolve({code,out}));});}
async function checked(query){const r=await sql(query);assert.equal(r.code,0,r.out);return r.out.trim();}
(async()=>{
 assert.equal(await checked('select current_database()'),'oaktown_portfolio_ci');
 const id='dddddddd-0000-4000-8000-000000000001';
 await checked("insert into ops_bill_private.rules(id,rule_key,label,recipient,day_from,day_through,kind,instructions,start_month,source_ref) values('"+id+"','concurrency-probe','Fictional concurrent card','Example Manager',2,2,'payment','Fictional concurrent reminder.',date_trunc('month',statement_timestamp() at time zone 'America/New_York')::date,'fictional-ci')");
 try{
  const write="begin;set local role authenticated;select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);select public.ops_bill_reminder_record('"+id+"',date_trunc('month',statement_timestamp() at time zone 'America/New_York')::date,'reminded',0,null);select pg_sleep(0.2);commit;";
  const results=await Promise.all([sql(write),sql(write)]);assert.equal(results.filter(r=>r.code===0).length,1,JSON.stringify(results));assert.match(results.find(r=>r.code!==0).out,/40001/);
  assert.equal(await checked("select count(*) from ops_bill_private.events where rule_id='"+id+"'"),'1');
  assert.equal(await checked("select revision from ops_bill_private.occurrences where rule_id='"+id+"'"),'1');
  console.log('Concurrent monthly updates: one accepted, one stale; exactly one audit event.');
 }finally{
  await checked("delete from ops_bill_private.occurrences where rule_id='"+id+"';delete from ops_bill_private.events where rule_id='"+id+"';delete from ops_bill_private.rules where id='"+id+"';");
 }
})().catch(error=>{console.error(error);process.exitCode=1});
