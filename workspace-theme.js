/* Only an appearance name is persisted. Theme changes never touch work records. */
(()=>{'use strict';
 const key='oaktown-theme-v1',modes={veyra:{scheme:'dark',canvas:'#081331'},oryn:{scheme:'dark',canvas:'#131415'},nilo:{scheme:'light',canvas:'#e4ecee'}};
 function apply(value){document.documentElement.classList.add('theme-changing');const name=Object.hasOwn(modes,value)?value:'veyra';document.documentElement.dataset.opsTheme=name;document.documentElement.style.colorScheme=modes[name].scheme;document.documentElement.style.backgroundColor=modes[name].canvas;const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=modes[name].canvas;const select=document.getElementById('ops-theme-select');if(select)select.value=name;window.dispatchEvent(new Event('ops-theme-change'));requestAnimationFrame(()=>requestAnimationFrame(()=>document.documentElement.classList.remove('theme-changing')));}
 let saved;try{saved=localStorage.getItem(key)}catch{}apply(saved);
 document.addEventListener('DOMContentLoaded',()=>{const select=document.getElementById('ops-theme-select');if(!select)return;select.value=document.documentElement.dataset.opsTheme;select.addEventListener('change',()=>{apply(select.value);try{localStorage.setItem(key,select.value)}catch{}});});
 window.addEventListener('storage',event=>{if(event.key===key)apply(event.newValue)});
})();
