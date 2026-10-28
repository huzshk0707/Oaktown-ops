/* Signed-in Notice draft recipient fallback for normalized leases/tenancies.
   Only a single active/ending-soon tenancy from the exact unit is eligible.
   All source identities require staff verification before notice generation. */
(function(root,factory){
 'use strict';const fn=factory();
 if(typeof module==='object'&&module.exports)module.exports=fn;
 if(root)root.OpsNoticeRecipient=fn;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const current=value=>/^(?:Current(?:\s*-\s*month to month)?|Ending soon)$/i.test(String(value||'').trim());
 const full=value=>String(value||'').trim().replace(/\s+/g,' ');
 function fromUnit(unitId,{tenancies=[],parties=[],people=[]}={}){
  const active=tenancies.filter(t=>t.unit_id===unitId&&current(t.status));
  if(!active.length)return {name:'',reason:'No current tenancy recorded; review recipient manually.'};
  if(active.length!==1)return {name:'',reason:'More than one current tenancy; verify the correct occupants.'};
  const tenantIds=new Set(parties.filter(p=>p.tenancy_id===active[0].id&&String(p.party_role||'').toLowerCase()==='tenant'&&!p.to_date).map(p=>p.person_id));
  const names=[...new Set(people.filter(p=>tenantIds.has(p.id)).map(p=>full(p.display_name)).filter(Boolean))];
  if(!names.length)return {name:'',reason:'No named tenants linked to the current tenancy.'};
  return {name:names.join(' and '),reason:'Imported current-tenancy names · verify all recipients before generating.'};
 }
 return Object.freeze({fromUnit});
});