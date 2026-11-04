/* Staff-only, in-memory new-lease prototype. Export awaits clean approved masters. */
(()=>{'use strict';
 const M=window.OpsLeasePreparation,R=window.OpsRenewalRules,cloud=window.OpsCloud,panel=document.getElementById('new-lease-panel');
 if(!M||!R||!cloud||!panel)return;
 const $=id=>document.getElementById('newlease-'+id);
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
 const button=(text,fn,cls='button')=>{const b=el('button',cls,text);b.type='button';b.addEventListener('click',fn);return b};
 const tool=el('div','lease-draft-tool'),title=el('h2','','Prepare a new lease');title.id='new-lease-title';title.tabIndex=-1;
 tool.append(el('span','lease-draft-badge','DRAFT · TEMPLATE MATCHING IN PROGRESS'),title,el('p','guide-hint','Use confirmed application and deposit details, then review the new tenancy’s terms and unit condition sheet.'));
 const blockers=el('details','lease-draft-sources');blockers.append(el('summary','','PDF materials still needed'));
 const sourceList=el('ul');for(const reason of M.sourceBlockers)sourceList.append(el('li','',reason));blockers.append(sourceList);
 tool.append(blockers);
 const locked=el('div','lease-draft-lock');locked.append(el('p','','Sign in with your approved staff account to enter lease details.'),button('Sign in',()=>document.getElementById('account-button').click(),'button primary'));tool.append(locked);
 const work=el('div'),form=el('form');form.id='newlease-form';form.autocomplete='off';form.noValidate=true;form.addEventListener('submit',e=>e.preventDefault());
 const toolbar=el('div','lease-draft-toolbar'),modeControls=el('div','guide-segments');modeControls.setAttribute('role','group');modeControls.setAttribute('aria-label','New lease reading mode');
 let all=false,step=0,conditions={},roomLabels={},room='kitchen',userId=cloud.user?.id||null,lastUnit='',units=new Map(),manualFive=false,manualTen=false,dirty=false;
 const one=button('One step',()=>{all=false;render()}),every=button('View all',()=>{all=true;render()});modeControls.append(one,every);toolbar.append(modeControls,button('Clear draft',()=>reset()));
 const nav=el('nav','guide-form-nav');nav.setAttribute('aria-label','New lease preparation steps');const jumps=[],steps=[];
 const names=['Handoff','Page 1 · Terms','People & services','Page 8 · Conditions','Late charges & review'];
 names.forEach((name,i)=>{
  const jump=button((i+1)+'. '+name,()=>{step=i;render();steps[i].querySelector('h3').focus()},'guide-form-jump');jumps.push(jump);nav.append(jump);
  const area=el('section','guide-form-step');area.dataset.newLeaseStep=String(i);const h=el('h3','guide-step-title',name);h.tabIndex=-1;area.append(el('span','guide-eyebrow','STEP '+(i+1)+' OF '+names.length),h);steps.push(area);
 });
 function grid(parent){const g=el('div','lease-draft-grid');parent.append(g);return g}
 function input(parent,id,label,{type='text',hint='',placeholder='',values=null}={}){
  const wrap=el('label','lease-draft-field',label);wrap.htmlFor='newlease-'+id;
  const n=el(values?'select':type==='textarea'?'textarea':'input');n.id='newlease-'+id;n.name=id;
  if(values){for(const [value,text] of values)n.add(new Option(text,value))}
  else if(type!=='textarea')n.type=type;
  n.autocomplete='off';if(!values){n.maxLength=type==='textarea'?1500:500;if(placeholder)n.placeholder=placeholder}
  wrap.append(n);if(hint)wrap.append(el('small','guide-hint',hint));parent.append(wrap);return n;
 }
 function check(parent,id,label){const wrap=el('label','lease-draft-check'),n=el('input');n.type='checkbox';n.id='newlease-'+id;wrap.append(n,el('span','',label));parent.append(wrap);return n}
 steps[0].append(el('p','guide-hint','Check the handoff yourself. Nothing here marks an application approved or a deposit paid.'));
 check(steps[0],'approvalReviewed','I reviewed Leslie’s documented approval / authorized handoff.');
 check(steps[0],'depositStepReviewed','I reviewed the preceding non-refundable-deposit step and its current status.');
 input(steps[0],'handoffNote','Handoff reference / remaining questions (optional)',{type:'textarea',placeholder:'Reference or date; do not paste screening or payment records.'});
 const picker=input(steps[1],'unit','Property / unit from the protected portfolio (optional)',{values:[['','Choose a unit, or type the exact address below']],hint:'Changing the selected unit starts a fresh draft. Existing tenant names are never copied into a new tenancy.'});
 const terms=grid(steps[1]);
 input(terms,'address','Exact street address / unit');input(terms,'cityline','City / state / ZIP');
 input(terms,'leaseDate','Date of lease',{type:'date'});input(terms,'rent','Monthly rental ($)',{placeholder:'e.g. 1,500.00'});
 input(terms,'start','Beginning term',{type:'date'});input(terms,'end','Ending term',{type:'date'});
 const money=el('details','lease-draft-money');money.append(el('summary','','Deposit and fee components'));const components=grid(money);
 input(components,'securityDeposit','Security deposit ($, if confirmed)');input(components,'petDeposit','Pet deposit ($, if confirmed)');
 input(components,'otherFee','Other one-time fee ($, if confirmed)');input(components,'otherFeeDescription','What is the other fee?');
 input(components,'petRent','Monthly pet rent ($, if confirmed)');
 money.append(el('p','guide-hint','These components are separate. No total, non-refundable-deposit credit, pet charge or fee rule is assumed while your instructions are pending.'));
 steps[1].append(money);input(steps[1],'deposit','Confirmed amount to print in the lease’s Deposit box ($)',{hint:'Enter the approved amount explicitly, including zero. Components above are not automatically added.'});
 const people=grid(steps[2]);input(people,'tenantName','Tenant name(s)',{type:'textarea'});input(people,'emails','Tenant email(s)',{type:'textarea',hint:'Separate addresses with a semicolon, comma or new line.'});
 const occupants=el('fieldset','lease-draft-occupants');occupants.append(el('legend','','Occupants · first-page lines A–E'));const occupantsGrid=grid(occupants);
 for(let i=0;i<5;i++)input(occupantsGrid,'occupant-'+i,String.fromCharCode(65+i)+' · Occupant');steps[2].append(occupants);
 input(steps[2],'pets','Confirmed pets / description, or explicitly “None”',{type:'textarea',hint:'This description does not create a pet fee or deposit.'});
 const services=grid(steps[2]),utilities=el('fieldset'),appliances=el('fieldset');utilities.append(el('legend','','Utilities'));appliances.append(el('legend','','Appliances furnished'));
 R.utilities.forEach((name,i)=>input(utilities,'utility-'+i,name,{values:[['','Choose who pays'],['Landlord','Landlord'],['Tenant','Tenant']]}));
 R.appliances.forEach((name,i)=>input(appliances,'appliance-'+i,name,{values:[['','Choose'],['Yes','Yes'],['No','No']]}));services.append(utilities,appliances);
 steps[3].append(el('p','guide-hint','The complete page 8 stays the same for every unit. Unused rooms print N/A; applicable conditions start blank for your observations.'));
 const layout=grid(steps[3]);
 input(layout,'satisfactory','All listed items satisfactory?',{values:[['','Not yet confirmed'],['Yes','Yes — verified'],['No','No — record exceptions in the condition entries']]});
 input(layout,'bedrooms','Bedrooms',{values:[['','Confirm bedroom count'],...['1','2','3','4','5'].map(x=>[x,x+' bedroom'+(x==='1'?'':'s')])]});
 input(layout,'bathrooms','Bathrooms / condition groups',{values:[['','Confirm bathroom count'],...['1','2','3'].map(x=>[x,x+' bathroom group(s)'])]});
 input(layout,'basement','Basement belongs to this unit?',{values:[['','Not confirmed'],['included','Included'],['not-included','Not part of this unit — confirmed']]});
 check(steps[3],'additionalRoom','Include a den / other room (when applicable).');
 const roomSelect=input(steps[3],'room','Area to inspect',{values:[['kitchen','Kitchen']]});
 const roomLabelInput=input(steps[3],'roomLabel','Area label (optional)',{hint:'For example: Main bath, Basement bath, Primary bedroom or Den. Leave blank to keep the generic label.'});
 const roomApplicability=el('p','guide-hint');roomApplicability.id='newlease-room-applicability';roomApplicability.setAttribute('role','status');steps[3].append(roomApplicability);
 const count=el('p','guide-hint');count.id='newlease-condition-count';steps[3].append(count);
 const conditionFields=el('div','lease-condition-fields');steps[3].append(conditionFields);
 const options=el('datalist');options.id='newlease-condition-options';M.conditionOptions.forEach(value=>options.append(new Option(value,value)));steps[3].append(options);
 steps[3].append(el('p','guide-hint','Choose a suggestion or enter exact wording. Unused-room notes stay in this visit’s memory; the review and PDF show N/A until that room applies again.'));
 const previewButton=button('Preview page 8 PDF',previewCondition,'button primary');previewButton.id='newlease-condition-preview';
 const previewStatus=el('p','status');previewStatus.id='newlease-condition-preview-status';previewStatus.setAttribute('role','status');
 steps[3].append(previewButton,el('p','guide-hint','One-page draft preview only. Signature and date lines stay blank; observations must be checked for the actual unit.'),previewStatus);
 check(steps[3],'conditionsReviewed','I reviewed these observations for the selected property and room layout.');
 steps[4].append(el('p','guide-hint','The percentages remain fixed. Dollar amounts below appear identically on pages 1 and 10. Manual overrides stay in place if you change rent; use the calculation button to return to automatic amounts.'));
 const feeGrid=grid(steps[4]);input(feeGrid,'five','5% late-charge amount ($)');input(feeGrid,'ten','10% late-charge amount ($)');
 const feeMode=el('p','guide-hint');feeMode.id='newlease-fee-mode';steps[4].append(feeMode,button('Use 5% / 10% rent calculation',()=>{manualFive=false;manualTen=false;updateFees();invalidate()}));
 const reviewButton=button('Review draft inputs',review,'button primary');reviewButton.id='newlease-review';
 const download=button('Download ten-page lease PDF',()=>{},'button');download.disabled=true;download.id='newlease-download';download.title='Awaiting clean approved masters, filled examples and deposit rules.';
 const actions=el('div','lease-draft-actions');actions.append(reviewButton,download);steps[4].append(actions,el('p','guide-hint','PDF export is not enabled in this draft. The field review below is not a lease.'));
 const output=el('section','lease-draft-review');output.id='newlease-output';output.setAttribute('aria-label','New lease field review');output.hidden=true;steps[4].append(output);
 const footer=el('div','guide-footer'),back=button('Back',()=>move(-1)),next=button('Continue',()=>move(1),'button primary');footer.append(back,next);
 const status=el('p','status');status.id='newlease-status';status.setAttribute('role','status');
 form.append(...steps);work.append(toolbar,nav,form,footer,status,el('p','lease-draft-session','Working inputs stay only for this visit. Clear draft, reload or sign out to remove them. Nothing is sent, saved to a case, or signed.'));
 tool.append(work);panel.append(tool);
 function val(id){return $(id).value.trim()}
 function state(){return {
  approvalReviewed:$('approvalReviewed').checked,depositStepReviewed:$('depositStepReviewed').checked,
  ...Object.fromEntries(['handoffNote','address','cityline','leaseDate','rent','start','end','deposit','securityDeposit','petDeposit','otherFee','otherFeeDescription','petRent','tenantName','emails','pets','bedrooms','bathrooms','basement','satisfactory'].map(k=>[k,val(k)])),
  occupants:Array.from({length:5},(_,i)=>val('occupant-'+i)),utilities:Object.fromEntries(R.utilities.map((k,i)=>[k,val('utility-'+i)])),appliances:Object.fromEntries(R.appliances.map((k,i)=>[k,val('appliance-'+i)])),
  fiveOverride:manualFive?val('five'):null,tenOverride:manualTen?val('ten'):null,conditions:{...conditions},roomLabels:{...roomLabels},additionalRoom:$('additionalRoom').checked,conditionsReviewed:$('conditionsReviewed').checked
 }}
 function invalidate(){previewStatus.textContent='';output.hidden=true;output.replaceChildren();status.textContent='Draft inputs changed. Review again when ready.'}
 function updateFees(){
  const amounts=M.calculateFees(val('rent'),manualFive?val('five'):null,manualTen?val('ten'):null);
  if(!manualFive)$('five').value=amounts.five.cents===null?'':(amounts.five.cents/100).toFixed(2);
  if(!manualTen)$('ten').value=amounts.ten.cents===null?'':(amounts.ten.cents/100).toFixed(2);
  feeMode.textContent='5%: '+amounts.five.mode+' · 10%: '+amounts.ten.mode;
 }
 function updateCount(){const x=M.readiness(state()).conditionCount;count.textContent=x.entered+' of '+x.total+' observation fields filled · '+x.notApplicable+' fields marked N/A.'}
 function renderRoom(){
  const plan=M.roomPlan(val('bedrooms'),val('bathrooms'),val('basement'),roomLabels,$('additionalRoom').checked);
  if(!plan.some(r=>r.key===room))room='kitchen';
  const current=plan.find(r=>r.key===room),notApplicable=current.applicable===false;
  roomSelect.replaceChildren(...plan.map(r=>new Option(r.title+(r.applicable===false?' · N/A':''),r.key)));roomSelect.value=room;roomLabelInput.value=notApplicable?'':roomLabels[room]||'';roomLabelInput.placeholder=current.title;roomLabelInput.readOnly=notApplicable;
  roomLabelInput.parentElement.hidden=['exterior','systems','other'].includes(room);
  roomApplicability.textContent=notApplicable?current.title+' is not included. Every field prints N/A; adjust the unit layout above to edit.':current.applicable===null?'Confirm this area’s layout above. Unconfirmed areas stay blank until you enter observations.':'';
  roomApplicability.hidden=!roomApplicability.textContent;
  const g=el('div','lease-draft-grid');conditionFields.replaceChildren(el('h4','',current.title),g);
  current.items.forEach((item,i)=>{
   const key=current.key+'::'+item,n=input(g,'condition-'+i,item);n.setAttribute('list',options.id);n.value=notApplicable?'N/A':conditions[key]||'';n.readOnly=notApplicable;
   n.addEventListener('input',()=>{if(notApplicable)return;conditions[key]=n.value;dirty=true;$('conditionsReviewed').checked=false;updateCount()});
  });updateCount();
 }
 function render(){
  steps.forEach((n,i)=>n.hidden=!all&&i!==step);jumps.forEach((b,i)=>{if(!all&&i===step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')});
  one.setAttribute('aria-pressed',String(!all));every.setAttribute('aria-pressed',String(all));footer.hidden=all;back.disabled=step===0;next.hidden=step===steps.length-1;
 }
 function move(delta){step=Math.max(0,Math.min(steps.length-1,step+delta));render();steps[step].querySelector('h3').focus()}
 function reset(){
  form.reset();conditions={};roomLabels={};manualFive=false;manualTen=false;dirty=false;lastUnit='';room='kitchen';step=0;
  $('leaseDate').value=R.leaseDate();renderRoom();updateFees();invalidate();status.textContent='Fresh new-lease draft. No records changed.';render();
 }
 function refreshUnits(){
  const data=cloud.user?window.OpsPortfolio?.getData():null,props=new Map((data?.properties||[]).map(p=>[p.id,p]));units=new Map();
  picker.replaceChildren(new Option('Choose a unit, or type the exact address below',''));
  for(const unit of data?.units||[]){const prop=props.get(unit.property_id);if(!prop)continue;
   const address=[prop.street_address,unit.unit_label&&unit.unit_label!=='MAIN'?unit.unit_label:''].filter(Boolean).join(' '),cityline=[prop.city,prop.state].filter(Boolean).join(', ')+(prop.postal_code?' '+prop.postal_code:'');
   units.set(unit.id,{address,cityline});picker.add(new Option(address+' · '+cityline,unit.id));
  }
  picker.value=units.has(lastUnit)?lastUnit:'';
 }
 function gate(){locked.hidden=!!cloud.user;work.hidden=!cloud.user;form.querySelectorAll('input,textarea,select,button').forEach(n=>n.disabled=!cloud.user);download.disabled=true;}
 function previewCondition(){
  if(!cloud.user)return;
  try{
   const engine=window.OpsLeaseConditionPDF;if(!engine)throw Error('Condition PDF tool did not load. Reload the workspace.');
   const result=engine.generate(M.buildReview(state()).page8,{JsPDF:window.jspdf?.jsPDF,viewerUser:()=>cloud.user?.id||null,preview:true});
   result.pdf.save('DRAFT - Page 8 Condition Sheet.pdf');previewStatus.textContent='Draft condition-sheet preview downloaded. Check all observations; this is not a completed lease.';
  }catch(error){previewStatus.textContent='Preview unavailable: '+error.message}
 }
 function review(){
  if(!cloud.user){reset();gate();return}
  const report=M.buildReview(state());output.replaceChildren(el('h4','',report.kind));
  const sources=el('details'),pending=el('ul');sources.append(el('summary','','Source materials pending ('+report.sourceBlockers.length+')'));report.sourceBlockers.forEach(s=>pending.append(el('li','',s)));sources.append(pending);output.append(sources);
  if(report.missing.length){const disclosure=el('details'),missing=el('ul');disclosure.append(el('summary','','Fields still to check ('+report.missing.length+')'));report.missing.forEach(s=>missing.append(el('li','',s)));disclosure.append(missing);output.append(disclosure)}
  const details=el('dl');
  const entries=[['Tenant(s)',report.page1.tenantName],['Email(s)',report.page1.emails],['Property/unit',[report.page1.address,report.page1.cityline].filter(Boolean).join(', ')],['Lease date',report.page1.leaseDate],['Term',report.page1.start+' → '+report.page1.end],['Monthly rent',report.page1.rent],['Deposit amount to print',report.page1.depositToPrint],['Security deposit component',report.deposits.security],['Pet deposit component',report.deposits.pet],['Other one-time fee',report.deposits.otherFee+' · '+(report.deposits.otherFeeDescription||'No description')],['Monthly pet rent',report.deposits.monthlyPetRent],['5% · pages 1 and 10',report.page1.lateFive],['10% · pages 1 and 10',report.page1.lateTen],['Occupants',report.page1.occupants.filter(Boolean).join('; ')],['Pets',report.page1.pets],['Utilities',Object.entries(report.page1.utilities).map(([k,v])=>k+': '+(v||'Not entered')).join(' · ')],['Appliances',Object.entries(report.page1.appliances).map(([k,v])=>k+': '+(v||'Not entered')).join(' · ')],['Page 8 overall satisfactory',report.page8.satisfactory||'Not entered'],['Condition entries',report.conditionCount.entered+' of '+report.conditionCount.total]];
  entries.forEach(([label,value])=>details.append(el('dt','',label),el('dd','',value||'Not entered')));output.append(details);
  const observations=el('details');observations.append(el('summary','','Review all condition entries'));
  for(const group of report.rooms){observations.append(el('h4','',group.title));const lines=el('ul');Object.entries(group.entries).forEach(([k,v])=>lines.append(el('li','',k+': '+(v||'Not entered'))));observations.append(lines)}output.append(observations);
  output.hidden=false;status.textContent='Field review prepared. PDF export is waiting for the remaining source material.';
 }
 picker.addEventListener('change',()=>{
  const selected=picker.value;if(selected===lastUnit)return;
  if(dirty&&!window.confirm('Change the selected unit and clear current new-lease inputs?')){picker.value=lastUnit;return}
  reset();lastUnit=selected;picker.value=selected;const unit=units.get(selected);if(unit){$('address').value=unit.address;$('cityline').value=unit.cityline}dirty=false;step=1;render();
 });
 roomLabelInput.addEventListener('input',()=>{roomLabels[room]=roomLabelInput.value;const title=roomLabelInput.value.trim()||M.roomPlan(val('bedrooms'),val('bathrooms'),val('basement'),{},$('additionalRoom').checked).find(r=>r.key===room)?.title||'Other room';conditionFields.querySelector('h4').textContent=title;roomSelect.selectedOptions[0].textContent=title;$('conditionsReviewed').checked=false});
 roomSelect.addEventListener('change',()=>{room=roomSelect.value;renderRoom()});
 form.addEventListener('input',e=>{
  dirty=true;if(e.target===$('five'))manualFive=true;if(e.target===$('ten'))manualTen=true;
  if([$('rent'),$('five'),$('ten')].includes(e.target))updateFees();invalidate();
 });
 form.addEventListener('change',e=>{if(['newlease-bedrooms','newlease-bathrooms','newlease-basement','newlease-additionalRoom'].includes(e.target.id)){$('conditionsReviewed').checked=false;renderRoom()}invalidate()});
 window.addEventListener('ops-portfolio-loaded',refreshUnits);
 window.addEventListener('ops-auth-change',()=>{const nextId=cloud.user?.id||null;if(nextId!==userId){userId=nextId;reset()}refreshUnits();gate()});
 reset();refreshUnits();gate();
})();
