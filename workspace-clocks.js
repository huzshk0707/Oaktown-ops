/* Two views of the same instant. Eastern follows US daylight saving time. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(!root?.document)return;
 let timer=null;
 function tick(){
  const now=new Date(),clocks=api.format(now);
  for(const [id,value] of Object.entries(clocks)){
   const time=root.document.getElementById('clock-'+id+'-time');
   if(!time)continue;
   time.textContent=value.time;time.dateTime=now.toISOString();
   root.document.getElementById('clock-'+id+'-date').textContent=value.date;
   root.document.getElementById('clock-'+id+'-zone').textContent=value.zone;
  }
 }
 function start(){clearInterval(timer);tick();if(!root.document.hidden)timer=setInterval(tick,1000)}
 root.document.addEventListener('visibilitychange',start);start();
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const timeOptions={hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true};
 const zones={eastern:'America/New_York',india:'Asia/Kolkata'};
 function format(at=new Date()){
  return Object.fromEntries(Object.entries(zones).map(([id,timeZone])=>{
   const clock=new Intl.DateTimeFormat('en-US',{...timeOptions,timeZone,timeZoneName:'short'});
   const zone=id==='india'?'IST':clock.formatToParts(at).find(p=>p.type==='timeZoneName').value;
   return [id,{zone,time:new Intl.DateTimeFormat('en-US',{...timeOptions,timeZone}).format(at),date:new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',timeZone}).format(at)}];
  }));
 }
 return Object.freeze({format});
});
