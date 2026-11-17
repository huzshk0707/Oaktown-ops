/* Source-measured positions on Leslie's original checklist. No property defaults. */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./lease-page8-model.js'):root.OpsLeasePage8);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.OpsLeaseOriginalProfile=api;
})(typeof window!=='undefined'?window:null,function(P){
  'use strict';
  const id='leslie-original-page8-v1';
  const referenceOnly=new Set([
    '4096d6ff98fa0a354dd3b03a0c1428d44607aba1220b46a84c10e395c6190ac4',
    '9e8d2538c2501c002a509fb1446db49a93fc2436ec63fa73f17ea2e790473a59'
  ]);
  const headers={kitchen:127.4,bathroom:208.4,living:298.4,'bedroom-1':352.4,'bedroom-2':406.4,'bedroom-3':451.4,'bedroom-4':505.4,basement:568.4};
  const rows={kitchen:[136.4,145.4,154.4,163.4,172.4,181.4,190.4,199.4],bathroom:[217.4,226.4,235.4,244.4,253.4,262.4,271.4,280.4,289.4],living:[307.4,316.4,325.4,334.4,343.4],
    'bedroom-1':[361.4,370.4,379.4,388.4,397.4],'bedroom-2':[415.4,424.4,433.4,442.4],
    'bedroom-3':[460.4,469.4,478.4,487.4,496.4],'bedroom-4':[514.4,523.4,532.4,550.4,559.4],basement:[577.4,586.4,595.4,604.4,613.4],
    exterior:[127.4,136.4,145.4,154.4,163.4,181.4,190.4,199.4,208.4,217.4,226.4],systems:[235.4,244.4,253.4,271.4]};
  const prefix=p=>'slot/'+[p.section,p.column,p.row].join('/')+'/';
  function field(key,x,baseline,width,size=9,page=8){
    // Tight source rows have 9pt pitch. The baseline is explicit; it is not
    // obtained by shrinking text or moving rows to accommodate observations.
    return {key,page,x,y:792-baseline-2.1,width,height:9,size,font:'Helvetica',align:'left',baseline:2.1};
  }
  function suggestPlacements(state,mode='columns'){
    const places={...state.roomPlacements};
    places['bathroom-1']={section:'bathroom',column:0,row:0};
    places['bathroom-2']={section:'bathroom',column:1,row:0};
    if(Number(state.bathrooms)===3){
      if(mode==='master')places['bathroom-3']={section:'bedroom-3',column:1,row:0};
      else {places['bathroom-2']={section:'bathroom',column:0,row:1};places['bathroom-3']={section:'bathroom',column:1,row:0};}
    }
    if(Number(state.bedrooms)===5)places['bedroom-5']={section:'basement',column:1,row:0};
    if(state.additionalRoom===true&&Number(state.bedrooms)<4)places.additional={section:'bedroom-4',column:0,row:0};
    return places;
  }
  function page8Fields(state){
    const fields=[field('term/address',143,83.8,337,11),field('term/bedrooms',520,83.8,38,11),
      field('term/satisfactory-yes',352,43.5,15,11),field('term/satisfactory-no',410,43.5,15,11)];
    // Tall header values have ample source whitespace above their baselines.
    for(const f of fields){f.height=14;f.y=792-(f.key.includes('satisfactory')?43.5:83.8)-2.5;f.baseline=2.5;}
    const all=P.rooms(state),active=all.filter(r=>r.applicable===true),groups=new Map();
    for(const room of all){
      if(room.applicable!==true&&!['bedroom-4','basement'].includes(room.key))continue;
      const p=room.placement;
      if(room.applicable===false&&active.some(r=>prefix(r.placement)===prefix(p)))continue;
      const key=p.section+'/'+p.column;
      if(!groups.has(key))groups.set(key,[]);groups.get(key).push(room);
    }
    for(const group of groups.values()){
      group.sort((a,b)=>a.placement.row-b.placement.row);
      const room=group[0],p=room.placement,pre=prefix(p),section=p.section;
      if(!rows[section]||p.row!==0)continue; // coverage reports unsupported placement
      const peers=[...groups.values()].some(g=>g[0].placement.section===section&&g[0].placement.column!==p.column);
      const x=section==='exterior'||section==='systems'?396.1:p.column===1?192:peers&&section==='bedroom-3'?95:108.1;
      const width=section==='exterior'||section==='systems'?154:peers?82:154;
      if(headers[section]){
        const f=field(pre+'label',x,headers[section],width,8);
        // Original headings are retained. Editable labels are annotations beside
        // them, exactly as DEN / MASTER / N/A appear in the supplied examples.
        f.omitValues=[room.key.startsWith('bathroom-')?'Bathroom '+room.key.slice(-1):room.key.startsWith('bedroom-')?'Bedroom '+room.key.slice(-1):({kitchen:'Kitchen',living:'Living room',basement:'Basement'}[room.key]||'')];
        if(room.applicable===false||p.section!==room.key&&!(room.key.startsWith('bathroom-')&&p.section==='bathroom'))f.omitValues=[];
        f.sources=[{key:pre+'location',label:''}];f.join=' · ';fields.push(f);
      }
      const items=room.items;
      items.forEach((item,i)=>{
        let baseline=rows[section][i];if(baseline===undefined)return;
        const f=field(pre+item,x,baseline,width);
        if(section==='systems'&&item==='Comments'){f.x=324.1;f.width=224;f.height=22;f.y=508;f.baseline=13;}
        if(section==='bedroom-3'&&p.column===1){
          if(i>4)return;
          // The associated bathroom has four condition rows plus one grouped
          // fixture note, using the existing Other line. Never lose fixtures.
          if(i===4){f.key=pre+'Other';f.x=184;f.width=128;f.size=7;f.sources=['Toilet','Vanity','Tub','Shower'].map(k=>({key:pre+k,label:k}));f.join=', ';}
        }
        if(group.length>1){
          // Brook Bend's two floors share a column. Distinct room identities
          // remain separate; only the display value is combined. The compact
          // source size is explicit and fixed, never chosen to fit a string.
          f.sources=group.slice(1).map(r=>({key:prefix(r.placement)+item,label:String(r.location||r.label)}));
          f.primaryLabel=String(room.location||room.label);f.join=' & ';f.collapseEqual=true;f.size=6;
        }
        fields.push(f);
      });
      if(group.length>1){
        const label=fields.find(f=>f.key===pre+'label');
        if(label){label.sources.push(...group.slice(1).flatMap(r=>[{key:prefix(r.placement)+'label',label:'',omitValues:['Bathroom '+r.key.slice(-1)]},{key:prefix(r.placement)+'location',label:''}]));label.size=6;}
      }
    }
    // Nonstandard notes use the original right-hand comment lines. They never
    // take space from acceptance, landlord signatures or smoke-alarm signatures.
    const other=P.rooms(state).find(r=>r.key==='other');
    if(other?.entries['Other appliance / item conditions'])fields.push(field(prefix(other.placement)+'Other appliance / item conditions',324.1,289.4,224,8));
    return fields;
  }
  function page1Fields(){
    const f=[];const add=(key,x,y,w,size=10,page=1)=>f.push(field('term/'+key,x,y,w,size,page));
    [['leaseDate',75,115,85],['start',169,115,80],['end',257,115,91],['rent',357,115,81],['deposit',469,115,65],['tenantName',112,161,232],['emails',80,193,264],['address',80,233,264],['cityline',80,251,264],['pets',332,485,207]].forEach(a=>add(...a));
    [[86,451],[86,468],[86,485],[306,451],[306,468]].forEach(([x,y],i)=>add('occupant-'+i,x,y,185));
    const ux=[184,262,323,398,504],tx=[203,280,339,416,522];
    for(let i=0;i<5;i++){add('utility-'+i+'-landlord',ux[i],520,20,9);add('utility-'+i+'-tenant',tx[i],532,20,9);}
    [76,156,255,334,386,535,125].forEach((x,i)=>add('appliance-'+i,x,i===6?590:578,i===5?23:30,8));
    add('five',288,659,36,9);add('ten',177,671,38,9);add('five',415,242,36,9,10);add('ten',98,256,43,9,10);
    for(const x of f){x.height=Math.max(12,x.height);x.y-=3;x.baseline=3;if(['term/five','term/ten'].includes(x.key))x.format='amount';}
    return f;
  }
  const protectedAreas=[{page:8,x:320,y:215,width:250,height:270},{page:8,x:70,y:80,width:510,height:60},{page:1,x:466,y:95,width:99,height:16},{page:10,x:300,y:90,width:220,height:26}];
  function map(source,state,originalSha256){return {schema_version:'oaktown.lease-template-map.v1',profile:id,originalSha256,templateSha256:source.sha256,pages:source.pages,fields:[...page1Fields(),...page8Fields(state)],protectedAreas};}
  async function blankBytes(){
    if(typeof window==='undefined')return new Uint8Array(require('node:fs').readFileSync(require('node:path').join(__dirname,'lease-assets/page8-original-blank.pdf')));
    const response=await fetch('lease-assets/page8-original-blank.pdf');if(!response.ok)throw Error('Original blank checklist is unavailable.');return new Uint8Array(await response.arrayBuffer());
  }
  async function prepare(bytes,L){
    const master=await L.PDFDocument.load(bytes,{updateMetadata:false});if(master.getPageCount()!==10)throw Error('Use the ten-page unsigned lease master; completed twelve-page reference packets are not blank masters.');
    const blank=await L.PDFDocument.load(await blankBytes());const [p]=await master.copyPages(blank,[0]);master.removePage(7);master.insertPage(7,p);
    return master.save({useObjectStreams:false,addDefaultPage:false});
  }
  async function page8Preview(state,{PDFLib,E,viewerUser}){
    const master=await PDFLib.PDFDocument.create();for(let i=0;i<10;i++)master.addPage([612,792]);
    const bytes=await prepare(await master.save(),PDFLib),source=await E.inspect(bytes);
    const mapping=map(source,state,null);mapping.fields=page8Fields(state);mapping.protectedAreas=protectedAreas.filter(p=>p.page===8);
    const data={state,template:{reference:'Original blank checklist · source-measured draft',originalReviewed:true,mappingReviewed:true,map:mapping}};
    const missing=E.coverage(data).filter(message=>/observation|edited label|location|N\/A label/.test(message));if(missing.length)throw Error(missing.join(' '));
    const result=await E.generate(bytes,data,{PDFLib,viewerUser});const full=await PDFLib.PDFDocument.load(result.bytes),single=await PDFLib.PDFDocument.create();const [p]=await single.copyPages(full,[7]);single.addPage(p);single.setSubject('DRAFT · original checklist · not approved or executed');return single.save();
  }
  return Object.freeze({id,referenceOnly:hash=>referenceOnly.has(hash),suggestPlacements,page8Fields,page1Fields,map,prepare,page8Preview,blankBytes});
});
