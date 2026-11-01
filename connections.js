/* Relationship explorer uses the existing Today snapshot; no requests or writes. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),M=window.OpsConnectionsModel;
 let data=null,selected='';const positions={task:[50,16],property:[18,48],unit:[43,80],lease:[80,48],renewal:[80,82]};
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n};
 function clear(){data=null;selected='';$('connection-task').replaceChildren(new Option(window.OpsCloud.user?'No task data loaded':'Sign in to view connections',''));$('connection-task').disabled=true;$('connection-nodes').replaceChildren();$('connection-edges').replaceChildren();$('connection-list').replaceChildren();$('connection-detail').replaceChildren();$('connection-status').textContent=window.OpsCloud.user?'Connections unavailable. Refresh Today to load records.':'Sign in to explore saved task relationships.';}
 function render(){
  const graph=M.build(data,selected),nodes=$('connection-nodes'),svg=$('connection-edges'),list=$('connection-list'),detail=$('connection-detail');nodes.replaceChildren();svg.replaceChildren();list.replaceChildren();detail.replaceChildren();
  $('connection-status').textContent=graph.notes.join(' ')||graph.nodes.length+' records · '+graph.edges.length+' saved links. Select a record to inspect it.';
  function inspect(node){for(const b of nodes.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.kind===node.type));detail.replaceChildren(el('strong',node.label),el('p',node.type+' · '+node.detail));}
  for(const node of graph.nodes){
   const [x,y]=graph.nodes.length===1?[50,48]:positions[node.type],button=el('button',null,'connection-node');button.type='button';button.dataset.kind=node.type;button.style.setProperty('--node-x',x+'%');button.style.setProperty('--node-y',y+'%');button.setAttribute('aria-pressed','false');
   button.append(el('span',node.type,'connection-kind'),el('strong',node.label),el('span',node.detail,'connection-node-detail'));button.addEventListener('click',()=>inspect(node));nodes.append(button);
  }
  for(const edge of graph.edges){const [x1,y1]=positions[edge.from],[x2,y2]=positions[edge.to],line=document.createElementNS('http://www.w3.org/2000/svg','line');for(const [k,v]of Object.entries({x1:x1+'%',y1:y1+'%',x2:x2+'%',y2:y2+'%'}))line.setAttribute(k,v);svg.append(line);const from=graph.nodes.find(n=>n.key===edge.from),to=graph.nodes.find(n=>n.key===edge.to);list.append(el('li',from.type+': '+from.label+' → '+to.type+': '+to.label));}
  if(!graph.edges.length)list.append(el('li','No saved relationships for this task.'));
  if(graph.nodes[0])inspect(graph.nodes[0]);
 }
 $('connection-task').addEventListener('change',()=>{selected=$('connection-task').value;render()});
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function motion(){const input=$('connection-motion');input.disabled=reduced.matches;if(reduced.matches)input.checked=false;$('connections-panel').dataset.motion=String(input.checked&&!reduced.matches);}
 $('connection-motion').addEventListener('change',motion);reduced.addEventListener('change',motion);motion();
 window.addEventListener('ops-today-data',event=>{
  if(!event.detail){clear();return;}
  data=event.detail;const tasks=data.tasks.filter(t=>!t.archived_at).sort((a,b)=>String(a.task_title).localeCompare(String(b.task_title)));
  if(!tasks.some(t=>t.id===selected))selected=tasks[0]?.id||'';
  $('connection-task').replaceChildren(...tasks.map(t=>new Option(t.task_title,t.id)));$('connection-task').disabled=!tasks.length;$('connection-task').value=selected;
  if(!tasks.length){$('connection-task').add(new Option('No saved tasks',''));}
  render();
 });
 window.addEventListener('ops-auth-change',event=>{if(!event.detail?.user)clear()});
 clear();
})();
