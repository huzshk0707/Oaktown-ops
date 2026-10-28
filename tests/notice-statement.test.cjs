'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),S=require('../notice-statement.js');
const HEADER='Due Date,Category,Description,Lease Title,Status,Amount,Amount Due';
const row=(date,cat,description,amount,due,status='PAST DUE',lease='1715 Example Ave - Test')=>
 [date,cat,description,lease,status,'$'+amount,'$'+due].join(',');
function source(){
 const rows=[
 row('09/01/2026','RENT','Rent','955.00','614.50'),
 row('10/01/2026','RENT','Rent','955.00','955.00'),
 row('11/01/2026','RENT','Rent','955.00','955.00','UNPAID'),
 row('09/06/2026','LATE_FEE','One-time fee','47.75','47.75'),
 row('09/11/2026','LATE_FEE','One-time fee','47.75','47.75'),
 row('10/06/2026','LATE_FEE','One-time fee','47.75','47.75'),
 row('10/11/2026','LATE_FEE','One-time fee','47.75','47.75')
 ];
 for(const mm of ['09','10'])for(let day=11;day<=28;day++)
  rows.push(row(mm+'/'+String(day).padStart(2,'0')+'/2026','LATE_FEE','Daily fee','5.00','5.00',
   day===28&&mm==='10'?'UNPAID':'PAST DUE'));
 rows.push(row('08/01/2026','RENT','Paid August','955.00','0.00','PAID'));
 return HEADER+'\n'+rows.join('\n');
}
test('monthly late charges are summed from ledger, never calculated afresh',()=>{
 const x=S.summarize(source(),'2026-10-28','1715 Example Ave');
 assert.equal(x.charges.length,4);
 assert.deepEqual(x.charges.map(r=>[r.dueDate,r.category,r.description,r.amount,r.amountDue]),[
 ['2026-09-01','RENT','September rent','955.00','614.50'],
 ['2026-09-28','LATE_FEE','September late fees','185.50','185.50'],
 ['2026-10-01','RENT','October rent','955.00','955.00'],
 ['2026-10-28','LATE_FEE','October late fees','185.50','185.50']]);
 assert.equal(x.totalDue,'1940.50');
 assert.equal(x.ignoredFuture,1);assert.equal(x.ignoredSettled,1);assert.equal(x.included,42);
 assert.equal(x.propertyMatch,true);
});
test('CSV text supports quoted descriptions, commas, Windows newlines and spreadsheet tab paste',()=>{
 const quoted=HEADER+'\r\n'+'10/11/2026,LATE_FEE,"Daily, accrued fee",1715 Example Ave - Test,PAST DUE,$5.00,$5.00\r\n';
 assert.equal(S.summarize(quoted,'2026-10-28','1715 Example Ave').charges[0].amountDue,'5.00');
 const tsv=HEADER.replace(/,/g,'\t')+'\n'+'10/01/2026\tRENT\tRent\t1715 Example Ave - Test\tPAST DUE\t$955.00\t$955.00';
 assert.equal(S.summarize(tsv,'2026-10-28','1715 Example Ave').totalDue,'955.00');
});
test('bad rows, cross-lease mixes and invalid calendars are rejected',()=>{
 assert.throws(()=>S.parse('hi'),/header/);
 assert.throws(()=>S.summarize(HEADER+'\n'+row('02/30/2026','RENT','bad','5','5'),'2026-10-28'),/calendar/);
 assert.throws(()=>S.summarize(HEADER+'\n'+row('10/01/2026','RENT','Rent','955','956'),'2026-10-28'),/exceeds/);
 assert.throws(()=>S.summarize(HEADER+'\n'+row('10/01/2026','RENT','Rent','5','5','PAID'),'2026-10-28'),/PAID/);
 assert.throws(()=>S.summarize(HEADER+'\n'+row('10/01/2026','RENT','Rent','5','5')+'\n'+row('10/02/2026','RENT','Rent','5','5','PAST DUE','Another Lease - Test'),'2026-10-28'),/more than one lease/);
});
test('old paid fees, future rents and names from another notice are never silently copied',()=>{
 const x=S.summarize(source(),'2026-09-15','Unrelated Road');
 assert.equal(x.propertyMatch,false);
 assert.ok(x.charges.every(r=>r.dueDate<='2026-09-15'));
 assert.equal(x.ignoredFuture,35); // September after 15th plus all October and November
});
