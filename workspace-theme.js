/* Appearance preferences only. Work records never pass through this module. */
(()=>{'use strict';
 const themeKey='oaktown-theme-v1',motionKey='oaktown-motion-v1';
 const modes={
  veyra:{scheme:'dark',canvas:'#081331'},
  oryn:{scheme:'dark',canvas:'#131415'},
  nilo:{scheme:'light',canvas:'#e4ecee'},
  ember:{scheme:'dark',canvas:'#151819'},
  verdant:{scheme:'dark',canvas:'#0e1c19'},
  pearl:{scheme:'light',canvas:'#f1eee7'}
 };
 const root=document.documentElement,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function read(key){try{return localStorage.getItem(key)}catch{return null}}
 function save(key,value){try{localStorage.setItem(key,value)}catch{}}
 function apply(value){
  const name=Object.hasOwn(modes,value)?value:'veyra',mode=modes[name];
  root.classList.add('theme-changing');
  root.dataset.opsTheme=name;root.style.colorScheme=mode.scheme;root.style.backgroundColor=mode.canvas;
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=mode.canvas;
  const select=document.getElementById('ops-theme-select');if(select)select.value=name;
  window.dispatchEvent(new Event('ops-theme-change'));
  requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.remove('theme-changing')));
 }
 let motion=read(motionKey)==='off'?'off':'on';
 function applyMotion(){
  const off=motion==='off'||reduced.matches;
  root.dataset.opsMotion=off?'off':'on';
  const button=document.getElementById('ops-motion-toggle');
  if(button){
   button.setAttribute('aria-pressed',String(off));
   button.querySelector('span').textContent=off?'Motion off':'Motion on';
   button.title=reduced.matches?'Reduced motion follows your device setting':'Toggle brief transitions and hover effects';
   const help=document.getElementById('ops-motion-help');if(help)help.textContent=reduced.matches?'Device reduced motion is on':'Transitions & hover effects';
  }
 }
 apply(read(themeKey));applyMotion();
 document.addEventListener('DOMContentLoaded',()=>{
  const select=document.getElementById('ops-theme-select');
  if(select){select.value=root.dataset.opsTheme;select.addEventListener('change',()=>{apply(select.value);save(themeKey,select.value)})}
  document.getElementById('ops-motion-toggle')?.addEventListener('click',()=>{
   motion=motion==='off'?'on':'off';save(motionKey,motion);applyMotion();
  });
  applyMotion();
 });
 reduced.addEventListener('change',applyMotion);
 window.addEventListener('storage',event=>{
  if(event.key===themeKey||event.key===null)apply(read(themeKey));
  if(event.key===motionKey||event.key===null){motion=read(motionKey)==='off'?'off':'on';applyMotion()}
 });
})();
