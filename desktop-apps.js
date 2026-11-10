/* Device-local desktop shortcuts and an offline, explicitly installed Windows handler. */
(()=>{'use strict';
 const M=window.OpsDesktopAppsModel,$=id=>document.getElementById(id);if(!M||!$('desktop-apps-dialog'))return;
 const STORE='oaktown-desktop-apps-v1',dialog=$('desktop-apps-dialog'),node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e};
 const isWindows=()=>/win/i.test(navigator.userAgentData?.platform||navigator.platform||'');
 let config=M.defaults(),editing=null,busy=false,generation=0,storage=true,lastFocus=null;
 try{config=M.read(localStorage.getItem(STORE))}catch{storage=false}
 const status=text=>{$('desktop-apps-status').textContent=text};
 function controls(){for(const id of ['desktop-apps-download','desktop-apps-add','desktop-apps-import','desktop-apps-save','desktop-apps-name','desktop-apps-path'])$(id).disabled=busy;$('desktop-apps-list').querySelectorAll('button').forEach(b=>b.disabled=busy)}
 function save(){generation++;try{localStorage.setItem(STORE,JSON.stringify(config));storage=true}catch{storage=false}render();status((storage?'Saved on this browser.':'Saved for this session; browser storage is unavailable.')+' Download and run updated Windows setup to update the allowed app list.');}
 function edit(app){editing=app?.id||null;$('desktop-apps-name').value=app?.name||'';$('desktop-apps-path').value=app?.executable||'';$('desktop-apps-editor').hidden=false;$('desktop-apps-setup').open=true;$('desktop-apps-name').focus();}
 function render(){
  const list=$('desktop-apps-list');list.replaceChildren();
  if(!config.apps.length)list.append(node('p','Add a Windows app to create your first shortcut.','desktop-apps-help'));
  for(const app of config.apps){
   const card=node('article',null,'desktop-apps-item'),info=node('div'),actions=node('div',null,'desktop-apps-actions');info.append(node('h3',app.name),node('p','Windows app · uses your local launcher','desktop-apps-help'));
   const launch=node('a','Open '+app.name,'button primary');launch.href=M.uri(app.id);launch.dataset.desktopLaunch=app.id;
   if(!isWindows()){launch.setAttribute('aria-disabled','true');launch.tabIndex=-1}
   launch.addEventListener('click',event=>{if(!isWindows()){event.preventDefault();status('Open this shortcut on your Windows PC.');return}status('Requested '+app.name+' from Windows. If nothing opens, run or update Windows setup.');});
   const change=node('button','Edit','button');change.type='button';change.onclick=()=>edit(app);
   const remove=node('button','Remove','button');remove.type='button';remove.onclick=()=>{config={version:1,apps:config.apps.filter(a=>a.id!==app.id)};save()};
   actions.append(launch,change,remove);card.append(info,actions);list.append(card);
  }
  controls();
 }
 function open(){if(dialog.open)return;lastFocus=document.activeElement;render();dialog.showModal();$('desktop-apps-title').focus();status(isWindows()?'Choose an app. Windows setup is needed once on this PC.':'These shortcuts open on Windows. You can prepare a setup ZIP here for your Windows PC.');}
 const trigger=node('button','PC apps','button');trigger.id='desktop-apps-open';trigger.type='button';trigger.onclick=open;(document.querySelector('.operations-toolbar')||$('today-workflow')).append(trigger);
 $('desktop-apps-close').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{generation++;busy=false;editing=null;$('desktop-apps-form').reset();$('desktop-apps-editor').hidden=true;$('desktop-apps-import').value='';controls();if(lastFocus?.isConnected)lastFocus.focus()});
 $('desktop-apps-add').onclick=()=>edit(null);
 $('desktop-apps-cancel-edit').onclick=()=>{$('desktop-apps-form').reset();$('desktop-apps-editor').hidden=true;editing=null};
 $('desktop-apps-form').onsubmit=event=>{
  event.preventDefault();if(busy)return;
  try{const app={id:editing||'app-'+crypto.randomUUID(),name:$('desktop-apps-name').value,executable:M.path($('desktop-apps-path').value)};
   config=M.validate({version:1,apps:editing?config.apps.map(a=>a.id===editing?app:a):[...config.apps,app]});editing=null;$('desktop-apps-form').reset();$('desktop-apps-editor').hidden=true;save();
  }catch(error){status(error.message)}
 };
 $('desktop-apps-import').onchange=async()=>{
  const file=$('desktop-apps-import').files?.[0];if(!file||busy)return;if(file.size>65536){status('Choose an app list smaller than 64 KB.');return}
  const ticket=++generation;busy=true;controls();
  try{const next=M.validate(JSON.parse(await file.text()),true);if(ticket!==generation)return;config=next;save();status('Imported this app list into the browser. Run its Windows setup if it is not installed on this PC.');}
  catch{if(ticket===generation)status('Could not import that app list. Choose apps.json from an Oaktown Windows setup ZIP.');}
  finally{if(ticket===generation||ticket+1===generation){busy=false;controls()}$('desktop-apps-import').value='';}
 };
 function download(bytes){const url=URL.createObjectURL(new Blob([bytes],{type:'application/zip'})),a=node('a');a.href=url;a.download='Oaktown Windows apps.zip';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
 $('desktop-apps-download').onclick=async()=>{
  if(busy)return;let approved;
  try{approved=M.validate(config,true)}catch(error){status(error.message);const missing=config.apps.find(a=>!a.executable);if(missing)edit(missing);return}
  const ticket=++generation;busy=true;controls();status('Preparing your Windows setup ZIP…');
  try{const settled=await Promise.allSettled(M.FILES.map(async name=>{const r=await fetch('assets/windows-launcher/'+name,{cache:'no-store'});if(!r.ok)throw Error('Setup file unavailable');return [name,await r.text()]}));
   if(settled.some(r=>r.status!=='fulfilled'))throw Error('Setup assets unavailable');const sources=Object.fromEntries(settled.map(r=>r.value)),bytes=await M.bundle(window.JSZip,sources,approved);
   if(ticket!==generation)return;download(bytes);status('ZIP ready. Extract the whole ZIP on your Windows PC, then double-click Install.cmd. Afterwards choose Open in PC apps.');
  }catch{if(ticket===generation)status('Could not prepare Windows setup. Refresh and try again; your saved shortcuts are unchanged.');}
  finally{if(ticket===generation){busy=false;controls()}}
 };
 window.OpsDesktopApps={open};render();
})();
