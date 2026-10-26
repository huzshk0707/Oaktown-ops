# Lead Copilot v0.5 — staged branch specification

**Branch:** `feature/v0.5-lead-copilot`  
**Base:** Oaktown Ops v0.4 `main`  
**Status:** Review-ready code; **not merged**, **not deployed**, and **no live Supabase schema changes**.

## What exists

- Separate Lead Copilot sidebar tab in the existing Oaktown Ops workspace.
- Draft response engine `lead-rules.js` with the observed Leslie initial prequalification script and missing-answer follow-ups.
- Conservative possible-answer detection from pasted tenant messages. Each detected field requires **Confirm & apply**; no raw message text is silently treated as a fact.
- Structured answer editor: monthly income and its basis, residence, animals, financial history, walkthrough, voucher and exception notes.
- Explicit property selection from the current Supabase Property Master, current status selection, optional verified asking rent and *illustrative only* 3× calculation.
- Restricted draft generation: no automatic applicant acceptance/rejection, no payment requirements inferred, no code or ID-image handling, no automatic SMS/email.
- Private cloud lead and message history UI that only works after the staged lead tables are deployed. Separate “Save lead” and “Save tenant message” actions.
- Proposed schema `supabase/schema/lead_copilot_v05.sql`, *not applied*.
- Unit and Chromium tests.

## Why the v0.5 schema is not yet in the live DB

The user has an already-prepared full portfolio workbook in another conversation. The existing `properties` table has an address-only uniqueness constraint and 13 pilot records, whereas the portfolio requires many units at one street address.

**Do the Portfolio Master migration first in the other chat**, preserving the existing 13 property IDs where appropriate and creating stable unit IDs. Reconcile which record type Lead Copilot's `primary_property_id` and `lead_property_interests.property_id` should reference. Then adapt/approve and apply this lead schema. Do not independently alter `public.properties` from this feature branch. Do not import the 101 historical chats as real-time open leads.

If the app UI branch is merged before the schema, it remains useful for local drafting but shows an explicit cloud-save error until the lead tables exist.

## Blocking decisions / human review

1. Current asking rent and listing availability must be verified from the authoritative Property/Unit Master. Existing leased rent is not the asking rent.
2. The 3× multiple in the UI is a historical illustrative reference, **not an approved automated housing eligibility rule**.
3. Double deposits, adverse histories, limited rental histories and walkthrough alternatives are **manual decisions** pending approved, consistent rules.
4. Assistance animals and Housing Choice Vouchers use separately reviewed workflows; the system must not apply ordinary pet fees or full-rent 3× screening automatically.
5. Historic access codes and ID images must not be imported or committed to this public repository.
6. Leslie must approve any changed opening script; original wording and typos have deliberately been preserved. “Available” language only appears when a staff member selects an appropriate showing status.

## Security

- Existing shared Supabase login and staff membership checks remain unchanged.
- New tables use RLS and revoke anonymous/default privileges, grant only needed staff operations, and prevent writes by unapproved users.
- Raw tenant messages only travel to Supabase on an explicit staff action. Unsaved pasted text is not auto-persisted in localStorage.
- No credentials or personally identifying tenant examples were committed.
- **Before production:** verify grant/RLS policies for anon, approved editor, viewer, deactivated user; test inserts, updates, message reads, denial of deletes; run Supabase security advisors and an authorized backup/restore rehearsal.
- Historical chats are *reference cases*, not proof of current policy or eligibility.

## Test / merge instructions for Codex

1. Check out the feature branch; review the full PR diff against `main`.
2. Run `node --check lead-rules.js`, `node --check leads.js`, `node --check workspace.js`.
3. Run `node --test tests/*.test.cjs`.
4. Install Playwright per `.github/workflows/checks.yml` and run Chromium tests.
5. Manually exercise initial inquiry, only-missing-question flow, no animals, one ordinary pet, assistance animal, voucher, co-signer income, unverified rent, pending property, occupied property, unexpected tenant phrasing, sign-in/sign-out, and save failure when lead tables are absent.
6. Do not merge if prior Notices, court follow-up, or Property Editor tests regress.
7. After Portfolio Master migration, reconcile property/unit relationships, run database RLS tests and apply the reviewed lead schema; only then enable live cloud persistence.
8. Request Leslie's approval for reply templates and escalation rules before real tenancy-facing usage.

## Intentional limitations of v0.5

- Pasted-text field extraction is **heuristic**; unusual replies require manual entry/confirmation.
- Does not sync Zillow, Trulia, TurboTenant, email or text messages.
- Does not manage identity documents, showing access keys, payment transfers or applications.
- Does not automatically charge deposits, promise availability, decide eligibility or send responses.
- UI shows a primary property; a supplemental `lead_property_interests` table is staged to support multi-property relationships after the master unit model is finalized.
- Historical 101-conversation scenario coverage is partial: focused unit tests cover major branches. Expanded anonymized replay should be added before production.
