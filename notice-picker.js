/* Notices: choose portfolio units, then create editable drafts in the existing studio.
   Protected names are NOT inferred from historical tenancies. No sensitive data is stored here. */
(()=>{'use strict';
const cloud=window.OpsCloud;
const $=id=>document.getElementById(id);
if(!cloud||!$('notice-picker'))return;
let items=[],chosen=new Set(),generation=0,loading=false,making=false,bulkRows=[],bulkActive=false,bulkOrder=[];
const bulk=window.OpsNoticeBulk;
const state=message=>{$('notice-picker-status').textContent=message};
const unitName=u=>{
 const label=String(u.unit_label||'').trim();
 return !label||label.toUpperCase()==='MAIN'?'':/^\d+[A-Za-z]?$/.test(label)?'Unit '+label:label;
};
const labelOf=item=>[item.prop.street_address,unitName(item.unit)].filter(Boolean).join(' · ');
function resetBulk(clearInput=false){bulkRows=[];bulkOrder=[];bulkActive=false;if(clearInput)$('notice-bulk-input').value='';$('notice-bulk-results').replaceChildren();$('notice-bulk-status').textContent='';}
function syncBulk(){
 if(!bulkActive||!bulk)return;
 const review=bulk.review(bulkRows);
 bulkOrder=review.selectedIds;
 chosen=new Set(bulkOrder);
 const host=$('notice-bulk-results');host.replaceChildren();
 bulkRows.forEach((row,index)=>{
  const wrap=document.createElement('div');wrap.className='notice-bulk-result';
  const heading=line('strong',(index+1)+'. '+row.text);wrap.append(heading);
  if(row.matches.length===1){
   wrap.append(line('span','Matched: '+labelOf(row.matches[0])));
  }else{
   const select=document.createElement('select');
   select.setAttribute('aria-label','Choose property for '+row.text);
   const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=row.matches.length?'Choose unit or property ('+row.matches.length+' matches)':'No match — edit the list and match again';select.append(placeholder);
   for(const item of row.matches){const opt=document.createElement('option');opt.value=item.unit.id;opt.textContent=labelOf(item);select.append(opt)}
   select.value=row.selectedId;
   select.disabled=!row.matches.length||making;
   select.addEventListener('change',()=>{row.selectedId=select.value;syncBulk();draw()});
   wrap.append(select);
  }
  if(review.duplicateIds.includes(row.selectedId))wrap.append(line('small','This unit is already used in your list. Choose another unit or remove the duplicate line.','notice-bulk-warning'));
  host.append(wrap);
 });
 $('notice-bulk-status').textContent=bulkRows.length+' list entries · '+review.unresolved+' need a choice'+(review.duplicateIds.length?' · duplicate unit selected':'')+'. '+(review.ready?'Ready to create ordered drafts.':'Resolve every entry before creating drafts.');
}
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
function selectionFeedback(matches=matching()){
 const shownSelected=matches.filter(item=>chosen.has(item.unit.id)).length;
 const outside=chosen.size-shownSelected;
 $('notice-picker-count').textContent=matches.length+' of '+items.length+' units shown';
 $('notice-picker-selection-summary').textContent=chosen.size?chosen.size+' selected'+(outside?' · '+outside+' outside this search':''):'No units selected';
 $('notice-picker-reset-search').hidden=!$('notice-picker-search').value;
 $('notice-picker-list').setAttribute('aria-busy',String(loading||making));
 $('notice-picker-make').disabled=!chosen.size||!cloud.user||making||loading||(bulkActive&&!bulk.review(bulkRows).ready);
 $('notice-picker-make').textContent='Create drafts'+(chosen.size?' ('+chosen.size+')':'');
 $('notice-picker-select-matching').disabled=!matches.length||making||bulkActive;
 $('notice-picker-clear').disabled=!chosen.size||making||loading;
 $('notice-picker-refresh').disabled=making||loading||!cloud.user;
 $('notice-picker-list').querySelectorAll('input').forEach(check=>{check.disabled=making||loading});
 for(const id of ['notice-bulk-input','notice-bulk-match','notice-bulk-reset'])$(id).disabled=making||loading||!cloud.user;
}
function draw(){
 const matches=matching(),host=$('notice-picker-list');host.replaceChildren();
 selectionFeedback(matches);
 for(const item of matches){
  const row=document.createElement('label');row.className='notice-picker-row';
  const check=document.createElement('input');check.type='checkbox';check.checked=chosen.has(item.unit.id);check.disabled=making||loading;check.setAttribute('aria-label','Select '+labelOf(item));
  check.addEventListener('change',()=>{if(bulkActive)resetBulk();if(check.checked)chosen.add(item.unit.id);else chosen.delete(item.unit.id);selectionFeedback()});
  const body=line('span','');body.className='notice-picker-row-body';
  body.append(line('strong',labelOf(item)),line('small',[item.prop.city,item.prop.state,item.prop.postal_code,item.unit.occupancy_status].filter(Boolean).join(' · ')),line('small',item.tenant?(item.tenant+' · Verify imported recipient'):item.tenantSource));
  row.append(check,body);host.append(row);
 }
 if(!matches.length&&items.length)host.append(line('p','No units match this search. Try a street, ZIP or unit number, or clear the search.','picker-empty'));
}
async function refresh(){
 if(!cloud.user){state('Sign in to access protected properties.');return}
 if(loading||making)return;loading=true;const gen=++generation,account=cloud.user.id;
 $('notice-picker-refresh').disabled=true;state('Loading the complete property and unit directory…');selectionFeedback();
 try{
  const [props,units,addressees,tenancies,parties,people,leases,propertyAliases,unitAliases]=await Promise.all([
   cloud.api('/rest/v1/properties?select=id,street_address,city,state,postal_code,landlord_entity,portfolio_state&order=street_address.asc&limit=300'),
   cloud.api('/rest/v1/units?select=id,property_id,unit_code,unit_label,unit_class,occupancy_status&order=unit_code.asc&limit=300'),
   cloud.api('/rest/v1/property_addressees?select=property_id,notice_addressee_text&limit=300'),
   cloud.api('/rest/v1/tenancies?select=id,unit_id,status&limit=300'),
   cloud.api('/rest/v1/tenancy_people?select=tenancy_id,person_id,party_role,to_date&limit=400'),
   cloud.api('/rest/v1/people?select=id,display_name,email&limit=300'),
   cloud.api('/rest/v1/leases?select=unit_id,tenancy_id&limit=300'),
   // Alias indexes are optional for matching; a failed alias lookup must not block address-based notice selection.
   cloud.api('/rest/v1/property_aliases?select=property_id,alias&limit=500').catch(()=>[]),
   cloud.api('/rest/v1/unit_aliases?select=unit_id,alias&limit=500').catch(()=>[])
  ]);
  if(gen!==generation||cloud.user?.id!==account)return;
  const p=new Map(props.map(x=>[x.id,x])),counts=new Map();
  for(const u of units)counts.set(u.property_id,(counts.get(u.property_id)||0)+1);
  const recips=new Map(addressees.map(x=>[x.property_id,x.notice_addressee_text]));
  const propertyAliasMap=new Map(),unitAliasMap=new Map();
  for(const alias of propertyAliases){const arr=propertyAliasMap.get(alias.property_id)||[];arr.push(alias.alias);propertyAliasMap.set(alias.property_id,arr)}
  for(const alias of unitAliases){const arr=unitAliasMap.get(alias.unit_id)||[];arr.push(alias.alias);unitAliasMap.set(alias.unit_id,arr)}
  items=units.filter(u=>p.has(u.property_id)).map(unit=>{
   const prop=p.get(unit.property_id),sole=counts.get(unit.property_id)===1;
   const linked=window.OpsNoticeRecipient.fromUnit(unit.id,{tenancies,parties,people});
   const existing=sole?String(recips.get(prop.id)||'').trim():'';
   const tenant=existing||linked.name;
   const tenantSource=existing?'Existing address addressee (verify)':linked.reason;
   const search=[prop.street_address,prop.city,prop.state,prop.postal_code,unitName(unit),unit.unit_code,unit.unit_class,unit.occupancy_status].join(' ').toLowerCase();
   return {unit,prop,tenant,tenantSource,sole,search,unitDisplay:unitName(unit),propertyAliases:propertyAliasMap.get(prop.id)||[],unitAliases:unitAliasMap.get(unit.id)||[]};
  }).sort((a,b)=>labelOf(a).localeCompare(labelOf(b),undefined,{numeric:true}));
  chosen=new Set([...chosen].filter(id=>items.some(x=>x.unit.id===id)));
  if(bulkActive){const previous=bulkRows.map(row=>({text:row.text,selectedId:row.selectedId}));bulkRows=bulk.matchList(previous.map(row=>row.text),items);for(let i=0;i<bulkRows.length;i++)if(bulkRows[i].matches.some(x=>x.unit.id===previous[i].selectedId))bulkRows[i].selectedId=previous[i].selectedId;syncBulk();}
  // Share only this authenticated in-memory snapshot; never write contact emails into notice batches.
  window.dispatchEvent(new CustomEvent('ops-notice-contacts-loaded',{detail:{units,leases,parties,people}}));
  state(items.length+' units and lots ready. Current tenancy names are suggested when linked; verify them in each notice before use.');
  draw();
 }catch(e){if(gen===generation)state('Could not load portfolio: '+e.message)}
 finally{if(gen===generation){loading=false;$('notice-picker-refresh').disabled=false;selectionFeedback()}}
}
$('notice-picker-refresh').onclick=refresh;
$('notice-bulk-input').addEventListener('input',()=>{if(bulkActive){chosen.clear();resetBulk();draw();state('List changed. Match it again before creating drafts.')}});
$('notice-bulk-reset').onclick=()=>{resetBulk(true);chosen.clear();draw();state('Pasted list cleared. Select units or paste a new list.')};
$('notice-bulk-match').onclick=()=>{
 if(!bulk){state('Bulk matching is unavailable. Reload the page.');return}
 if(loading||making){state('Wait for the current operation to finish.');return}
 if(!cloud.user||!items.length){state('Sign in and load the portfolio before matching a list.');return}
 try{
  const names=bulk.parse($('notice-bulk-input').value);
  if(!names.length){chosen.clear();resetBulk();draw();state('Paste one property or unit per line.');return}
  bulkRows=bulk.matchList(names,items);bulkActive=true;syncBulk();draw();
  state('Review the list matches below. Ambiguous or missing units must be resolved before drafting.');
 }catch(e){chosen.clear();resetBulk();draw();state(e.message)}
};
$('notice-picker-search').addEventListener('input',draw);
$('notice-picker-reset-search').onclick=()=>{$('notice-picker-search').value='';draw();$('notice-picker-search').focus()};
$('notice-picker-select-matching').onclick=()=>{
 if(bulkActive)resetBulk();
 for(const item of matching())chosen.add(item.unit.id);
 draw();
};
$('notice-picker-clear').onclick=()=>{chosen.clear();resetBulk();draw()};
$('notice-picker-make').onclick=()=>{
 if(making)return;
 if(!cloud.user){$('account-button').click();state('Sign in to create drafts.');return}
 if(bulkActive&&!bulk.review(bulkRows).ready){state('Resolve all pasted-list entries and duplicate units before creating drafts.');return}
 const selected=bulkActive?bulk.orderedItems(items,bulkOrder):items.filter(x=>chosen.has(x.unit.id));if(!selected.length){state('Select at least one property.');return}
 if(selected.length>250){state('Select 250 or fewer units in one batch.');return}
 const iframe=$('studio-frame');
 if(!iframe?.contentWindow||iframe.contentDocument?.readyState!=='complete'){state('The notice editor is loading. Try Create drafts again.');return}
 const properties=selected.map(x=>({
   id:x.unit.id,legacyPropertyId:x.sole?x.prop.id:'',
   street:[x.prop.street_address,unitName(x.unit)].filter(Boolean).join(' '),
   cityline:[x.prop.city+', '+x.prop.state,x.prop.postal_code].filter(Boolean).join(' '),
   tenant:x.tenant,
   owner:x.prop.landlord_entity||''
 }));
 making=true;draw();state('Preparing '+selected.length+' editable notice draft(s)…');
 iframe.contentWindow.postMessage({type:'oaktown-import-properties',properties,ordered:bulkActive},location.origin);
};
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==$('studio-frame').contentWindow||!event.data||event.data.type!=='oaktown-import-confirmed'||!making)return;
 making=false;
 const msg=event.data;
 if(msg.added||msg.updated){
  chosen.clear();if(bulkActive)resetBulk(true);
  const heading=$('notice-editor-title');
  heading.focus({preventScroll:true});
  $('notice-editor-overview').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  state((msg.added||0)+' created, '+(msg.updated||0)+' existing notice(s) refreshed. Verify names, charges and dates in the editor below.');draw();
 }else{state('No notices were created. Review the selection and retry.');draw()}
});
window.addEventListener('ops-auth-change',event=>{
 generation++;loading=false;$('notice-picker-refresh').disabled=false;
 items=[];chosen.clear();resetBulk(true);making=false;window.dispatchEvent(new CustomEvent('ops-notice-contacts-loaded',{detail:null}));draw();
 if(!event.detail.user)state('Sign in to search protected units and create drafts.');else refresh();
});
state('Sign in to search protected units and create drafts.');
draw();
})();
