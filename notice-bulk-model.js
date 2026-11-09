/* Pure, browser-local matching for a pasted notice preparation list.
   This module never guesses an ambiguous unit or persists names. */
(function(root){
'use strict';
function normalize(value){
 return String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
function parse(text){
 const rows=String(text??'').split(/\r?\n/).map(line=>line.replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/,'').trim()).filter(Boolean);
 if(rows.length>250)throw Error('Paste 250 or fewer properties in one list.');
 if(rows.some(line=>line.length>200))throw Error('Each property entry must be 200 characters or fewer.');
 return rows;
}
function phrases(item){
 const prop=item.prop||{},unit=item.unit||{};
 const street=prop.street_address||'', unitLabel=item.unitDisplay||'';
 const context=[prop.city,prop.state,prop.postal_code].filter(Boolean).join(' ');
 const names=[street,...(item.propertyAliases||[])];
 const variants=[];
 for(const name of names){
  variants.push(name,[name,unitLabel].filter(Boolean).join(' '),[name,unitLabel,context].filter(Boolean).join(' '));
 }
 for(const name of item.unitAliases||[])variants.push(name,[street,name].filter(Boolean).join(' '),[...names.slice(1),name].filter(Boolean).join(' '));
 variants.push(unit.unit_code||'');
 return variants.filter(Boolean);
}
function match(query,items){
 const q=normalize(query);if(!q)return [];
 const words=q.split(' '),exact=[],partial=[];
 for(const item of items){
  const terms=phrases(item).map(normalize);
  if(terms.includes(q)){exact.push(item);continue}
  const tokens=new Set(terms.join(' ').split(' ').filter(Boolean));
  if(words.every(word=>tokens.has(word)))partial.push(item);
 }
 return exact.length?exact:partial;
}
function matchList(lines,items){return lines.map(text=>({text,matches:match(text,items),selectedId:''})).map(row=>({...row,selectedId:row.matches.length===1?row.matches[0].unit.id:''}));}
function review(rows){
 const ids=rows.map(row=>row.selectedId).filter(Boolean);
 const seen=new Set(),duplicates=new Set();
 for(const id of ids){if(seen.has(id))duplicates.add(id);seen.add(id)}
 return {ready:rows.length>0&&rows.every(row=>row.selectedId)&&!duplicates.size,unresolved:rows.filter(row=>!row.selectedId).length,duplicateIds:[...duplicates],selectedIds:[...new Set(ids)]};
}
function orderedItems(items,chosenIds){
 const byId=new Map(items.map(item=>[item.unit.id,item]));
 return Array.from(chosenIds).map(id=>byId.get(id)).filter(Boolean);
}
const api={normalize,parse,match,matchList,review,orderedItems};
if(typeof module==='object'&&module.exports)module.exports=api;
root.OpsNoticeBulk=api;
})(typeof window!=='undefined'?window:globalThis);
