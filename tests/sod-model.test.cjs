'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../sod-model.js');
const compose=options=>M.compose({workDate:'2026-11-09',...options});
test('Uses established SOD wording with specific priorities above three recurring responsibilities',()=>{
 const draft=compose({greeting:'normal',selected:[{id:'fictional-1',subject:'Example Court – Document Filing',action:'Verify the source document and file it in the correct property record.'}],extras:'Fictional Account – Balance Review: Check the ledger before preparing any notices.',constants:M.CONSTANTS});
 assert.equal(draft.specificCount,2);assert.equal(draft.recurringCount,3);
 assert.equal(draft.text,["Good Morning Leslie,","","Hope you're doing well!","","I'm getting started for the day. My priorities today are:","",
 '- Example Court – Document Filing: Verify the source document and file it in the correct property record.',
 '- Fictional Account – Balance Review: Check the ledger before preparing any notices.',
 ...M.CONSTANTS.map(x=>'- '+x.text),"","Please let me know if there's anything else you'd like me to prioritize today.","","Thank you, and wishing you a wonderful Monday!"].join('\n'));
});
test('Weekend greeting is a deliberate option, not an automatic day guess',()=>{
 const draft=compose({greeting:'weekend',constants:[M.CONSTANTS[0]]});
 assert.match(draft.text,/Hope you had a good weekend!/);
 assert.doesNotMatch(draft.text,/Hope you're doing well/);
});
test('Private task IDs never appear in sent email, and plan selection does not write or mutate tasks',()=>{
 const saved={id:'private-123',task_code:'M12',task_title:'Fictional lease follow-up',status:'pending',priority:'high',intake_details:{next_action:'Confirm signature status.'}};
 const before=JSON.stringify(saved),line=M.fromTask(saved);
 const result=compose({greeting:'normal',selected:[line],constants:[]});
 assert.match(result.text,/Fictional lease follow-up: Confirm signature status/);
 assert.doesNotMatch(result.text,/private-123|M12/);
 assert.equal(JSON.stringify(saved),before);
});
test('Completed, cancelled and archived tasks never appear as selectable morning tasks',()=>{
 const tasks=[{id:'a',status:'completed'},{id:'b',status:'cancelled'},{id:'c',status:'pending',archived_at:'2026-11-09'},{id:'d',status:'waiting',priority:'low',task_title:'Waiting on source'},{id:'e',status:'pending',priority:'urgent',task_title:'Urgent source'}];
 assert.deepEqual(M.candidates(tasks).map(x=>x.id),['e','d']);
 assert.throws(()=>M.fromTask(tasks[0]));
});
test('Rejects missing actions, repeated entries, malformed manual lines and invalid recurring overrides',()=>{
 const base={greeting:'normal',constants:M.CONSTANTS};
 for(const extras of ['Task without an action','Too short:',': No subject']){
  assert.throws(()=>compose({...base,extras}));
 }
 assert.throws(()=>compose({...base,extras:'Tenant Communications: Duplicated'}));
 assert.throws(()=>compose({...base,selected:[{id:'one',subject:'Fictional Task',action:''}]}));
 assert.throws(()=>compose({...base,selected:[{id:'one',subject:'Fictional Task',action:'One'},{id:'two',subject:'Fictional Task',action:'Two'}]}));
 assert.throws(()=>compose({...base,constants:[{id:'other',text:'Bad: Unknown'}]}));
});
test('No tenant/property examples are hardcoded in the model',()=>{
 for(const item of M.CONSTANTS)assert.doesNotMatch(item.text,/Normie|Queens Falls|Flicker|RoseWedge|Madison|Gary|Baird/i);
});

test('Weekday closing follows the supplied work date, including weekends, and rejects invalid dates',()=>{
 const weekdays=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
 for(const [index,weekday] of weekdays.entries()){
  const draft=compose({workDate:'2026-11-'+String(9+index).padStart(2,'0'),greeting:'normal',constants:M.CONSTANTS});
  assert.ok(draft.text.endsWith('Thank you, and wishing you a wonderful '+weekday+'!'));
 }
 for(const workDate of [undefined,'','Friday','2026-02-30','2026-11-09T00:00:00Z'])assert.throws(()=>compose({workDate,greeting:'normal',constants:M.CONSTANTS}),/valid Louisville work date/);
});
