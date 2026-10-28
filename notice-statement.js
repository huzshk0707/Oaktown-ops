/* Local-only rental ledger CSV importer. No network, disk, or browser storage APIs.
 * Aggregates source charges; it never creates or calculates a new late fee.
 * Only current outstanding charges on/before the selected notice date are included.
 */
(function(root,factory){
 'use strict';
 const exported=factory();
 if(root)root.OpsStatement=exported;
 if(typeof module==='object'&&module.exports)module.exports=exported;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const REQUIRED=['Due Date','Category','Description','Status','Amount','Amount Due'];
 const norm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
 function parse(text){
  if(typeof text!=='string'||!text.trim())throw Error('Paste CSV data or choose a CSV file first.');
  if(text.length>1024*1024)throw Error('CSV exceeds the 1 MB local import limit.');
  text=text.replace(/^\uFEFF/,'');
  const delimiter=(text.split(/\r?\n/,1)[0].includes('\t')?'\t':',');
  const rows=[];let row=[],cell='',quoted=false,ended=false;
  for(let i=0;i<text.length;i++){
   const c=text[i];
   if(quoted){
    if(c==='"'&&text[i+1]==='"'){cell+='"';i++}
    else if(c==='"')quoted=false;
    else cell+=c;
   }else if(c==='"'){if(cell.trim())throw Error('Malformed CSV quotes.');quoted=true}
   else if(c===delimiter){row.push(cell);cell=''}
   else if(c==='\n'||c==='\r'){
    if(c==='\r'&&text[i+1]==='\n')i++;
    row.push(cell);cell='';
    if(row.some(v=>v.trim()))rows.push(row);
    row=[];
    if(rows.length>5001)throw Error('CSV exceeds 5,000 rows.');
   }else cell+=c;
  }
  if(quoted)throw Error('Unclosed quote in CSV.');
  row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
  if(rows.length<2)throw Error('CSV must contain a header and at least one transaction.');
  const headers=rows.shift().map(s=>s.trim());
  if(new Set(headers.map(norm)).size!==headers.length)throw Error('CSV has duplicate header names.');
  const index={};for(const key of REQUIRED){
   const at=headers.findIndex(h=>norm(h)===norm(key));
   if(at<0)throw Error('Missing CSV column: '+key);
   index[key]=at;
  }
  const leaseAt=headers.findIndex(h=>norm(h)==='lease title');
  return rows.map((cols,rowNum)=>{
   if(cols.length!==headers.length)throw Error('Row '+(rowNum+2)+' has '+cols.length+' fields, expected '+headers.length+'.');
   const get=k=>cols[index[k]].trim();
   return {dueDate:get('Due Date'),category:get('Category'),description:get('Description'),status:get('Status'),
    amount:get('Amount'),amountDue:get('Amount Due'),leaseTitle:leaseAt<0?'':cols[leaseAt].trim(),line:rowNum+2};
  });
 }
 const moneyCents=(s,line,key)=>{
  const cleaned=String(s).trim().replace(/^\$/,'').replace(/,/g,'');
  if(!/^(?:\d+)(?:\.\d{1,2})?$/.test(cleaned))throw Error('Invalid '+key+' on CSV row '+line+'.');
  const [whole,dec='']=cleaned.split('.');
  const cents=Number(whole)*100+Number(dec.padEnd(2,'0'));
  if(!Number.isSafeInteger(cents))throw Error('Amount too large on row '+line+'.');
  return cents;
 };
 const isoDate=(value,line)=>{
  const v=String(value||'').trim(),parts=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v)||/^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if(!parts)throw Error('Invalid due date on CSV row '+line+'.');
  const iso=/^\d{4}/.test(v),year=+(iso?parts[1]:parts[3]),month=+(iso?parts[2]:parts[1]),day=+(iso?parts[3]:parts[2]);
  const date=new Date(Date.UTC(year,month-1,day));
  if(year<1900||year>2200||date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)
   throw Error('Invalid calendar date on CSV row '+line+'.');
  return String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
 };
 const monthName=key=>new Date(Date.UTC(Number(key.slice(0,4)),Number(key.slice(5,7))-1,1))
  .toLocaleDateString('en-US',{month:'long',timeZone:'UTC'});
 const cleanAddress=s=>norm(s).replace(/[^a-z0-9]/g,'');
 function summarize(raw,noticeDate,propertyStreet=''){
  const cutoff=isoDate(noticeDate,'notice'), rows=typeof raw==='string'?parse(raw):raw;
  if(!Array.isArray(rows)||!rows.length)throw Error('No CSV transactions to import.');
  const titles=new Set(rows.map(r=>r.leaseTitle).filter(Boolean));
  if(titles.size>1)throw Error('CSV contains more than one lease. Import a single property at a time.');
  const title=[...titles][0]||'';
  const address=cleanAddress(propertyStreet),lease=cleanAddress(title.split(/\s+-\s+/)[0]);
  const propertyMatch=!title||!!address&&(lease.includes(address)||address.includes(lease));
  const groups=new Map(),individual=[];
  let ignoredSettled=0,ignoredFuture=0, included=0;
  for(const r of rows){
   const date=isoDate(r.dueDate,r.line),amount=moneyCents(r.amount,r.line,'Amount'),
    due=moneyCents(r.amountDue,r.line,'Amount Due');
   if(due>amount)throw Error('Amount Due exceeds Amount on CSV row '+r.line+'. Review this ledger before importing.');
   if(date>cutoff){ignoredFuture++;continue;}
   if(due===0){ignoredSettled++;continue;}
   if(norm(r.status)==='paid')throw Error('CSV row '+r.line+' is marked PAID but still has an amount due.');
   const category=r.category.toUpperCase().trim();
   const month=date.slice(0,7),groupable=category==='RENT'||category==='LATE_FEE';
   const key=month+'|'+category;
   if(groupable){
    const item=groups.get(key)||{dueDate:date,category,description:monthName(month)+(category==='RENT'?' rent':' late fees'),
      amountCents:0,dueCents:0,count:0,status:'UNPAID'};
    item.dueDate=category==='LATE_FEE'?(date>item.dueDate?date:item.dueDate):(date<item.dueDate?date:item.dueDate);
    item.amountCents+=amount;item.dueCents+=due;item.count++;
    if(norm(r.status).includes('past')||date<cutoff)item.status='PAST DUE';
    groups.set(key,item);
   }else individual.push({dueDate:date,category,description:r.description,amountCents:amount,dueCents:due,count:1,
    status:norm(r.status).includes('past')||date<cutoff?'PAST DUE':'UNPAID'});
   included++;
  }
  const entries=[...groups.values(),...individual].sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||a.category.localeCompare(b.category));
  if(!entries.length)throw Error('No unpaid or past-due rows on or before the notice date.');
  const charges=entries.map(x=>({dueDate:x.dueDate,category:x.category,description:x.description,status:x.status,
   amount:(x.amountCents/100).toFixed(2),amountDue:(x.dueCents/100).toFixed(2),sourceCount:x.count}));
  const cents=entries.reduce((a,x)=>a+x.dueCents,0);
  return {charges,totalDue:(cents/100).toFixed(2),leaseTitle:title,propertyMatch,
    ignoredSettled,ignoredFuture,included,sourceRows:rows.length,noticeDate:cutoff};
 }
 return Object.freeze({parse,summarize});
});