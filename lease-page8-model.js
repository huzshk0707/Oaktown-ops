/* Room identities are independent of positions on an approved original PDF. */
(function(root,factory){'use strict';const api=factory(typeof module==='object'&&module.exports?require('./lease-preparation-model.js'):root.OpsLeasePreparation);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.OpsLeasePage8=api;})(typeof window!=='undefined'?window:null,function(M){
 'use strict';
 const sections=Object.freeze(['kitchen','bathroom','living','bedroom-1','bedroom-2','bedroom-3','bedroom-4','bedroom-5','basement','additional','exterior','systems','other']);
 const presets=Object.freeze([...new Set(['Good','New','Fair','Good & New Paint','Good & Fresh Paint','New Vinyl','Good Vinyl','Good Tile','Good Granite','Good LVT','New Carpet','Good & New Carpet','Refinished Hardwoods','N/A',...M.conditionOptions])]);
 const terms=Object.freeze(['address','cityline','leaseDate','start','end','rent','deposit','tenantName','emails','pets','five','ten',...Array.from({length:5},(_,i)=>'occupant-'+i)]);
 function placement(key,state){
  const custom=state.roomPlacements?.[key];if(custom)return {...custom};
  if(key.startsWith('bathroom-')){const n=Number(key.split('-')[1]);return {section:n<=2?'bathroom':'unplaced',column:n===2?1:0,row:0};}
  return {section:key==='bedroom-5'?'unplaced':key,column:0,row:0};
 }
 function rooms(state){
  return M.roomPlan(state.bedrooms,state.bathrooms,state.basement,state.roomLabels,state.additionalRoom).map(room=>({...room,
   label:room.applicable===false?'N/A':String(state.roomLabels?.[room.key]||room.title),
   location:room.applicable===false?'':String(state.roomLocations?.[room.key]||''),placement:placement(room.key,state),
   entries:Object.fromEntries(room.items.map(item=>[item,room.applicable===false?'':String(state.conditions?.[room.key+'::'+item]??'')]))}));
 }
 function layoutProblems(state){
  const issues=[],occupied=new Map();
  if(![1,2,3,4,5].includes(Number(state.bedrooms)))issues.push('Confirm one to five bedrooms. Six-bedroom generation is unsupported.');
  if(![1,2,3].includes(Number(state.bathrooms)))issues.push('Confirm one to three bathrooms.');
  if(!['included','not-included'].includes(state.basement))issues.push('Confirm the basement status for this unit.');
  for(const room of rooms(state)){
   const p=room.placement;
   if(room.applicable!==true)continue;
   if(!sections.includes(p.section)||![0,1].includes(p.column)||![0,1,2].includes(p.row)){issues.push('Choose an available PDF position for '+room.label+'.');continue;}
   const key=[p.section,p.column,p.row].join('/');
   if(occupied.has(key))issues.push(room.label+' and '+occupied.get(key)+' occupy the same PDF position.');else occupied.set(key,room.label);
  }
  return issues;
 }
 function values(state){
  const result={};
  for(const name of terms){const value=name.startsWith('occupant-')?state.occupants?.[Number(name.split('-')[1])]:name==='five'||name==='ten'?M.calculateFees(state.rent,state.fiveOverride,state.tenOverride)[name].formatted:state[name];result['term/'+name]=String(value??'');}
  for(const [i,name]of Object.keys(state.utilities||{}).entries())result['term/utility-'+i]=String(state.utilities[name]||'');
  for(const [i,name]of Object.keys(state.appliances||{}).entries())result['term/appliance-'+i]=String(state.appliances[name]||'');
  result['term/bedrooms']=String(state.bedrooms||'');result['term/satisfactory']=String(state.satisfactory||'');
  // Inactive labels retain the source position; an active den can deliberately
  // occupy the otherwise unused Bedroom 4 slot, without duplicate identity.
  for(const active of [false,true])for(const room of rooms(state)){
   if((room.applicable===true)!==active)continue;
   const p=room.placement;if(!sections.includes(p.section))continue;
   const prefix='slot/'+[p.section,p.column,p.row].join('/')+'/';
   result[prefix+'label']=room.applicable===false?'N/A':room.label;
   result[prefix+'location']=room.location;
   for(const [item,value]of Object.entries(room.entries))result[prefix+item]=value;
  }
  return result;
 }
 function exactPreset(value){return presets.includes(value)?value:'Custom';}
 function payload(state,{unitId,leaseId=null,template=null}={}){
  return {schema_version:'oaktown.lease-preparation.v1',unit_id:unitId||null,lease_id:leaseId||null,state:JSON.parse(JSON.stringify(state)),template:template?JSON.parse(JSON.stringify(template)):null};
 }
 return Object.freeze({sections,presets,terms,placement,rooms,layoutProblems,values,exactPreset,payload});
});
