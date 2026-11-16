/* Separate, explicit plan permissions. The backend revalidates every grant. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),cloud=window.OpsCloud,A=window.OpsPlanApi;
 if(!A||!$('plan-consent-panel'))return;
 let epoch=0,busy=false,capTicket=0,canManage=false,clients=[];
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=String(text);return n};
 const same=(at,user)=>at===epoch&&cloud.user?.id===user;
 function controls(){for(const node of document.querySelectorAll('#plan-consent-list input,#plan-consent-list button,#plan-consent-refresh'))node.disabled=busy||!cloud.user;for(const node of $('plan-capability-form').elements)node.disabled=busy||!cloud.user||!canManage||!clients.length;}
 function setup(){
  const value=window.OpsTaskConnection?.setup();canManage=value?.userId===cloud.user?.id&&value?.canManage===true;clients=canManage?value.clients:[];
  const selected=$('plan-capability-client').value;$('plan-capability-client').replaceChildren();
  for(const c of clients){const option=el('option',c.label);option.value=c.client_id;$('plan-capability-client').append(option)}
  if(clients.some(c=>c.client_id===selected))$('plan-capability-client').value=selected;
  controls();if(canManage&&$('plan-capabilities').open)readCapabilities();
 }
 async function readCapabilities(){
  const id=$('plan-capability-client').value;if(!cloud.user||!canManage||!id||busy)return;
  const at=epoch,user=cloud.user.id,ticket=++capTicket;$('plan-capability-confirm').checked=false;
  $('plan-capability-status').textContent='Reading plan capabilities…';
  try{const c=await A.call('capabilities',{client_id:id});if(!same(at,user)||ticket!==capTicket||$('plan-capability-client').value!==id)return;
   if(c?.client_id!==id||typeof c.can_read_plans!=='boolean'||typeof c.can_submit_plans!=='boolean')throw Error('Plan capabilities were not confirmed');
   $('plan-capability-read').checked=c.can_read_plans;$('plan-capability-submit').checked=c.can_submit_plans;$('plan-capability-status').textContent='Saved settings loaded. Users must separately consent after capabilities change.';
  }catch(e){if(same(at,user)&&ticket===capTicket){$('plan-capability-read').checked=false;$('plan-capability-submit').checked=false;$('plan-capability-status').textContent=e.message}}
 }
 const check=(label,checked=false)=>{const wrap=el('label');wrap.className='task-connection-check';const input=el('input');input.type='checkbox';input.checked=checked;wrap.append(input,document.createTextNode(label));return {wrap,input}};
 async function refresh(){
  if(!cloud.user||busy)return;const at=epoch,user=cloud.user.id;busy=true;controls();$('plan-consent-status').textContent='Reading your authorized connections…';
  try{const connections=await A.call('my_connections');if(!same(at,user))return;if(!Array.isArray(connections))throw Error('Plan connections were not confirmed');const list=$('plan-consent-list');list.replaceChildren();
   for(const c of connections){if(typeof c.client_id!=='string'||typeof c.label!=='string')throw Error('Incomplete plan connection');
    const form=el('form');form.setAttribute('aria-label',c.label+' plan access');form.append(el('strong',c.label),el('p',c.enabled?'Client capabilities: '+(c.can_submit_plans?'read + proposal submission':c.can_read_plans?'read only':'plan access disabled'):'Client disabled. You may revoke your plan consent.'));
    const read=check('Allow this connection to read approved SODs',c.my_can_read_plans),submit=check('Allow this connection to submit proposals for my review',c.my_can_submit_plans),confirm=check('I reviewed these permissions');confirm.input.required=true;
    const save=el('button','Save my plan consent');save.type='submit';save.className='button';const revoke=el('button','Revoke my plan consent');revoke.type='button';revoke.className='button';const message=el('p');message.setAttribute('role','status');form.append(read.wrap,submit.wrap,confirm.wrap,save,revoke,message);
    async function saveConsent(revoking){
     if(busy||!same(at,user))return;const choice={client_id:c.client_id,can_read_plans:!revoking&&read.input.checked,can_submit_plans:!revoking&&submit.input.checked,confirmed:true};
     if(!revoking&&!confirm.input.checked)return;
     if(choice.can_submit_plans&&!choice.can_read_plans){message.textContent='Proposal submission requires explicit read permission.';return}
     busy=true;controls();message.textContent='Saving your separate plan consent…';
     try{const saved=await A.call('consent',choice);if(!same(at,user))return;if(saved?.saved!==true||saved.actor_id!==user||saved.client_id!==c.client_id)throw Error('Consent receipt was not confirmed');const actual=await A.call('capabilities',{client_id:c.client_id});if(!same(at,user))return;
      if(actual?.client_id!==c.client_id||actual.my_can_read_plans!==choice.can_read_plans||actual.my_can_submit_plans!==choice.can_submit_plans)throw Error('Consent readback did not match');
      read.input.checked=choice.can_read_plans;submit.input.checked=choice.can_submit_plans;confirm.input.checked=false;message.textContent=revoking?'Your plan consent is revoked and verified. Task consent is unchanged.':'Your plan consent is saved and verified. Approval still requires native staff review.';
     }catch(e){if(same(at,user))message.textContent='Plan consent not verified: '+e.message+'. Refresh saved settings before retrying.'}
     finally{if(same(at,user)){busy=false;controls()}}
    }
    form.addEventListener('submit',e=>{e.preventDefault();saveConsent(false)});revoke.onclick=()=>saveConsent(true);list.append(form);
   }
   $('plan-consent-status').textContent=connections.length?'Select only the permissions you intend to grant.':'No active OAuth connections for your account. Complete the ChatGPT sign-in first.';
  }catch(e){if(same(at,user)){$('plan-consent-list').replaceChildren();$('plan-consent-status').textContent=e.message}}
  finally{if(same(at,user)){busy=false;controls()}}
 }
 $('plan-capability-form').onsubmit=async e=>{
  e.preventDefault();if(busy||!canManage||!cloud.user||!$('plan-capability-confirm').checked)return;
  const choice={client_id:$('plan-capability-client').value,can_read_plans:$('plan-capability-read').checked,can_submit_plans:$('plan-capability-submit').checked};
  if(choice.can_submit_plans&&!choice.can_read_plans){$('plan-capability-status').textContent='Proposal submission requires explicit read permission.';return}
  const at=epoch,user=cloud.user.id;busy=true;capTicket++;controls();$('plan-capability-status').textContent='Saving plan capabilities and resetting prior plan consents…';
  try{const saved=await A.call('configure',choice);if(!same(at,user))return;const actual=await A.call('capabilities',{client_id:choice.client_id});if(!same(at,user))return;
   if(saved?.client_id!==choice.client_id||actual?.client_id!==choice.client_id||actual.can_read_plans!==choice.can_read_plans||actual.can_submit_plans!==choice.can_submit_plans)throw Error('Capability readback did not match');
   $('plan-capability-confirm').checked=false;$('plan-consent-list').replaceChildren();$('plan-consent-status').textContent='Client settings changed. Refresh and review your separate plan consent.';$('plan-capability-status').textContent='Plan capabilities saved and verified. Affected users must grant fresh plan consent; existing task access is separate.';
  }catch(error){if(same(at,user))$('plan-capability-status').textContent='Plan capabilities not verified: '+error.message+'. Read saved settings before retrying.'}
  finally{if(same(at,user)){busy=false;controls()}}
 };
 $('plan-capability-client').onchange=readCapabilities;$('plan-capabilities').ontoggle=()=>{if($('plan-capabilities').open)readCapabilities()};
 $('plan-consent-refresh').onclick=refresh;$('plan-consent-panel').ontoggle=()=>{if($('plan-consent-panel').open)refresh()};
 window.addEventListener('ops-task-connection-change',setup);
 window.addEventListener('ops-auth-change',()=>{epoch++;capTicket++;busy=false;clients=[];canManage=false;$('plan-consent-list').replaceChildren();$('plan-capability-form').reset();$('plan-capability-client').replaceChildren();$('plan-consent-status').textContent=cloud.user?'Open to review your separate plan consent.':'Sign in with your native staff account.';$('plan-capability-status').textContent='Choose a registered client.';controls()});
 setup();controls();
})();
