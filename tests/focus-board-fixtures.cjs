'use strict';
const T=require('../today-model.js');
const ORIGIN='http://127.0.0.1:8765',HOST='wjdzaexhhjsjtdgxivyw.supabase.co',USER='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const day=T.today(),shift=n=>{const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+n);return date.toISOString().slice(0,10)};
function tasks(count=9){
 const titles=['Review the inspection follow-up','Confirm the renewal packet','Check the vendor appointment','Review the monthly statement','Prepare the listing photos','File the move-in documents','Follow up on the tenant reply','Review the application checklist','Confirm the maintenance estimate'];
 return Array.from({length:count},(_,i)=>({id:'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),task_code:'DEMO-'+String(i+101),task_title:titles[i]||'Fictional active task '+String(i+1).padStart(5,'0'),status:i===6?'waiting':i===3?'in_progress':'pending',priority:i===3?'urgent':i===0?'high':'normal',assigned_label:i===4?null:'Example Staff',workflow_key:i===0?'maintenance':i===1?'renewal':i===3?'accounting':'general',intake_details:{...(i<3?{due:{date:shift(i-2)}}:{}),work_level:i===0?'Property operations':i===1?'Lease renewals':'Daily operations'},updated_at:'2026-11-01T12:00:00Z',archived_at:null}));
}
async function mock(page,count=9){
 const state={tasks:tasks(count),writes:[],reads:[],fail:false,hold:null,role:'admin',readRole:'admin'};
 await page.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());if(u.origin===ORIGIN)return route.continue();if(u.hostname!==HOST)return route.abort();
  const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'},reply=(data,status=200)=>route.fulfill({status,headers,body:JSON.stringify(data)});
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  if(u.pathname==='/auth/v1/token')return reply({access_token:'fictional-access',refresh_token:'fictional-refresh',expires_in:3600,user:{id:USER,email:'focus@example.invalid'}});
  if(u.pathname==='/auth/v1/user')return reply({id:USER,email:'focus@example.invalid'});
  if(u.pathname==='/auth/v1/logout')return reply({});
  if(u.pathname==='/rest/v1/staff_memberships')return reply([{user_id:USER,is_active:true,role:u.searchParams.has('user_id')?state.role:state.readRole}]);
  if(req.method()!=='GET'){state.writes.push({path:u.pathname,body:req.postData()});return reply({message:'No writes permitted in fixture'},403)}
  if(u.pathname==='/rest/v1/ops_tasks'){
   state.reads.push(u.search);if(state.hold)await state.hold;
   if(state.fail)return reply({message:'Fictional read failure'},503);
   const from=Number(u.searchParams.get('offset')||0),limit=Number(u.searchParams.get('limit')||1000);
   return reply([...state.tasks].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0).slice(from,from+limit));
  }
  if(u.pathname==='/rest/v1/rpc/ops_bill_reminders')return reply({rules:[],occurrences:[],can_edit:false});
  return reply([]);
 });return state;
}
async function signIn(page){await page.locator('#account-button').click();await page.locator('#pilot-email').fill('focus@example.invalid');await page.locator('#pilot-password').fill('fictional-password');await page.locator('#pilot-login').click();}
module.exports={mock,signIn,tasks,ORIGIN,USER};
