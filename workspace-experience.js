/* Workspace presentation: discoverable navigation and settings, without work-data storage. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),sidebar=document.querySelector('.sidebar'),nav=sidebar?.querySelector('nav'),topbar=document.querySelector('.topbar');
 if(!sidebar||!nav||!topbar)return;
 const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n};
 const button=(text,fn,cls='button')=>{const b=make('button',cls,text);b.type='button';b.addEventListener('click',fn);return b};
 nav.id='workspace-navigation';
 const menu=button('Menu',()=>setMenu(menu.getAttribute('aria-expanded')!=='true'),'button workspace-menu-toggle');menu.id='workspace-menu-toggle';menu.setAttribute('aria-controls',nav.id);menu.setAttribute('aria-expanded','false');sidebar.prepend(menu);
 function setMenu(open){sidebar.dataset.menu=open?'open':'closed';menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'Close menu':'Menu'}
 setMenu(false);
 nav.addEventListener('click',e=>{if(e.target.closest('[data-workspace]')){const moveFocus=menu.getAttribute('aria-expanded')==='true'&&nav.contains(document.activeElement);setMenu(false);if(moveFocus)$('workspace-title').focus({preventScroll:true})}});
 sidebar.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){setMenu(false);menu.focus()}});
 const settings=make('dialog','workspace-appearance');settings.id='workspace-appearance-dialog';settings.setAttribute('aria-labelledby','workspace-appearance-title');
 const head=make('div','workspace-settings-head'),title=make('h2','','Appearance');title.id='workspace-appearance-title';
 head.append(title,button('Close',()=>settings.close()));settings.append(head,make('p','','Choose how this workspace looks. These preferences stay on this device.'));
 const controls=make('div','workspace-appearance-controls');
 for(const node of [document.querySelector('.theme-control'),document.querySelector('.motion-setting'),$('operations-density')])if(node)controls.append(node);
 settings.append(controls);document.body.append(settings);
 const appearance=button('Appearance',()=>settings.showModal());appearance.id='workspace-appearance-open';appearance.setAttribute('aria-haspopup','dialog');topbar.insertBefore(appearance,$('account-button'));
 settings.addEventListener('close',()=>appearance.focus({preventScroll:true}));
 const density=$('operations-density');if(density){density.setAttribute('aria-label','Compact display density');const note=make('p','workspace-settings-note','Use compact display density to fit more records on screen.');controls.append(note)}
 const overview=document.querySelector('.today-schedule-card');if(overview){const wrap=make('details','today-overview-disclosure');const summary=make('summary','','Task breakdown');wrap.append(summary);overview.before(wrap);wrap.append(overview)}
 const all=$('today-open-all');if(all)all.addEventListener('click',()=>{window.OpsWorkspace.openTasks('work')});
 const plan=$('today-open-plan');if(plan)plan.addEventListener('click',()=>{const panel=$('sod-morning');if(panel){panel.open=true;panel.scrollIntoView({block:'start',behavior:'instant'});$('sod-saved-task')?.focus({preventScroll:true})}});
 const guide=make('span','workspace-mode');guide.id='workspace-mode';document.querySelector('.workspace-intro>div')?.append(guide);
 function context(){const active=nav.querySelector('[aria-current="page"]')?.dataset.workspace;const guides=['listings','leads','applications'];guide.textContent=guides.includes(active)?'Guide & prompt builder · No case records are saved here':active==='tasks'?'Active work, history and reviewed imports':active==='today'?'Your daily work, in one place':active==='notices'?'Local drafts · Review before export':active==='maintenance'?'Planned workflow':'Portfolio workspace';guide.dataset.kind=guides.includes(active)?'guide':'workspace'}
 window.addEventListener('ops-workspace-change',context);context();
 // Advanced setup stays accessible without competing with daily work.
 const advanced=make('details','workspace-advanced');advanced.id='workspace-advanced';const summary=make('summary','','Settings & connections');advanced.append(summary);
 const advancedNodes=[$('task-connection'),document.querySelector('.today-reset-settings'),$('backlog-import-settings')].filter(Boolean);
 if(advancedNodes.length){advancedNodes[0].before(advanced);for(const n of advancedNodes)advanced.append(n)}
})();
