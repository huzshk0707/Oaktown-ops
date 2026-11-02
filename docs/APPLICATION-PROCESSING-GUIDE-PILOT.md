# OAK-APP-001 — Applications Workflow Guide · Draft v0.2

**Status:** Working user-described SOP v0.3 updated November 2, 2026; open [draft PR #36](https://github.com/huzshk0707/Oaktown-ops/pull/36). Not a final approved company screening policy. No production application-case database, document generator or private AI file upload exists in this PR.

## Source provenance
- **Current staff walkthrough, November 2, 2026:** Fillout application notification → View Submission → send same applicant application for Dropbox e-signature → review pay-stub income / 3× arithmetic → find correct state/county records → signed page-3 water request → landlord reference → application findings summary → Leslie decision → non-refundable-deposit form and move-in vendor sheet → separate lease/move-in/LG&E handoffs.
- **Historical Leslie O'Keefe email, January 28, 2026:** Explicit income, sheriff civil-process search, water authorization page 3, landlord references and ownership checks. Original, privately archived [Application Processing.eml](https://drive.google.com/file/d/1iNy8v7OKCVk_NkdSvVQH8_E1BAnWb_5d/view).
- **Still needed:** The user will provide actual landlord-reference email and blank form, non-refundable-deposit agreement PDF, move-in vendor sheet, redacted Fillout/Dropbox examples, LG&E voice notes, and later full lease-preparation SOP. **Do not invent forms, signatures or terms.**

## Actual process (confirmed from user's description)

1. **Fillout notification and intake.** Staff receives a Fillout email containing the rental application and View Submission link. Open the submission, identify the exact property/unit and obtain the application PDF and supporting pay-stub PDFs. Do not assume the application is complete or signed.
2. **Parallel workstream A — Dropbox e-signature to same applicant.** The user's current Fillout process doesn't capture the required signature. Staff sends the application to the applicant through Dropbox e-signature and tracks request sent, pending and completed. **Staff does not wait for Dropbox to return before starting internal income review.** The exact signature placement, final signed PDF handling and what authorization the form covers still require an example. External checks must respect any applicable signed authorization or consent requirements.
3. **Parallel workstream B — Income arithmetic (first review task Leslie requests).** **At the same time as Dropbox signature collection**, staff checks gross earnings and pay periods from the already received pay stubs, confirms pay frequency, calculates monthly gross, compares it with **3 × the verified monthly rent** and documents evidence/uncertainty. AI can assist ONLY through a privacy-reviewed, authorized approach to PDF processing. Redacted numerical summaries may be entered in the public guide; raw pay stubs, SSNs, identity data or financial account details may not. The app's numeric helper uses weekly ×52/12, every-two-weeks ×26/12, twice-monthly ×2 and monthly ×1. It cannot verify documents, predict future fluctuating earnings, assess combined household income without the correct data, or decide applicant eligibility. Voucher/Section 8, accommodations, and exception rules require Leslie's current lawful policy review.
4. **Jurisdiction research and records.** Staff can determine **current state and county** and applicable former counties, identify correct official sources, and prepare research while signature collection is underway. Conduct applicant-specific records inquiries only when any applicable consent and legal prerequisites have been met. For Jefferson County KY, Leslie references the Sheriff's Civil Process Paper Search, with searches after and before September 11, 2023. Verify whether a record actually matches and what it establishes; process-paper results are not necessarily eviction judgments. A mismatch or historical event cannot automatically trigger rejection or higher deposits.
5. **Water authorization, page 3.** Internal preparation can proceed concurrently; with any required signed authorization confirmed, staff sends page 3 of the application to Louisville Water where applicable. Leslie's 2026 email listed `collections@louisvillewater.com`; confirm current operational destination. Track sent, awaiting response and actual findings. Outside the utility's jurisdiction, determine the correct procedure rather than forwarding to Louisville automatically.
6. **Current landlord reference.** Staff can obtain the landlord/property manager's email and prepare a reference request while waiting for Dropbox signature. With necessary authorization, staff sends the landlord-reference form and accompanying message, examples **pending upload**, and tracks reply. Where identity seems uncertain, independently check relevant county ownership sources such as [Jefferson PVA](https://jeffersonpva.ky.gov/property-search/) and applicable tax records. A mismatch means staff must verify, not assume misrepresentation.
7. **Application findings summary.** Clearly separate income arithmetic from verified pay-stub evidence; document official search date/jurisdiction and source limitations; water verification result; whether landlord reference was requested, received or still pending; signed authorizations; exceptions; next follow-up; and any unknown/contradictory facts. Do not mark approval automatically.
8. **Authorized decision.** Leslie or an authorized reviewer decides an application under current approved lawful policy; record evidence, actual decision, reviewer and date. AI and the numeric 3× indicator do not approve or reject applicants.
9. **After approval.** Prepare/send the *non-refundable deposit form* and the *move-in vendor sheet* once the exact blank templates and terms are supplied, checked and authorized. Record draft/sent/signed/received distinctly. The phrase 'non-refundable deposit' reflects staff terminology here, NOT a legal finding about permissible terms or an automatic payment requirement.
10. **Handoff** to separately documented lease preparation/signing, move-in, and LG&E utility start/stop workflows. Do not mark these as completed merely because application approval occurred.

## Links and reference boundaries

- [Jefferson County Sheriff's current Civil Process Paper Search](https://www.jcsoky.org/criminal-division/process-unit-public-search-02) — papers after Sept 11, 2023.
- [Sheriff historical Civil Process search](https://www.jcsoky.org/criminal-division/process-unit-public-search) — prior to Sept 11, 2023.
- [Jefferson County PVA Property Search](https://jeffersonpva.ky.gov/property-search/).
- [Jefferson County Sheriff home / Property Tax](https://www.jcsoky.org/).
- [Private Application workflow source folder](https://drive.google.com/drive/folders/1IqOipg_D4MuhkwO5hvfwR4q2Ynh3HSgT).
These links are county-specific and **not** nationwide sources. Confirm correct jurisdiction and authoritative records; the utility email and any landlord address must be confirmed by authorized staff.

## What should be an Oaktown Ops feature versus AI versus staff?

**Oaktown Ops now in this PR:** Human-readable guide with official links, stages and approval boundaries; an anonymous income arithmetic helper; five provider-neutral prompt modes (next step, message draft, income worksheet, summary, SOP capture). This runs locally in a temporary browser form only, without storing case records. No protected PDF upload.

**Recommended future Oaktown Ops features (require separate explicit approval):** Authenticated application cases by existing property/unit IDs; per-case checklist states and timestamped evidence links; signature sent/completed, authorizations, document references with access controls; income worksheet review status; official source jurisdiction; water and landlord follow-ups; summaries and Leslie approval; editable PDF generators built ONLY after user provides blank original forms; lease and LG&E handoffs. Permissioned, auditable storage—not a public browser form or raw applicant documents in GitHub.

**AI assistance:** Privacy-approved pay-stub extraction or redacted calculations, confidence/uncertainty checks, missing-item checklists, cover-message drafts, findings summaries and SOP suggestions. AI must never manufacture source data, conduct unapproved records searches, impose fees, or decide who gets housing.

**Staff/Leslie:** Verify pay stubs and record identity, sign/send documents through approved systems, get verified landlord/water responses, resolve concerns consistently and lawfully, choose final applicant outcome and approve the deposit/move-in paperwork.

## Critical questions before final SOP / generated documents
- Does Dropbox return the applicant's signed complete application, and is the same signature sufficient for the water and landlord authorization? How is the signed PDF saved/verified?
- How do you determine whether the income amount is **gross**, and whether Leslie evaluates individual, combined household, or rent-share income, especially when multiple adults, variable pay, or vouchers are involved?
- What exactly do you send as the landlord-reference cover email, and what fields does Leslie's blank reference form contain?
- Does the water verification page require any additional signed authorization? Is the earlier collections email still used?
- What are the source jurisdictions for previous addresses, and is there a defined time period for searching?
- Which results must be received before Leslie makes a decision, who is responsible for follow-ups, and how are approval/denial messages handled?
- What are the actual reviewed deposit document terms and vendor sheet fields? Who sends them, and what counts as accepted/signed?
- When do lease preparation, LG&E transfers and move-in preparation begin relative to payment and approved documents?

## Pending test scenarios (do not run with real private applicant data)
1. Fillout received, Dropbox signature pending: continue internal pay-stub income arithmetic and source/jurisdiction preparation in parallel; hold only requests that actually require authorization.
2. Gross income once per week vs twice monthly: verify numerical conversion and flag missing pay-period evidence.
3. Rent change only: avoid assuming other applicant/property terms.
4. Applicant has lived in another state: require county-specific sources, avoid Jefferson-only conclusions.
5. Sheriff search same-name result: flag for identity/record verification rather than automatic disqualification.
6. Water page not signed or returned: mark pending, not complete.
7. Landlord reference sent but no reply: mark requested/pending separately.
8. Template missing or user calls form 'non-refundable': do not generate invented legal terms.
9. Leslie approves: prepare pending approved forms, do not pretend signed lease or utility transfer.

## Change log
2026-11-02 v0.1 — historical-source pilot created.
2026-11-02 v0.2 — staff-described Fillout/Dropbox signature workflow; income arithmetic; multi-jurisdiction records; water and landlord follow-ups; summary; Leslie approval; non-refundable deposit form/vendor sheet; upcoming LG&E and leases; placeholders for source PDFs and messages.
2026-11-02 v0.3 — Explicit user confirmation: Dropbox e-signature and internal income checking proceed in parallel, without waiting for the returned signature; third-party checks remain authorization-dependent where required. No sequential lock on internal review.
