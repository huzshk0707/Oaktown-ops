# OAK-APP-001 — Applications Guide Pilot

**Status:** Draft development PR, not merged, not a verified complete SOP.

## Verified source boundary
The Leslie O'Keefe **Application Processing** email (January 28, 2026), preserved in the forwarded **fyi** email from February 2026, is the historical source for: income verification, Jefferson sheriff process-paper record lookups including older searches, page-3 Louisville Water utility authorization, landlord references and independent property/LLC ownership verification via PVA/tax sources. This is not the full end-to-end application process, and several described screening thresholds require current policy/legal review. **Do not automate decisions based on that old email.**

Private source folder (restricted access): https://drive.google.com/drive/folders/1IqOipg_D4MuhkwO5hvfwR4q2Ynh3HSgT

## App versus AI versus staff (to be confirmed with actual practice)
- **Oaktown Ops future structured capabilities:** authenticated application cases linked to property/unit and authorized contact, intake receipt/attachment references (not raw screening records), step/status/checklist and timestamps, request/receipt provenance, assignments, due dates, conflict flags and Leslie decision/approval tracking. None of these are implemented by this guide.
- **ChatGPT/Gemini/Claude assistance:** help staff turn their process into a documented SOP, summarize sanitized progress, find missing steps/contradictions, draft a reference/utility follow-up message. Do not ingest unredacted application records or decide eligibility.
- **Authorized human:** verify documents and records in approved systems, obtain lawful applicant authorization, perform references, address accommodations and policy/legal questions, decide applications, send external communications, enter the final case/lease records.

## Current pilot UI
- The **Applications** tab is a guide and a copyable prompt composer; it collects only redacted notes in temporary browser input fields and does not store or transmit them.
- Stages are provisional: Intake; Income; Records; Utility; Landlord; Leslie Review; Lease Handoff. The operator will explain real steps and exceptions; then we'll correct the SOP before building a database tracker.
- Modes: Plan Next Administrative Step; Draft Verification/Follow-up Message; Organize My Actual Workflow into an SOP.
- Explicitly no account/screening determination, email dispatch, backend write, API call, automatic external search, or private data in GitHub.
- No deadlines, application fees, deposit/rent thresholds or legal rules are asserted as approved current policy.

## When user provides full process
1. Record real order: how application arrives; source channel; original forms; actor; what counts as complete; authorization procedure; checks and source URLs; exceptions; Leslie review/decision; tenant notification; lease handoff and reconciliation.
2. Identify responsibilities and approval points; compare to Leslie historical January 28 email with exact source/dates.
3. Update living playbook OAK-APP-001 and guide/mini-checklist in this separate PR; never overwrite prior source evidence.
4. Test only synthetic/redacted cases when requested.

## Suggested staff tests (deferred)
- Only an application notification arrives, no documents: no assumption of completeness.
- Water authorization not signed: no claim of request sent or permission obtained.
- Landlord name differs from owner source: verification follow-up, not accusation.
- Historical eviction record: source match and human review, not auto denial or extra deposit.
- Applicant has voucher or accommodation: follow compliant approved procedure, no automatic exclusion.
- Approved-by-Leslie case is handed to lease-preparation; draft/sent/signed statuses distinct.
