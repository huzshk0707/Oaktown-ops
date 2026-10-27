/* Notices: choose portfolio units, then create editable drafts in the existing studio.
   Protected names are NOT inferred from historical tenancies. No sensitive data is stored here. */
(()=>{'use strict';
const cloud=window.OpsCloud;
const $=id=>document.getElementById(id);
if(!cloud||!$('notice-picker'))return;
let items=[],chosen=new Set(),generation=0,loading=false,making=false;
const state=message=>{$('notice-picker-status').textContent=message};
const unitName=u=>{
 const label=String(u.unit_label||'').trim();
 return !label||label.toUpperCase()==='MAIN'?'':/^\d+[A-Za-z]?$/.test(label)?'Unit '+label:label;
};
const labelOf=item=>[item.prop.street_address,unitName(item.unit)].filter(Boolean).join(' · ');
const line=(tag,value,cls)=>{const e=document.createElement(tag);e.textContent=String(value??'');if(cls)e.className=cls;return e};
function matching(){
 const raw=$('notice-picker-search').value.trim().toLowerCase();
 const q=raw.split(/\s+/).filter(Boolean);
 // For phrases such as "1106 Unit 1", require that exact unit number.
 // Otherwise house number "1106" would also match "Unit 8" by token.
 const explicitUnit=raw.match(/(?:^|\s)unit\s+(\d+[a-z]?)(?=\s|$)/);
 const explicitLot=raw.match(/(?:^|\s)lot\s+(\d+[a-z]?)(?=\s|$)/);
 return items.filter(item=>{
  if(explicitUnit&&unitName(item.unit).toLowerCase()!=='unit '+explicitUnit[1])return false;
  if(explicitLot&&unitName(item.unit).toLowerCase()!=='lot '+explicitLot[1])return false;
  return q.every(word=>item.search.includes(word));
 });
}
function draw(){
 const matches=matching(),host=$('notice-picker-list');host.replaceChildren();
 const cap=$('notice-picker-count');cap.textContent=matches.length+' of '+items.length+' units shown · '+chosen.size+' selected';
 $('notice-picker-make').disabled=!chosen.size||!cloud.user||making;
 $('notice-picker-make').textContent='Make Notices'+(chosen.size?' ('+chosen.size+')':'');
 $('notice-picker-select-matching').disabled=!matches.length||making;
 $('notice-picker-clear').disabled=!chosen.size||making;
 for(const item of matches){
  const row=document.createElement('label');row.className='notice-picker-row';
  const check=document.createElement('input');check.type='checkbox';check.checked=chosen.has(item.unit.id);check.disabled=making;check.setAttribute('aria-label','Select '+labelOf(item));
  check.addEventListener('change',()=>{if(check.checked)chosen.add(item.unit.id);else chosen.delete(item.unit.id);draw()});
  const body=line('span','');body.className='notice-picker-row-body';
  body.append(line('strong',labelOf(item)),line('small',[item.prop.city,item.prop.state,item.prop.postal_code,item.unit.occupancy_status].filter(Boolean).join(' · ')));
  row.append(check,body);host.append(row);
 }
 if(!matches.length&&items.length)host.append(line('p','No properties match that search.','ops-muted'));
}
async function refresh(){
 if(!cloud.user){state('Sign in to select properties from the portfolio.');return}
 if(loading)return;loading=true;const gen=++generation,account=cloud.user.id;
 $('notice-picker-refresh').disabled=true;state('Loading the complete property and unit directory…');
 try{
  const [props,units,addressees]=await Promise.all([
   cloud.api('/rest/v1/properties?select=id,street_address,city,state,postal_code,landlord_entity,portfolio_state&order=street_address.asc&limit=300'),
   cloud.api('/rest/v1/units?select=id,property_id,unit_code,unit_label,unit_class,occupancy_status&order=unit_code.asc&limit=300'),
   cloud.api('/rest/v1/property_addressees?select=property_id,notice_addressee_text&limit=300')
  ]);
  if(gen!==generation||cloud.user?.id!==account)return;
  const p=new Map(props.map(x=>[x.id,x])),counts=new Map();
  for(const u of units)counts.set(u.property_id,(counts.get(u.property_id)||0)+1);
  const recips=new Map(addressees.map(x=>[x.property_id,x.notice_addressee_text]));
  items=units.filter(u=>p.has(u.property_id)).map(unit=>{
   const prop=p.get(unit.property_id),sole=counts.get(unit.property_id)===1;
   const tenant=sole?(recips.get(prop.id)||''):'';
   const search=[prop.street_address,prop.city,prop.state,prop.postal_code,unitName(unit),unit.unit_code,unit.unit_class,unit.occupancy_status].join(' ').toLowerCase();
   return {unit,prop,tenant,sole,search};
  }).sort((a,b)=>labelOf(a).localeCompare(labelOf(b),undefined,{numeric:true}));
  chosen=new Set([...chosen].filter(id=>items.some(x=>x.unit.id===id)));
  state(items.length+' units and lots ready. Choose one or more, then tap Make Notices. Missing recipients will be completed in the editor.');
  draw();
 }catch(e){if(gen===generation)state('Could not load portfolio: '+e.message)}
 finally{if(gen===generation){loading=false;$('notice-picker-refresh').disabled=false}}
}
$('notice-picker-refresh').onclick=refresh;
$('notice-picker-search').addEventListener('input',draw);
$('notice-picker-select-matching').onclick=()=>{
 for(const item of matching())chosen.add(item.unit.id);
 draw();
};
$('notice-picker-clear').onclick=()=>{chosen.clear();draw()};
$('notice-picker-make').onclick=()=>{
 if(making)return;
 if(!cloud.user){$('account-button').click();state('Sign in to make notices.');return}
 const selected=items.filter(x=>chosen.has(x.unit.id));if(!selected.length){state('Select at least one property.');return}
 if(selected.length>250){state('Select 250 or fewer units in one batch.');return}
 const iframe=$('studio-frame');
 if(!iframe?.contentWindow||iframe.contentDocument?.readyState!=='complete'){state('The notice editor is loading. Try Make Notices again.');return}
 const properties=selected.map(x=>({
   id:x.unit.id,legacyPropertyId:x.sole?x.prop.id:'',
   street:[x.prop.street_address,unitName(x.unit)].filter(Boolean).join(' '),
   cityline:[x.prop.city+', '+x.prop.state,x.prop.postal_code].filter(Boolean).join(' '),
   tenant:x.tenant,
   owner:x.prop.landlord_entity||''
 }));
 making=true;draw();state('Preparing '+selected.length+' editable notice draft(s)…');
 iframe.contentWindow.postMessage({type:'oaktown-import-properties',properties},location.origin);
};
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==$('studio-frame').contentWindow||!event.data||event.data.type!=='oaktown-import-confirmed'||!making)return;
 making=false;
 const msg=event.data;
 if(msg.added||msg.updated){
  chosen.clear();$('studio-frame').scrollIntoView({behavior:'smooth',block:'start'});
  state((msg.added||0)+' created, '+(msg.updated||0)+' existing notice(s) refreshed. Complete names, landlord, charges and dates in the editor below.');draw();
 }else{state('No notices were created. Review the selection and retry.');draw()}
});
window.addEventListener('ops-auth-change',event=>{
 generation++;loading=false;$('notice-picker-refresh').disabled=false;
 if(!event.detail.user){items=[];chosen.clear();making=false;draw();state('Sign in to search all portfolio properties and make notices.');}
 else refresh();
});
state('Sign in to search all portfolio properties and make notices.');
draw();
})();
