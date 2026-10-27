/* Reviewable renewal inputs. No signing, PDF export or database writes until layout verification. */
(()=>{'use strict';
const R=window.OpsRenewalRules,cloud=window.OpsCloud,panel=document.getElementById('ops-renewals-panel');
if(!R||!cloud||!panel)return;
const $=id=>document.getElementById(id);
const section=document.createElement('section');section.id='ops-renewal-generator';
section.setAttribute('aria-label','Renewal lease preparation');
section.innerHTML=[
'<div class="section-head"><div><h2>Renewal Lease Generator · Preparation</h2><p>Select a unit, confirm the existing lease, and fill the new terms. Review the five-page lease, then download an unsigned PDF. PDF files are not stored in Supabase. Renewal status updates and notes are saved separately in the tracker below.</p></div></div>',
'<p class="renewal-warning">Lease dates and residents may be imported or historical. Verify against the signed lease before proceeding. This draft field review is not a lease or signature request.</p>',
'<form id="renewal-form"><div class="renewal-grid">',
'<label class="renewal-span">Property / Unit<select id="renewal-unit" required><option value="">Select property / unit</option></select></label>',
'<label class="renewal-span">Current lease record<select id="renewal-lease" required><option value="">Select expiring lease</option></select></label>',
'<label>Lease generation date (Kentucky)<input id="renewal-date" type="text" readonly></label>',
'<label>Deposit<input type="text" value="Amt: carried over" readonly></label>',
'<label>New start date<input id="renewal-start" type="date" required></label>',
'<label>New end date<input id="renewal-end" type="date" required></label>',
'<label>New monthly rent ($)<input id="renewal-rent" inputmode="decimal" placeholder="4,000.00" required></label>',
'<label>5% / 10% late charges<input id="renewal-fees" type="text" readonly placeholder="Calculated from rent"></label>',
'<label class="renewal-span">Tenants (name(s), verify)<input id="renewal-tenant" maxlength="500" required></label>',
'<label class="renewal-span">Tenant email(s)<input id="renewal-emails" maxlength="500" placeholder="Verified emails"></label>',
'<label class="renewal-span">Street address / unit<input id="renewal-address" maxlength="500" required></label>',
'<label class="renewal-span">City / state / ZIP<input id="renewal-cityline" maxlength="200" required></label>',
'</div><h3>Occupants · A–E</h3><div id="renewal-occupants" class="renewal-grid"></div>',
'<div class="renewal-grid"><label class="renewal-span">F · Pets / descriptions<textarea id="renewal-pets" maxlength="500" rows="2" placeholder="List pets or enter None"></textarea></label></div>',
'<h3>Utilities · X goes under one responsible party</h3><div id="renewal-utilities"></div>',
'<h3>Appliances · Yes / No</h3><div id="renewal-appliances"></div>',
'<label class="renewal-check"><input id="renewal-verified" type="checkbox"><span>I verified the current tenants, property, expiring lease and carried-over deposit against the actual records. Imported values are suggestions only.</span></label>',
'<div class="renewal-actions"><button type="submit" class="button primary">Review renewal inputs</button><span class="status" id="renewal-status" role="status"></span></div>',
'</form><div class="renewal-summary" id="renewal-output" hidden><h3>Renewal field review · Not a lease</h3><div id="renewal-preview"></div><p class="ops-muted">No renewal record is saved and no signature is added. Download only after checking all fields against the original records.</p></div>'
].join('');
panel.insertBefore(section,panel.firstChild);
function choice(id,label,values){
 const row=document.createElement('div');row.className='renewal-choice-grid';
 const title=document.createElement('label');title.htmlFor=id;title.textContent=label;
 const select=document.createElement('select');select.id=id;select.required=true;
 select.add(new Option('Choose…',''));for(const v of values)select.add(new Option(v,v));
 row.append(title,select);return row;
}
R.utilities.forEach((key,i)=>$('renewal-utilities').append(choice('renewal-utility-'+i,key,['Landlord','Tenant'])));
R.appliances.forEach((key,i)=>$('renewal-appliances').append(choice('renewal-appliance-'+i,key,['Yes','No'])));
for(let i=0;i<5;i++){
 const label=document.createElement('label');label.textContent=String.fromCharCode(65+i)+' · Occupant';
 const input=document.createElement('input');input.id='renewal-occupant-'+i;input.maxLength=150;input.placeholder=i?'Optional occupant':'Occupant name';label.append(input);$('renewal-occupants').append(label);
}
let data=null,index=null;
const address=(prop,unit)=>[prop?.street_address,unit?.unit_label&&unit.unit_label!=='MAIN'?unit.unit_label:''].filter(Boolean).join(' ');
const line=prop=>[prop?.city,prop?.state].filter(Boolean).join(', ')+(prop?.postal_code?' '+prop.postal_code:'');
function resetReview(){$('renewal-output').hidden=true;$('renewal-status').textContent='';}
function refresh(){
 data=cloud.user?window.OpsPortfolio?.getData():null;
 index=data?{p:new Map(data.properties.map(x=>[x.id,x])),u:new Map(data.units.map(x=>[x.id,x])),people:new Map(data.people.map(x=>[x.id,x])),parties:new Map(),leases:new Map()}:null;
 $('renewal-unit').replaceChildren(new Option(data?'Select property / unit':'Sign in to load protected units',''));
 if(!data){$('renewal-form').reset();$('renewal-date').value='';resetReview();return;}
 for(const p of data.parties||[]){const xs=index.parties.get(p.tenancy_id)||[];xs.push(p);index.parties.set(p.tenancy_id,xs)}
 for(const l of data.leases||[]){const xs=index.leases.get(l.unit_id)||[];xs.push(l);index.leases.set(l.unit_id,xs)}
 for(const unit of data.units){const prop=index.p.get(unit.property_id);if(!prop)continue;
  $('renewal-unit').add(new Option(address(prop,unit)+' · '+line(prop)+' · '+unit.unit_code,unit.id));
 }
 $('renewal-date').value=R.displayDate(R.leaseDate());resetReview();
}
function selectedLease(){return (index?.leases.get($('renewal-unit').value)||[]).find(x=>x.id===$('renewal-lease').value)||null}
function chooseUnit(){
 resetReview();$('renewal-verified').checked=false;
 const unit=index?.u.get($('renewal-unit').value),prop=index?.p.get(unit?.property_id);
 $('renewal-address').value=unit?address(prop,unit):'';$('renewal-cityline').value=unit?line(prop):'';
 const list=(index?.leases.get(unit?.id)||[]).slice().sort((a,b)=>String(b.term_end||'').localeCompare(String(a.term_end||'')));
 $('renewal-lease').replaceChildren(new Option('Choose existing lease · verify status',''));
 for(const l of list)$('renewal-lease').add(new Option([l.lease_label||l.source_lease_key,l.term_start,l.term_end,l.lease_status,'verification: '+l.verification_status].filter(Boolean).join(' · '),l.id));
 $('renewal-tenant').value='';$('renewal-emails').value='';
 for(let i=0;i<5;i++)$('renewal-occupant-'+i).value='';
 $('renewal-start').value='';$('renewal-end').value='';
 if(list.length===1){$('renewal-lease').value=list[0].id;chooseLease()}
}
function chooseLease(){
 resetReview();$('renewal-verified').checked=false;const lease=selectedLease();if(!lease)return;
 const people=(index.parties.get(lease.tenancy_id)||[]).map(r=>index.people.get(r.person_id)).filter(Boolean);
 $('renewal-tenant').value=people.map(p=>p.display_name).filter(Boolean).join(' and ');
 $('renewal-emails').value=people.map(p=>p.email).filter(Boolean).join('; ');
 for(let i=0;i<5;i++)$('renewal-occupant-'+i).value=people[i]?.display_name||'';
 const term=R.suggestTerm(lease.term_start,lease.term_end);
 $('renewal-start').value=term?.start||'';$('renewal-end').value=term?.end||'';
 $('renewal-status').textContent=term?'Dates suggested from existing lease. Verify.':'No reliable existing term. Enter dates manually.';
}
function state(){
 const s={unitId:$('renewal-unit').value,leaseId:$('renewal-lease').value,verified:$('renewal-verified').checked,
 start:$('renewal-start').value,end:$('renewal-end').value,rent:$('renewal-rent').value,
 tenantName:$('renewal-tenant').value,emails:$('renewal-emails').value,
 address:$('renewal-address').value,cityline:$('renewal-cityline').value,
 occupants:Array.from({length:5},(_,i)=>$('renewal-occupant-'+i).value.trim()),
 pets:$('renewal-pets').value.trim(),utilities:{},appliances:{}};
 R.utilities.forEach((k,i)=>s.utilities[k]=$('renewal-utility-'+i).value);
 R.appliances.forEach((k,i)=>s.appliances[k]=$('renewal-appliance-'+i).value);
 return s;
}
function charges(){
 const cents=R.moneyCents($('renewal-rent').value);
 $('renewal-fees').value=cents>0?R.formatCents(R.fees(cents).five)+' / '+R.formatCents(R.fees(cents).ten):'';
 resetReview();
}
function review(event){
 event.preventDefault();
 if(!cloud.user||!data){$('renewal-status').textContent='Sign in to the protected portfolio first.';return}
 const s=state(),errors=R.validate(s);
 if(!s.cityline.trim())errors.push('Confirm the city, state and ZIP.');
 if(s.occupants.every(x=>!x))errors.push('Confirm at least one occupant.');
 if(errors.length){$('renewal-status').textContent=errors.join(' ');$('renewal-output').hidden=true;return}
 const cents=R.moneyCents(s.rent),late=R.fees(cents);
 const fields=[['Date of lease',R.displayDate(R.leaseDate())],['Beginning term',R.displayDate(s.start)],
 ['Ending term',R.displayDate(s.end)],['Monthly rental',R.formatCents(cents)],['Deposit','Amt: carried over'],
 ['Tenant(s)',s.tenantName],['Email(s)',s.emails||'Not recorded'],['Address',s.address+', '+s.cityline],
 ['Occupants',s.occupants.filter(Boolean).join('; ')],['Pets',s.pets||'Not specified'],
 ['Landlord','Joe Burnett Jr. dba Oaktown Rentals'],['5% late charge',R.formatCents(late.five)],
 ['10% late charge',R.formatCents(late.ten)]];
 const lines=fields.map(pair=>pair[0]+': '+pair[1]);
 lines.push('Utilities: '+R.utilities.map(k=>k+' ['+(s.utilities[k]==='Landlord'?'X Landlord':'X Tenant')+']').join('; '));
 lines.push('Appliances: '+R.appliances.map(k=>k+': '+s.appliances[k]).join('; '));
 $('renewal-preview').textContent=lines.join('\n');
 $('renewal-output').hidden=false;$('renewal-status').textContent='Review populated. Download the unsigned five-page PDF after checking these values.';
 $('renewal-output').scrollIntoView({block:'nearest',behavior:'smooth'});
}
$('renewal-unit').addEventListener('change',chooseUnit);
$('renewal-lease').addEventListener('change',chooseLease);
$('renewal-rent').addEventListener('input',charges);
$('renewal-form').addEventListener('submit',review);
$('renewal-form').addEventListener('input',event=>{if(event.target.id!=='renewal-rent')resetReview()});
window.addEventListener('ops-portfolio-loaded',refresh);
window.addEventListener('ops-auth-change',event=>{if(!event.detail.user)refresh()});
refresh();
const pdfButton=document.createElement('button');
pdfButton.id='renewal-download-pdf';pdfButton.type='button';pdfButton.className='button primary';
pdfButton.textContent='Download five-page renewal lease PDF';pdfButton.hidden=true;
const pdfStatus=document.createElement('span');pdfStatus.className='status';pdfStatus.id='renewal-pdf-status';
const actions=document.createElement('div');actions.className='renewal-actions';actions.append(pdfButton,pdfStatus);
$('renewal-output').append(actions);
let reviewed=null;
$('renewal-form').addEventListener('submit',()=>{
 reviewed=$('renewal-output').hidden?null:JSON.stringify(state());
 pdfButton.hidden=!reviewed;
 pdfStatus.textContent='';
});
$('renewal-form').addEventListener('input',()=>{pdfButton.hidden=true;reviewed=null;});
$('renewal-form').addEventListener('change',()=>{pdfButton.hidden=true;reviewed=null;});
window.addEventListener('ops-auth-change',event=>{if(!event.detail.user){pdfButton.hidden=true;reviewed=null;}});
window.addEventListener('ops-portfolio-loaded',()=>{pdfButton.hidden=true;reviewed=null;});
pdfButton.onclick=async()=>{
 if(!cloud.user||!reviewed||$('renewal-output').hidden||JSON.stringify(state())!==reviewed){
  pdfStatus.textContent='Review and confirm the current fields before exporting.';return;
 }
 pdfButton.disabled=true;pdfStatus.textContent='Preparing all five lease pages…';
 try{
  const engine=window.OpsRenewalPDF;
  if(!engine)throw Error('Renewal PDF renderer did not load. Reload the app.');
  const userId=cloud.user.id;
  const result=await engine.generate(state(),{
   rules:R,JsPDF:window.jspdf?.jsPDF,viewerUser:()=>cloud.user?.id||null
  });
  if(cloud.user?.id!==userId)throw Error('Account changed; download cancelled.');
  result.pdf.save(engine.filename(result.model));
  pdfStatus.textContent='Five-page unsigned PDF downloaded. No database records or signatures were changed.';
 }catch(error){pdfStatus.textContent='Could not generate PDF: '+error.message;}
 finally{pdfButton.disabled=false;}
};
})();