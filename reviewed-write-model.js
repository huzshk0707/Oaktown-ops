/* Explicit UI lifecycle for a reviewed write. Server authorization remains separate. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OpsReviewedWrite=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const transitions=Object.freeze(Object.fromEntries(Object.entries({
  idle:{open:'reviewing'},
  reviewing:{submit:'checking',stale:'needs_review'},
  checking:{approved:'saving',rejected:'needs_review'},
  saving:{received:'verifying',failed:'needs_review'},
  verifying:{verified:'saved',failed:'needs_review'},
  saved:{},
  needs_review:{reload:'refreshing'},
  refreshing:{loaded:'reviewing',failed:'needs_review'}
 }).map(([state,events])=>[state,Object.freeze(events)])));
 const pending=new Set(['checking','saving','verifying','refreshing']);
 function create(){
  let phase='idle',ticket=null;
  const current=value=>!!value&&value===ticket;
  const can=event=>Object.hasOwn(transitions[phase],event);
  function move(event){
   if(!can(event))return false;
   phase=transitions[phase][event];
   if(!pending.has(phase))ticket=null;
   return true;
  }
  return Object.freeze({
   get phase(){return phase},
   get busy(){return pending.has(phase)},
   can,
   open(){if(phase!=='idle')return false;return move('open')},
   reset(){ticket=null;phase='idle'},
   start(event){
    if(!['submit','reload'].includes(event)||!can(event))return null;
    move(event);ticket=Object.freeze({});return ticket;
   },
   advance(value,event){return current(value)&&move(event)},
   current,
   stale(){return move('stale')},
   snapshot(){return Object.freeze({phase,busy:pending.has(phase),allowed:Object.freeze(Object.keys(transitions[phase]))})}
  });
 }
 // PostgreSQL JSON and PostgREST can spell the same UTC instant differently.
 // Preserve fractional precision; Date.parse alone loses PostgreSQL microseconds.
 function version(value){
  if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))return null;
  return value.replace(/\+00:00$/,'Z').replace(/(\.\d*?[1-9])0+(?=Z$)/,'$1').replace(/\.0+(?=Z$)/,'');
 }
 const sameVersion=(a,b)=>version(a)!==null&&version(a)===version(b);
 function withTimeout(run,milliseconds=20000){
  const controller=new AbortController();let timer;
  const deadline=new Promise((resolve,reject)=>{timer=setTimeout(()=>{
   reject(Error('The request timed out; check the saved record before retrying.'));
   controller.abort();
  },milliseconds)});
  return Promise.race([Promise.resolve().then(()=>run(controller.signal)),deadline]).finally(()=>clearTimeout(timer));
 }
 return Object.freeze({transitions,create,sameVersion,withTimeout});
});
