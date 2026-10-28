/* Read-only contact lookup for the selected Notice Studio draft.
 * A notice recipient is NOT assumed to be the current tenant of an address.
 * Only names explicitly matching tenancy-linked people from the exact unit
 * are eligible. Historical/imported contact details still require review. */
(function(root,factory){
 'use strict';
 const rules=factory();
 if(typeof module==='object'&&module.exports)module.exports=rules;
 if(root)root.OpsNoticeContact=rules;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const norm=value=>String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
 function names(recipient){
  const full=norm(recipient);
  if(!full||/\ball occupants\b|\bunknown\b|\bunnamed\b/.test(full))return [];
  return full.split(/\s+(?:and|&)\s+|\s*;\s*|\s*\n\s*/).map(norm).filter(Boolean);
 }
 function lookup(data,sourceId,recipient){
  const base={emails:[],message:''};
  if(!data)return {...base,message:'Loading tenant contact records…'};
  if(!sourceId)return {...base,message:'No linked unit for this draft. Verify the recipient in Properties.'};
  const units=Array.isArray(data.units)?data.units:[],
        leases=Array.isArray(data.leases)?data.leases:[],
        parties=Array.isArray(data.parties)?data.parties:[],
        people=Array.isArray(data.people)?data.people:[];
  let unit=units.find(u=>u.id===sourceId);
  if(!unit){
   const matches=units.filter(u=>u.property_id===sourceId);
   if(matches.length===1)unit=matches[0]; // historical single-unit draft
  }
  if(!unit)return {...base,message:'No unambiguous unit link. Verify the email in Properties.'};
  const requested=names(recipient);
  if(!requested.length)return {...base,message:'Recipient needs review; no email can be safely matched.'};
  const linkedTenancies=new Set(leases.filter(l=>l.unit_id===unit.id&&l.tenancy_id).map(l=>l.tenancy_id));
  const personIds=new Set(parties.filter(p=>linkedTenancies.has(p.tenancy_id)).map(p=>p.person_id));
  const linked=people.filter(p=>personIds.has(p.id));
  const emails=[];
  for(const name of requested){
   const matches=linked.filter(p=>norm(p.display_name)===name);
   // No fuzzy-address lookup, name guesses, or cross-unit fallback.
   if(!matches.length)return {...base,message:'No matching tenant email in the linked lease records.'};
   const found=[...new Set(matches.map(p=>String(p.email||'').trim().toLowerCase()).filter(e=>/^[^\s@;]+@[^\s@;]+\.[^\s@;]+$/.test(e)))];
   if(found.length!==1||matches.some(p=>!String(p.email||'').trim()))
    return {...base,message:'Tenant email missing or ambiguous. Verify it in Properties.'};
   emails.push(found[0]);
  }
  return {emails:[...new Set(emails)],message:'From linked tenant records · verify the address before sending.'};
 }
 return Object.freeze({lookup});
});