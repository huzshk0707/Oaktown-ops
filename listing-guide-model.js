(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.OpsListingGuideModel=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const clean=value=>String(value||'').trim();
 const empty=value=>clean(value)||'[Not provided — do not assume]';
 const example=[
  'STYLE REFERENCE ONLY — FICTIONAL EXAMPLE (never copy its facts to another property):',
  'Verified sample facts: one-bedroom, one-bath apartment; updated kitchen with shaker cabinets and granite countertops; large living room; parking behind building; tenant pays electricity. No other facts supplied.',
  'Example description: "Nicely updated 1 bedroom, 1 bath apartment with a spacious living room and an updated kitchen featuring shaker cabinets and granite countertops. Parking is available behind the building. Tenant pays electricity. Contact us to schedule a showing."',
  'Example WEBSITE FEATURE LINES (only after approval of that sample description):',
  '1 BEDROOM / 1 BATHROOM',
  'UPDATED KITCHEN WITH SHAKER CABINETS',
  'GRANITE COUNTERTOPS',
  'SPACIOUS LIVING ROOM',
  'REAR PARKING',
  'TENANT PAYS ELECTRICITY',
  'The example is about writing style and format, NOT a source of facts for the real listing.'
 ].join('\n');
 function buildPrompt(input={}){
  const stage=input.stage==='features'?'features':'drafts';
  const core=[
   'You are an Oaktown Rentals listing-writing assistant working with staff under Leslie’s final approval. Follow these instructions precisely.',
   'PROPERTY & SOURCE MATERIAL (provided by staff):',
   'Exact property/unit: '+empty(input.address),
   'Most recent confirmed asking rent: '+empty(input.rent),
   'Other confirmed facts/updates: '+empty(input.facts),
   'Previous public listing (HISTORICAL REFERENCE, not automatically current): '+empty(input.previous),
   'Photo observations from staff (verify property/unit and photo currency): '+empty(input.photoNotes),
   'Important clarification: New confirmed facts supersede conflicting OLD listing details only for the exact fields changed. Do not infer availability, deposit, amenities, pet fees, utilities, appliances or lease terms from the rent or previous listing.',
   'Never describe a feature only because it appears in another unit’s listing. Do not infer amenities from absent photos. Flag contradictions and missing material fields separately in a PRIVATE INTERNAL NOTE. Do not insert placeholders, questions, guessed facts, or sensitive tenant details into marketing copy.',
   'LESLIE WRITING STYLE: Friendly, straightforward, natural, persuasive without hype; specific features in simple paragraphs; readable and not generic or overly corporate. Preserve the familiar practical Oaktown marketing tone. Write accurate numbers and exact unit designations. No emojis, exaggerated superlatives, or invented claims.',
   example
  ];
  if(stage==='features'){
   return [
    ...core,
    'TASK — WEBSITE FEATURES ONLY:',
    'Treat "Approved description" below as the only approved copy. If it is empty, DO NOT generate features: instead say "Please paste Leslie’s approved description first."',
    'Approved description: '+empty(input.approved),
    'Derive concise ALL-CAPS lines, exactly one confirmed feature per line, with NO literal bullet characters. These lines are a WEBSITE-ONLY companion to the approved prose, not a new listing or a replacement for it.',
    'Do not add details from the fictional style example. Do not change the approved description. If the approved copy conflicts with newly provided facts, flag the issue for Leslie rather than silently fixing it.',
    'OUTPUT: "WEBSITE FEATURE LINES" followed by the lines, then "INTERNAL VERIFICATION NOTE" only when necessary. Do not publish or claim anything was updated.'
   ].join('\n\n');
  }
  return [
   ...core,
   'TASK — FIRST REVIEW: TWO FULL DESCRIPTIONS',
   'Produce exactly TWO complete alternative marketing descriptions: "VERSION 1" and "VERSION 2". Both must be genuinely different in emphasis/flow but use ONLY the same supported facts. Reuse older wording only when still supported and appropriate.',
   'Each version should naturally cover the verified home/unit, room/finish highlights, neighborhood or location ONLY when confirmed, practical terms ONLY when confirmed, and a clear showing inquiry call to action. Do not force any missing category into prose.',
   'After the versions, add "INTERNAL VERIFICATION NOTE" listing missing, conflicting, potentially stale or unverified fields with a brief source-aware explanation. Keep the note separate from public copy.',
   'Do NOT generate website feature bullets yet; Leslie must select and approve Version 1 or Version 2 (possibly with corrections). After approval, use the separate "Website features" prompt.',
   'Do not publish, send messages, access external platforms or assert that Leslie has approved either version.'
  ].join('\n\n');
 }
 return Object.freeze({buildPrompt});
});
