/* Lead Copilot v0.5 — staff-assisted, no paid AI API, no automatic sending. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const cloud = window.OpsCloud;
  const rules = window.OpsLeadRules;
  // Production stays off until unit/listing reconciliation, RLS testing and explicit approval.
  const CLOUD_LEADS_ENABLED = false;
  const STAGED_MESSAGE = 'Test-only drafting. Cloud leads and applicant screening are disabled pending Portfolio Master reconciliation and approval.';
  const keys = ['income','incomeBasis','residence','pets','petDetails','assistanceAnimal','adverse','adverseDetails','walkthrough','walkthroughDetails','voucher','voucherDetails'];
  let selectedId = null, selectedUpdated = null, properties = [], leads = [], loadedUser = null;
  let loadEpoch = 0, savedIncoming = '', cloudLoaded = false;
  let formEpoch=0,historyEpoch=0,dirty=false,replyDirty=false,writeBusy=false;
  const say = (id, message) => { const el = $(id); if(el) el.textContent = message; };
  const v = id => $(id).value.trim();
  const set = (id, value) => { $(id).value = value == null ? '' : String(value); };
  const propertyId = () => v('lead-property');
  const option = (value, title) => new Option(title, value);
  function formAnswers() {
    return Object.fromEntries(keys.map(k => [k, v('lead-'+k)]));
  }
  function fillAnswers(answers = {}) {
    for (const key of keys) set('lead-'+key, answers[key] || (['incomeBasis','voucher','assistanceAnimal'].includes(key) ? 'unknown' : ''));
  }
  function clearCandidates() { $('lead-candidates').replaceChildren(); }
  function discardChanges(){return !dirty||confirm('Discard this unsaved lead draft and message? Lead drafts last only for this page session.');}
  function cloudAllowed(){if(CLOUD_LEADS_ENABLED)return true;say('lead-save-status',STAGED_MESSAGE);return false;}
  async function writing(action){
    if(writeBusy)return;writeBusy=true;
    const controls=[...$('leads-workflow').querySelectorAll('input,select,textarea,button')],states=controls.map(el=>el.disabled);
    controls.forEach(el=>el.disabled=true);
    try{await action()}finally{writeBusy=false;controls.forEach((el,i)=>el.disabled=states[i]);}
  }
  function clearLead() {
    ++formEpoch;++historyEpoch;dirty=false;replyDirty=false;
    $('lead-message-history').replaceChildren();
    selectedId = selectedUpdated = null;
    savedIncoming = '';
    set('lead-name',''); set('lead-status','new'); set('lead-source','Zillow');
    set('lead-property',''); set('lead-availability','unknown'); set('lead-rent','');
    $('lead-rent-verified').checked = false;
    set('lead-incoming',''); fillAnswers(); set('lead-saved-list','');
    clearCandidates(); say('lead-save-status','New unsaved draft.'); preview();
  }
  function preview(regenerate=false) {
    const result = rules.assess({
      answers: formAnswers(),
      property: {
        propertyId: propertyId(),
        availability: v('lead-availability'),
        askingRent: v('lead-rent'),
        rentVerified: $('lead-rent-verified').checked,
        incomeMultiplier: Number(v('lead-multiplier'))
      }
    });
    say('lead-next-step',result.step);
    if(!replyDirty||regenerate===true){set('lead-response','[TEST DRAFT — not approved for applicant use]\n'+result.draft);replyDirty=false;}
    else say('lead-copy-status','Your edited reply is preserved. Generate explicitly to replace it.');
    $('lead-flags').replaceChildren();
    const alerts = [...result.flags];
    if (v('lead-incoming') && keys.every(k => ['incomeBasis','voucher','assistanceAnimal'].includes(k) ? v('lead-'+k)==='unknown' : !v('lead-'+k))) {
      alerts.unshift('Pasted tenant message has not been reviewed and confirmed as structured answers.');
    }
    if (result.incomeMinimum !== null) alerts.push('Illustrative threshold: $'+result.incomeMinimum.toLocaleString('en-US')+'/month. This is NOT a rental eligibility decision.');
    if (alerts.length) {
      const heading = document.createElement('strong'); heading.textContent = 'Review before sending'; $('lead-flags').append(heading);
      const list = document.createElement('ul');
      for(const flag of alerts){ const li = document.createElement('li'); li.textContent = flag; list.append(li); }
      $('lead-flags').append(list);
    }
    if(!replyDirty)say('lead-copy-status','Test draft only · Leslie must approve templates before applicant use.');
  }
  function renderCandidates() {
    const list = rules.extractCandidates(v('lead-incoming'));
    clearCandidates();
    if (!list.length) { say('lead-candidates','No reliable field suggestions. Enter the tenant’s answers manually.'); return; }
    const lead = document.createElement('p'); lead.className='subtle';
    lead.textContent = 'Possible answers only. Check against the tenant’s message before applying.';
    $('lead-candidates').append(lead);
    for (const candidate of list) {
      const row = document.createElement('div'); row.className='lead-candidate';
      const body = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = candidate.field+' → '+candidate.value;
      const hint = document.createElement('p'); hint.textContent = candidate.reason;
      body.append(title,hint);
      const button = document.createElement('button'); button.type='button'; button.className='button'; button.textContent='Confirm & apply';
      button.addEventListener('click',()=>{
        set('lead-'+candidate.field,candidate.value);dirty=true;
        button.disabled = true; button.textContent = 'Applied';
        preview();
      });
      row.append(body,button); $('lead-candidates').append(row);
    }
  }
  async function loadProperties() {
    if(!cloud.user) return;
    const epoch = ++loadEpoch;
    const rows=await cloud.api('/rest/v1/properties?select=id,street_address,unit,city,postal_code&order=street_address.asc');
    if(epoch!==loadEpoch || !cloud.user) return;
    properties=rows;
    const prior=propertyId();
    $('lead-property').replaceChildren(option('','Unlinked draft — select a property'));
    for (const p of rows) $('lead-property').add(option(p.id,[p.street_address,p.unit,p.city,p.postal_code].filter(Boolean).join(' ')));
    if(rows.some(x=>x.id===prior)) set('lead-property',prior);
  }
  async function loadLeads() {
    if(!cloud.user||!CLOUD_LEADS_ENABLED) return;
    const epoch=++loadEpoch;
    const rows=await cloud.api('/rest/v1/leads?select=id,full_name,source,status,primary_property_id,screening,updated_at&order=updated_at.desc&limit=80');
    if(epoch!==loadEpoch || !cloud.user) return;
    leads=rows;
    const prior=selectedId;
    $('lead-saved-list').replaceChildren(option('','Select a saved lead'));
    rows.forEach((lead)=>{
      const p=properties.find(x=>x.id===lead.primary_property_id);
      $('lead-saved-list').add(option(lead.id,(lead.full_name||'Unnamed lead')+' · '+(p?.street_address||'Property unavailable')+' · '+lead.status));
    });
    if(rows.some(x=>x.id===prior)) set('lead-saved-list',prior);
    say('lead-workflow-status',rows.length+' recent lead records loaded. Draft replies require review before sending.');
  }
  function requireSignIn() {
    if(cloud.user) return true;
    say('lead-save-status','Sign in to the Oaktown Ops account before saving to Supabase.');
    const b=$('account-button'); if(b) b.click();
    return false;
  }
  function payload() {
    return {
      full_name:v('lead-name') || null,
      source:v('lead-source'),
      status:v('lead-status'),
      primary_property_id:propertyId() || null,
      screening:{
        ...formAnswers(),
        availability:v('lead-availability'),
        askingRent:v('lead-rent')||null,
        rentVerified:$('lead-rent-verified').checked
      }
    };
  }
  function currentPropertyIsLinked() {
    return properties.some(p=>p.id===propertyId());
  }
  async function saveLead() {
    if(!cloudAllowed()||!requireSignIn()) return;
    if(!currentPropertyIsLinked()){say('lead-save-status','Choose a linked Property Master record before saving. You may still use this as a local draft.');return;}
    await writing(async()=>{
    const identity=formEpoch,user=cloud.user.id; say('lead-save-status','Saving lead…');
    try{
      const data=payload(),options=selectedId?
        {method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(data)}:
        {method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(data)};
      const query=selectedId ? '?id=eq.'+encodeURIComponent(selectedId)+'&updated_at=eq.'+encodeURIComponent(selectedUpdated) : '';
      const rows=await cloud.api('/rest/v1/leads'+query, options);
      if(identity!==formEpoch||cloud.user?.id!==user)return;
      if(!rows.length) throw Error('This lead changed elsewhere. Refresh and reopen the record before saving.');
      selectedId=rows[0].id; selectedUpdated=rows[0].updated_at;dirty=!!v('lead-incoming')||replyDirty;
      say('lead-save-status','Lead saved privately in Supabase. Tenant messages are saved separately.');
      await loadLeads();
      set('lead-saved-list',selectedId);
    }catch(err){
      if(identity!==formEpoch||cloud.user?.id!==user)return;
      say('lead-save-status',err.status===404||err.code==='42P01'?'Lead tables are not deployed yet. Apply the reviewed v0.5 schema after the Portfolio Master migration.':err.message);
    }
    });
  }
  async function saveMessage() {
    if(!cloudAllowed()||!requireSignIn()) return;
    if(!selectedId){say('lead-save-status','Save the lead record first.');return;}
    const text=v('lead-incoming');
    if(!text){say('lead-save-status','Paste the tenant message before saving it.');return;}
    if(text===savedIncoming){say('lead-save-status','This tenant message has already been saved in the current session.');return;}
    await writing(async()=>{
    const identity=formEpoch,user=cloud.user.id;say('lead-save-status','Saving tenant message…');
    try{
      await cloud.api('/rest/v1/lead_messages',{method:'POST',body:JSON.stringify({lead_id:selectedId,direction:'tenant',body:text})});
      if(identity!==formEpoch||cloud.user?.id!==user)return;
      savedIncoming=text;say('lead-save-status','Tenant message saved to the lead history.');
      await loadHistory();
    }catch(err){if(identity===formEpoch&&cloud.user?.id===user)say('lead-save-status',err.message);}
    });
  }
  async function loadHistory() {
    const target=$('lead-message-history');
    if(!target) return;
    target.replaceChildren();
    if(!selectedId||!cloud.user||!CLOUD_LEADS_ENABLED)return;
    const epoch=++historyEpoch,id=selectedId,user=cloud.user.id;
    const current=()=>epoch===historyEpoch&&id===selectedId&&cloud.user?.id===user;
    try{
      const rows=await cloud.api('/rest/v1/lead_messages?select=direction,body,created_at&lead_id=eq.'+encodeURIComponent(selectedId)+'&order=created_at.desc&limit=30');
      if(!current())return;
      if(!rows.length){target.textContent='No saved conversation messages.';return;}
      for(const r of rows){
        const item=document.createElement('div');item.className='lead-history-item';
        const title=document.createElement('strong');title.textContent=r.direction+' · '+new Date(r.created_at).toLocaleString();
        const body=document.createElement('p');body.textContent=r.body;
        item.append(title,body);target.append(item);
      }
    }catch(e){if(current())target.textContent='Unable to load messages: '+e.message;}
  }
  async function openLead(id) {
    const lead=leads.find(l=>l.id===id);
    if(!lead)return;
    if(writeBusy||!discardChanges()){set('lead-saved-list',selectedId||'');return;}
    ++formEpoch;++historyEpoch;dirty=false;replyDirty=false;$('lead-message-history').replaceChildren();
    selectedId=lead.id;selectedUpdated=lead.updated_at;savedIncoming='';
    set('lead-name',lead.full_name||'');set('lead-source',lead.source);
    set('lead-status',lead.status);set('lead-property',lead.primary_property_id||'');
    const data=lead.screening || {};
    fillAnswers(data);
    // Stored snapshots are not current unit/listing verification.
    set('lead-availability','unknown');set('lead-rent','');$('lead-rent-verified').checked=false;
    set('lead-incoming','');clearCandidates();
    say('lead-save-status','Opened saved lead. Add messages explicitly; nothing sends automatically.');
    preview();await loadHistory();
  }
  function setup() {
    if(!$('leads-workflow'))return;
    $('lead-draft').addEventListener('click',()=>{if(!replyDirty||confirm('Replace your edited reply with a new test draft?')){preview(true);dirty=true;}});
    $('lead-detect').addEventListener('click',renderCandidates);
    $('lead-clear').addEventListener('click',()=>{if(!writeBusy&&discardChanges())clearLead();});
    $('lead-save').addEventListener('click',saveLead);
    $('lead-save-message').addEventListener('click',saveMessage);
    $('lead-refresh').addEventListener('click',async()=>{if(!cloudAllowed()||!requireSignIn())return;try{await loadProperties();await loadLeads();}catch(e){say('lead-save-status',e.message);}});
    $('lead-saved-list').addEventListener('change',e=>openLead(e.target.value).catch(err=>say('lead-save-status',err.message)));
    $('lead-copy').addEventListener('click',async()=>{
      const value=v('lead-response');
      if(!value){say('lead-copy-status','Generate a draft first.');return;}
      try{await navigator.clipboard.writeText(value.startsWith('[TEST DRAFT')?value:'[TEST DRAFT — not approved for applicant use]\n'+value);say('lead-copy-status','Test draft copied. Not approved for applicant use.');}
      catch{ $('lead-response').focus();$('lead-response').select();say('lead-copy-status','Selected the draft. Copy it using your browser command.'); }
    });
    $('lead-property').addEventListener('change',()=>{
      set('lead-rent',''); $('lead-rent-verified').checked=false;
      set('lead-availability','unknown');preview();
    });
    $('lead-incoming').addEventListener('input',()=>{clearCandidates();});
    $('lead-response').addEventListener('input',()=>{replyDirty=true;dirty=true;});
    $('leads-workflow').addEventListener('input',event=>{if(event.target.matches('input,select,textarea')&&event.target.id!=='lead-saved-list')dirty=true;});
    window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
    for(const el of $('leads-workflow').querySelectorAll('input,select')) {
      if(['lead-property','lead-saved-list'].includes(el.id))continue;
      el.addEventListener('change',()=>preview());
    }
    document.querySelector('[data-workspace="leads"]')?.addEventListener('click',async ()=>{
      if(!cloud.user || cloudLoaded)return;
      try{await loadProperties();await loadLeads();cloudLoaded=true;if(!CLOUD_LEADS_ENABLED)say('lead-workflow-status',STAGED_MESSAGE);}
      catch(e){say('lead-workflow-status','Cloud lead loading unavailable: '+e.message+'. Local drafting still works.');}
    });
    window.addEventListener('ops-auth-change',async event=>{
      const user=event.detail.user?.id||null;
      if(!user){
        ++loadEpoch;loadedUser=null;cloudLoaded=false;properties=[];leads=[];selectedId=null;selectedUpdated=null;
        $('lead-property').replaceChildren(option('','Unlinked draft — sign in for properties'));
        $('lead-saved-list').replaceChildren(option('','Sign in to open saved leads'));
        $('lead-message-history').replaceChildren();
        clearLead();
        say('lead-workflow-status',STAGED_MESSAGE);
        return;
      }
      if(user===loadedUser)return;
      if(loadedUser && loadedUser!==user){++loadEpoch;properties=[];leads=[];clearLead();$('lead-property').replaceChildren(option('','Loading properties…'));$('lead-saved-list').replaceChildren(option('','Select a saved lead'));}
      loadedUser=user; cloudLoaded=false;
      if($('leads-workflow').hidden){say('lead-workflow-status','Signed in. Open Lead Copilot to load private lead records.');return;}
      try{await loadProperties();await loadLeads();cloudLoaded=true;}
      catch(e){say('lead-workflow-status','Cloud lead loading unavailable: '+e.message+'. Local drafting still works.');}
    });
    clearLead();say('lead-workflow-status',STAGED_MESSAGE);
    // Do not broadcast a synthetic auth event into unrelated v0.4 workflows.
    if(cloud.user){loadedUser=cloud.user.id;say('lead-workflow-status',STAGED_MESSAGE);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();
