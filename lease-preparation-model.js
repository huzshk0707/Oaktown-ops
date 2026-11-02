/* New-tenancy field review. No PDF renderer or record persistence is enabled. */
(function(root,factory){'use strict';const api=factory(typeof module==='object'&&module.exports?require('./renewal-rules.js'):root.OpsRenewalRules);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.OpsLeasePreparation=api;})(typeof window!=='undefined'?window:null,function(R){
 'use strict';
 const source=Object.freeze({name:'Updated Blank Lease.pdf',sha256:'4096d6ff98fa0a354dd3b03a0c1428d44607aba1220b46a84c10e395c6190ac4',pages:10,width:612,height:792,editablePages:Object.freeze([1,8,10])});
 const conditionSource=Object.freeze({name:'Blank Lease and All Docs (1).pdf',sha256:'9e8d2538c2501c002a509fb1446db49a93fc2436ec63fa73f17ea2e790473a59',page:8});
 const sourceBlockers=Object.freeze([
  'Clean updated lease master: remove underlying old field text and verify all ten pages.',
  'Page 7 disclosure: confirm handling of the existing marks and signature before a new-tenancy export.',
  'Condition layout review: blank sheet received and rebuilt; a filled two-bedroom example remains outstanding.',
  'Deposit rules: confirm security/pet deposits, any fees and what amount belongs in the lease deposit box.',
  'Full ten-page PDF mapping and visual verification are not complete; the separate page 8 preview is a draft.'
 ]);
 // Non-identifying phrases observed in the examples. No item is a property default.
 const conditionOptions=Object.freeze([
  'Good','New','N/A','Good & New Paint','Good & Fresh Paint','New Paint',
  'Good LVT','Good Vinyl','New Vinyl','Good Tile','New Tile','Good Hardwood','Refinished Hardwood',
  'Good & New Carpet','New Carpet','Good Laminate','Good New Painted Concrete',
  'Unfinished New Paint on Concrete Walls','Good Granite','New Granite & Backsplash','New & Granite',
  'Good Tile Surround','Dishwasher & Microwave New','Rekeyed','Good New Filter',
  'Good tile, some cracks','Tile fair - cracks grouted/siliconed',
  'Good vinyl, small tear glued back down','Some chips','Attached garage good'
 ]);
 const roomFields=Object.freeze({
  kitchen:['Doors','Walls','Ceiling','Floor','Sink','Cabinets','Countertop','Other'],
  bathroom:['Doors','Walls','Ceiling','Floor','Toilet','Vanity','Tub','Shower','Other'],
  living:['Doors','Walls','Ceiling','Floor','Other'],
  bedroom:['Doors','Walls','Ceiling','Floor','Other'],
  additional:['Doors','Walls','Ceiling','Floor','Other'],
  basement:['Doors','Walls','Ceiling','Floor','Other'],
  exterior:['Windows','Screens','Locks & keys','Porch & stairs','Hot water heater','Building','Front yard','Rear yard','Side yard','Garage / shed','Other'],
  systems:['Furnace / AC','Electrical fixtures','Electrical outlets','Comments'],
  other:['Other appliance / item conditions']
 });
 function roomPlan(bedrooms,bathrooms,basement,labels={},additionalRoom=false){
  const beds=Number(bedrooms),baths=Number(bathrooms);
  const plan=[{key:'kitchen',title:'Kitchen',items:roomFields.kitchen},{key:'living',title:'Living room',items:roomFields.living}];
  if(Number.isInteger(baths)&&baths>=1&&baths<=3)for(let i=1;i<=baths;i++)plan.push({key:'bathroom-'+i,title:'Bathroom '+i,items:roomFields.bathroom});
  if([2,3,4,5].includes(beds))for(let i=1;i<=beds;i++)plan.push({key:'bedroom-'+i,title:'Bedroom '+i,items:roomFields.bedroom});
  if(additionalRoom)plan.push({key:'additional',title:'Den / other room',items:roomFields.additional});
  if(basement==='included')plan.push({key:'basement',title:'Basement',items:roomFields.basement});
  plan.push({key:'exterior',title:'Exterior & shared items',items:roomFields.exterior},{key:'systems',title:'Systems & comments',items:roomFields.systems},{key:'other',title:'Other items',items:roomFields.other});
  return plan.map(room=>({...room,title:String(labels?.[room.key]||'').trim()||room.title}));
 }
 function calculateFees(rent,fiveOverride=null,tenOverride=null){
  const cents=R.moneyCents(rent);
  const amount=(percent,override)=>{
   const automatic=override===null||override===undefined;
   const value=automatic?(cents>0?Math.round(cents*percent/100):null):R.moneyCents(override);
   return {percent,cents:value,formatted:value===null?'Not entered':R.formatCents(value),mode:automatic?'Calculated from rent':'Manual override'};
  };
  return {five:amount(5,fiveOverride),ten:amount(10,tenOverride)};
 }
 function readiness(state){
  const missing=[],text=k=>String(state[k]||'').trim();
  if(!state.approvalReviewed)missing.push('Review the approval handoff.');
  if(!state.depositStepReviewed)missing.push('Review the preceding deposit step.');
  for(const [key,label] of [['tenantName','Tenant name(s)'],['emails','Tenant email(s)'],['address','Exact property/unit address'],['cityline','City, state and ZIP']])if(!text(key))missing.push(label+' is missing.');
  const emails=text('emails').split(/[;,\n]/).map(x=>x.trim()).filter(Boolean);
  if(emails.some(x=>!/^\S+@[^\s@]+\.[^\s@]+$/.test(x)))missing.push('Check the tenant email format.');
  const start=R.parseISO(state.start),end=R.parseISO(state.end);
  if(!R.parseISO(state.leaseDate))missing.push('Enter a valid lease date.');
  if(!start||!end||end<start)missing.push('Enter a valid beginning and ending lease term.');
  if(!(R.moneyCents(state.rent)>0))missing.push('Enter positive monthly rent with at most two decimals.');
  if(R.moneyCents(state.deposit)===null)missing.push('Enter the confirmed amount to print in the deposit box; zero must be explicit.');
  for(const key of ['securityDeposit','petDeposit','otherFee','petRent'])if(text(key)&&R.moneyCents(state[key])===null)missing.push('Check '+key+' currency; use at most two decimals.');
  if(!Array.isArray(state.occupants)||!state.occupants.some(x=>String(x||'').trim()))missing.push('Confirm the occupants.');
  if(Array.isArray(state.occupants)&&state.occupants.length>5)missing.push('The first-page occupant capacity is five lines; review overflow before PDF mapping.');
  if(!text('pets'))missing.push('Enter a verified pet description or explicitly confirm none.');
  for(const name of R.utilities)if(!['Landlord','Tenant'].includes(state.utilities?.[name]))missing.push('Confirm who pays '+name+'.');
  for(const name of R.appliances)if(!['Yes','No'].includes(state.appliances?.[name]))missing.push('Confirm appliance: '+name+'.');
  if(![2,3,4,5].includes(Number(state.bedrooms)))missing.push('Confirm the two-to-five bedroom count; other layouts need a source example.');
  if(![1,2,3].includes(Number(state.bathrooms)))missing.push('Confirm the bathroom count; other layouts need a source example.');
  if(!['included','not-included'].includes(state.basement))missing.push('Confirm whether a basement belongs to this unit.');
  const fees=calculateFees(state.rent,state.fiveOverride,state.tenOverride);
  if(fees.five.cents===null||fees.ten.cents===null)missing.push('Complete both late-charge dollar amounts.');
  const rooms=roomPlan(state.bedrooms,state.bathrooms,state.basement,state.roomLabels,state.additionalRoom).map(room=>({...room,entries:Object.fromEntries(room.items.map(item=>[item,String(state.conditions?.[room.key+'::'+item]||'').trim()]))}));
  const total=rooms.reduce((n,r)=>n+r.items.length,0),entered=rooms.reduce((n,r)=>n+Object.values(r.entries).filter(Boolean).length,0);
  if(!entered)missing.push('Record unit-specific condition observations; the example is never prefilled.');
  if(!['Yes','No'].includes(state.satisfactory))missing.push('Confirm the condition sheet’s overall Yes / No answer.');
  if(!state.conditionsReviewed)missing.push('Review the condition observations.');
  return {missing,fees,rooms,conditionCount:{entered,total},sourceBlockers:[...sourceBlockers],canExport:false};
 }
 function buildReview(state){
  const review=readiness(state),amount=k=>{const n=R.moneyCents(state[k]);return n===null?'Not entered':R.formatCents(n)};
  return {kind:'Field review only — not a lease',canExport:false,
   page1:{leaseDate:state.leaseDate||'',start:state.start||'',end:state.end||'',rent:amount('rent'),depositToPrint:amount('deposit'),tenantName:state.tenantName||'',emails:state.emails||'',address:state.address||'',cityline:state.cityline||'',occupants:(state.occupants||[]).slice(),pets:state.pets||'',utilities:{...state.utilities},appliances:{...state.appliances},lateFive:review.fees.five.formatted,lateTen:review.fees.ten.formatted},
   page8:{address:state.address||'',bedrooms:state.bedrooms||'',satisfactory:state.satisfactory||'',rooms:review.rooms},
   page10:{lateFive:review.fees.five.formatted,lateTen:review.fees.ten.formatted},
   deposits:{security:amount('securityDeposit'),pet:amount('petDeposit'),otherFee:amount('otherFee'),otherFeeDescription:state.otherFeeDescription||'',monthlyPetRent:amount('petRent'),printedAmount:amount('deposit'),calculation:'Not inferred; deposit allocation rules are pending.'},
   ...review};
 }
 return Object.freeze({source,conditionSource,sourceBlockers,conditionOptions,roomPlan,calculateFees,readiness,buildReview});
});
