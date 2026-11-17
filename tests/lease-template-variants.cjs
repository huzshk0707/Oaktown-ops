'use strict';
// Synthetic blank pages only. These are behavioral samples, never Leslie's master.
const {fixture}=require('./lease-template-fixture.cjs'),P=require('../lease-page8-model.js');
const names=['three-bedroom','three-bedroom-den','four-bedroom-basement','four-bedroom-three-baths','five-bedroom-master-bath'];
async function variant(name){
 if(!names.includes(name))throw Error('Unknown fictional case');
 const f=await fixture(),s=f.state;
 s.conditions={'kitchen::Floor':'Good & Fresh Paint','bedroom-1::Floor':'Good Tile','bedroom-2::Floor':'New Carpet','bedroom-3::Floor':'Refinished Hardwoods','bathroom-1::Floor':'New'};
 if(name==='three-bedroom-den'){s.additionalRoom=true;s.roomLabels.additional='DEN';s.roomPlacements.additional={section:'bedroom-4',column:0,row:0};s.conditions['additional::Floor']='Good & New Paint';}
 if(name.startsWith('four')||name.startsWith('five')){s.bedrooms=name.startsWith('five')?'5':'4';s.basement='included';s.roomLocations['bedroom-4']='BSMT';s.conditions['bedroom-4::Floor']='Fair';s.conditions['basement::Floor']='Good LVT';}
 if(name==='four-bedroom-three-baths'){
  s.bathrooms='3';s.roomPlacements['bathroom-2']={section:'bathroom',column:0,row:1};s.roomPlacements['bathroom-3']={section:'bathroom',column:1,row:0};
  Object.assign(s.roomLocations,{'bathroom-1':'First Floor','bathroom-2':'Second Floor','bathroom-3':'Basement'});Object.assign(s.conditions,{'bathroom-2::Floor':'Good','bathroom-3::Floor':'Fair — repaired crack'});
 }
 if(name==='five-bedroom-master-bath'){
  s.bathrooms='3';s.roomLabels['bedroom-3']='MASTER';s.roomLabels['bathroom-3']='MASTER BATH';s.roomPlacements['bathroom-3']={section:'bedroom-3',column:1,row:0};s.roomPlacements['bedroom-5']={section:'bedroom-5',column:0,row:0};
  Object.assign(s.roomLocations,{'bathroom-1':'First Floor','bathroom-2':'Basement','bedroom-5':'BSMT'});Object.assign(s.conditions,{'bathroom-2::Floor':'Good','bathroom-3::Other':'Toilet, Vanity, Tub, Shower - Good.','bedroom-5::Floor':'New Carpet'});
 }
 // The synthetic master defines a blank two-column area. This grid is ONLY for
 // that fictional fixture, never a coordinate map for an Oaktown original.
 const origins={kitchen:[40,660],living:[320,660],bathroom:[40,570],'bedroom-1':[40,450],'bedroom-2':[320,450],'bedroom-3':[40,350],'bedroom-4':[40,250],'bedroom-5':[320,250],basement:[40,185],additional:[320,210],exterior:[320,170],systems:[40,130],other:[320,130]};
 const values=P.values(s),keys=new Set();
 for(const room of P.rooms(s)){
  if(room.applicable!==true&&!['bedroom-4','basement'].includes(room.key))continue;
  const p=room.placement,prefix='slot/'+p.section+'/'+p.column+'/'+p.row+'/';
  for(const key of Object.keys(values))if(key.startsWith(prefix)&&values[key])keys.add(key);
 }
 f.data.template.map.fields=f.data.template.map.fields.filter(x=>x.page!==8);
 for(const key of keys){const [,section,column,row,component]=key.split('/'),[x,y]=origins[section],offset=component==='label'?0:component==='location'?14:28;
  f.data.template.map.fields.push({key,page:8,x:x+Number(column)*280,y:y-Number(row)*60-offset,width:250,height:13,size:8,font:'Times-Roman',align:'left'});
 }
 f.data.template.reference='Fictional behavioral sample: '+name;
 return f;
}
module.exports={variant,names};
