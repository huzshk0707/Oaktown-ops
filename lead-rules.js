/* Oaktown Ops v0.5 — deterministic, advisory-only lead rules. No outbound messages or approvals. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.OpsLeadRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const OPENING = "What I typically do is allow self viewings. DO NOT SEND ME YOUR LICENSE BEFORE THE QUESTIONS ARE ANSWERED AND I ASK FOR IT! You text me a picture of your drivers license and I’ll text you back the lock box code. But first I have a few pre-qualifying questions so we don’t waste each other’s time. What is your monthly income? Do you rent now, if so how long have you been there? Do you have any animals, if so what is breed and weight? Do you have any bankruptcies, foreclosures, evictions or repos, if so how old?  Would you allow a walk threw of your current property for final approval?";
  const FIELDS = [
    ['income', 'What is your monthly income?'],
    ['residence', 'Do you rent now, if so how long have you been there?'],
    ['pets', 'Do you have any animals, if so what is breed and weight?'],
    ['adverse', 'Do you have any bankruptcies, foreclosures, evictions or repos, if so how old?'],
    ['walkthrough', 'Would you allow a walk through of your current property for final approval?']
  ];
  const known = v => typeof v === 'string' && v.trim().length > 0;
  const norm = v => String(v || '').trim();
  function parseMonthlyIncome(value) {
    // Only an unambiguous amount and period; never pick the first number in a story.
    const raw=norm(value).toLowerCase();
    const match=raw.match(/^\$?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*(k)?\s*(?:(?:\/|per\s+|a\s+)?(month|monthly|mo|year|yearly|annual|annually|yr|week|weekly|wk|biweekly|bi-weekly|every two weeks))?$/);
    if(!match)return null;
    let amount=Number(match[1].replace(/,/g,''))*(match[2]?1000:1);
    if(!Number.isFinite(amount)||amount<=0)return null;
    const period=match[3]||'monthly';
    if(/^(year|yearly|annual|annually|yr)$/.test(period))amount/=12;
    else if(/^(week|weekly|wk)$/.test(period))amount*=52/12;
    else if(/^(biweekly|bi-weekly|every two weeks)$/.test(period))amount*=26/12;
    return Number(amount.toFixed(2));
  }
  function extractCandidates(message) {
    const s = norm(message);
    const result = [];
    if (!s) return result;
    const incomePhrases = [
      /(?:combined |household |gross |monthly |my )?(?:monthly )?income\s*(?:is|of|:|=|around|about|approximately)?\s*\$?\s*([\d,]+(?:\.\d+)?\s*k?)/i,
      /(?:we|i)\s+(?:make|earn|bring in)\s+(?:about|around|roughly|approximately)?\s*\$\s*([\d,]+(?:\.\d+)?\s*k?)/i
    ];
    for (const pattern of incomePhrases) {
      const hit = s.match(pattern);
      if (hit) { result.push({ field: 'income', value: (hit[1].trim() + ((s.slice(hit.index+hit[0].length).match(/^\s*(?:per\s+|a\s+|\/)?(month|monthly|year|yearly|annual|week|weekly|biweekly|bi-weekly|every two weeks)\b/i)||[])[0]||'')).trim(), reason: 'Income amount mentioned; confirm period, gross/net, and household scope.' }); break; }
    }
    if (/\b(no|none|don't|do not|without)\s+(?:have |own )?(?:any )?(?:pets|animals|dogs|cats)\b/i.test(s)) result.push({ field: 'pets', value: 'None', reason: 'No animals reported.' });
    else {
      const animals = [...new Set((s.match(/\b(?:cats?|dogs?|pupp(?:y|ies))\b/gi) || []).map(a => a.toLowerCase().replace(/s$/, '')))];
      if (animals.length) result.push({ field: 'pets', value: 'Yes — ' + animals.join(', '), reason: 'Animal mentioned; confirm count, breed, weight and assistance-animal considerations.' });
    }
    if (/\b(live|living|stay|staying)\s+with\s+(?:my\s+)?(?:family|parents|mother|father|relatives)\b/i.test(s)) result.push({ field: 'residence', value: 'Living with family', reason: 'Current living situation described.' });
    else if (/\b(?:currently |now )?rent(?:ing)?\b/i.test(s) && !/\b(?:do not|don't|not)\s+(?:currently\s+)?rent\b/i.test(s)) result.push({ field: 'residence', value: 'Currently renting — length to verify', reason: 'Current rental mentioned.' });
    if (/\b(no|never|none)\s+(?:bankruptcies|bankruptcy|evictions|foreclosures|repos)\b/i.test(s) && /(evict|bankrupt|foreclos|repo)/i.test(s)) result.push({ field: 'adverse', value: 'Negative history denied — verify full list', reason: 'Partial or full negative-history denial; confirm all four categories.' });
    else if (/\b(bankrupt\w*|foreclos\w*|evict\w*|repossession\w*|repo)\b/i.test(s)) result.push({ field: 'adverse', value: 'History disclosed — review details', reason: 'Possible adverse item mentioned; human review required.' });
    if (/\b(?:yes|sure|of course|absolutely)\b.{0,80}\bwalk.?through\b/i.test(s)) result.push({ field: 'walkthrough', value: 'Yes', reason: 'Walkthrough agreement reported.' });
    if (/\b(?:no|cannot|can't|not possible|wouldn't)\b.{0,80}\bwalk.?through\b/i.test(s)) result.push({ field: 'walkthrough', value: 'No — reason to verify', reason: 'Walkthrough concern reported.' });
    if (/\b(section\s*8|housing (?:choice )?voucher|\bHCV\b)\b/i.test(s)) result.push({ field: 'voucher', value: 'Yes', reason: 'Voucher program mentioned; use assistance-aware workflow.' });
    return result;
  }
  function assess(input) {
    const a = input.answers || {};
    const p = input.property || {};
    const incomplete=key=>!known(a[key]) || /length to verify|verify full list|reason to verify|\b(?:unknown|unsure|uncertain|not sure)\b/i.test(norm(a[key]));
    const missing = FIELDS.filter(([key]) => incomplete(key));
    const flags = [];
    const statuses = { holding: 'We currently have a holding deposit on this property, so it is pending at the moment.', rented: 'This property is no longer available.' };
    const available = p.availability === 'ready';
    const amount = p.rentVerified && Number.isFinite(Number(p.askingRent)) && Number(p.askingRent) > 0 ? Number(p.askingRent) : null;
    const monthly = a.incomeBasis === 'gross_monthly_household' ? parseMonthlyIncome(a.income, 'gross') : null;
    const incomeMinimum = norm(a.voucher).toLowerCase() === 'no' && amount && Number(p.incomeMultiplier) > 0 ? Number((amount * Number(p.incomeMultiplier)).toFixed(2)) : null;
    if (known(a.income) && monthly === null) flags.push('Income amount or period is ambiguous; confirm it manually before using the illustration.');
    if (norm(a.voucher).toLowerCase() !== 'no') flags.push('No full-rent income comparison while voucher status is unknown or disclosed.');
    if (!amount) flags.push('Asking rent is unverified or missing; no income threshold can be confirmed.');
    if (known(a.income) && a.incomeBasis !== 'gross_monthly_household') flags.push('Income basis is not confirmed as gross monthly household income.');
    if (known(a.adverse) && !/^(no|none|never|no known history)$/i.test(norm(a.adverse))) flags.push('Disclosed financial history requires a manual, policy-reviewed decision. Do not assume a double deposit.');
    if (/yes|esa|service|assistance/i.test(norm(a.assistanceAnimal))) flags.push('Assistance-animal request: no ordinary pet fee or automatic denial; escalate for accommodation review.');
    if (/\b(esa|service animal|assistance animal)\b/i.test(norm(a.pets) + ' ' + norm(a.petDetails))) flags.push('Possible assistance animal; review accommodation separately from pet charges.');
    if (norm(a.voucher).toLowerCase() === 'yes') flags.push('Housing voucher: verify applicable program rules and tenant-paid portion; do not apply 3× full rent mechanically.');
    if (known(a.walkthrough) && /^no/i.test(norm(a.walkthrough))) flags.push('Walkthrough unavailable: ask why and consider approved alternatives, not an automatic rejection.');
    if (incomeMinimum && monthly !== null && monthly < incomeMinimum) flags.push('Reported gross household income is below the illustrative multiplier; request review, not an automatic rejection.');
    if (p.availability === 'not_ready') flags.push('Property is not ready; staff must verify readiness before arranging a viewing.');
    if (!['ready','not_ready','occupied','holding','rented'].includes(p.availability)) flags.push('Property availability has not been verified.');
    if (p.availability === 'occupied') flags.push('Unit is occupied; no viewing instructions should be issued.');
    if (!p.propertyId) flags.push('No linked Property Master record selected.');
    let draft = '';
    let step = '';
    if (statuses[p.availability]) { draft = statuses[p.availability] + ' If anything changes, we can let you know.'; step = 'Property unavailable — review alternatives'; }
    else if (missing.length === FIELDS.length && !['yes','no'].includes(norm(a.voucher).toLowerCase())) {
      const prefix = p.availability === 'ready' ? 'Home is available and ready to go. ' : p.availability === 'not_ready' ? 'Home is available and almost ready to go. ' : '';
      draft = prefix + 'Before we discuss next steps, I have a few questions. ' + FIELDS.map(([,question])=>question).join(' ');
      step = 'Send initial prequalification questions (after confirming availability)';
    } else if (missing.length) {
      const labels = missing.map(([,q]) => q);
      draft = (labels.length === 1 ? 'One question was missed. ' : 'Thanks for the information. A few questions were missed. ') + labels.join(' ');
      step = 'Clarify ' + missing.map(([key]) => key).join(', ');
    } else if (norm(a.voucher).toLowerCase() === 'yes' && !known(a.voucherDetails)) {
      draft = "Thanks for the information. What is your voucher bedroom size and the voucher amount or applicable payment standard? We can then review the next step.";
      step = 'Review housing voucher details';
    } else if (!/^(none|no|no animals|no pets)$/i.test(norm(a.pets)) && !known(a.petDetails) && !(/^yes$/i.test(norm(a.assistanceAnimal))||/\b(esa|service|assistance)\b/i.test(norm(a.pets)))) {
      draft = "Thanks for the information. What breed and weight are the animals? Please also let us know if any are assistance animals so we can review the appropriate requirements.";
      step = 'Clarify animal information';
    } else if (flags.some(f => /review|below|unavailable|occupied|unverified|not confirmed|not been verified/i.test(f))) {
      draft = "Thank you for the information. I have the details you've shared and will confirm the next steps after reviewing the property's requirements.";
      step = 'Leslie review required';
    } else if (available) {
      draft = "Thanks for answering the questions. Leslie will review the information and confirm the next step.";
      step = 'Leslie review required';
    } else {
      draft = "Thanks for the information. I'll confirm the property's availability and let you know the next step.";
      step = 'Confirm property readiness';
    }
    return { draft, step, missing: missing.map(([key]) => key), flags, monthly, incomeMinimum, canCopy: true, reviewRequired: true };
  }
  return Object.freeze({ OPENING, FIELDS, extractCandidates, parseMonthlyIncome, assess });
});
