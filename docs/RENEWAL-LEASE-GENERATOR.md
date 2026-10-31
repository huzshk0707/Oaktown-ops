# Renewal Lease Generator — five-page PDF patch on PR #10

## Available in main

The **Leases & renewals** workspace has a staff-only Renewal Lease Generator. Select the exact unit and existing lease; the form suggests new dates, auto-fills recorded tenants/emails, and lets the operator enter new rent, occupants, pets, utility responsibility (Landlord or Tenant), and appliance answers (Yes or No).

- Generation date uses `America/New_York` and prints `MM/DD/YYYY`.
- Rent and both calculated late charges use USD commas and **two decimal places** (for example `$4,000.00`).
- The document says **Amt: carried over** for the deposit; it does not invent a deposit balance.
- The preview requires a signed-in staff user, confirmed tenancy details, a selected source unit/lease, valid dates, and all five utility and seven appliance selections.
- After **Review renewal inputs**, select **Download five-page renewal lease PDF**. The download is unsigned and contains the original clauses and blank signature/initials spaces. No electronic signature, signing audit trail, tenant message, database write, or lease-status transition is performed.

## PDF master and reference comparison

The five sanitized page images in `renewal-assets/lease-master-page-{1..5}.png` were prepared from the uploaded **Renewal Rental Blank Lease.docx** and rendered to US Letter at 1530 × 1980 pixels. Old example tenant names, emails, address and stray occupant initials were removed from page one before asset creation. Pages two through five retain the original clauses, headings, initials areas and signatures.

The completed **6307 Price Lane, 2026** PDF is a layout/field-placement reference, **not a data source for new renewals**. The sample's sixth page is a third-party electronic-signature audit trail and is intentionally excluded from newly generated unsigned leases. The reference confirms that the output uses `Yes`/`No` appliance text, `X` marks for utilities, and calculated fees of **$71.25** and **$142.50** for **$1,425.00** rent.

The PDF overlays variable data onto the sanitized static page. It never copies reference tenant data; it blocks oversize fields rather than silently clipping them. The existing source Word document contains underline/line artifacts. Visual comparison can validate content, page size, principal field placement and page count, but pixel-identical output to the already e-signed sample is **not claimed** because e-signature highlights/audit markers and pre-existing source artifacts differ.

## Tests and release safety

`tests/renewal-rules.test.cjs` verifies term suggestions, date/currency rules and required review; `tests/renewal-pdf.test.cjs` verifies five master assets, the completed-sample amounts, five-page output, one utility X per item, and rejection when the account changes during export; `tests/portfolio.e2e.spec.cjs` exercises a mock staff session, field review and browser PDF download.

The generator and tracker were merged in PR #10, followed by PDF fixes in #11–#13. Separate preparation/tracking tabs were merged in #20. This supersedes the original draft-PR status; current live deployment and staff behavior still require the [live validation checks](LIVE-VALIDATION.md). Do not treat a generated document as signed or legally approved. In particular, the template's appliance-supply language and automatic month-to-month renewal clause need an authorized owner/legal review before production issuance.

## Later patch: renewal records and history

The generated PDF currently downloads locally only. Saving immutable PDF versions against an existing renewal case (or creating a new case), private storage, staff-only RLS, signing progress and executed-lease transition is separate work. Do **not** silently replace the active lease or treat imported renewal-case rent offers as verified contractual amounts.


## Renewal case tracking — append-only update patch

PDFs remain **download-only**. They are never uploaded to or retained in Supabase.

For status and notes, use the existing staff-restricted public.ops_events table; **no database migration and no changes to the 118 imported renewal_cases records are needed**. Each confirmed edit writes one row:

- entity_type = renewal_case; entity_id = the selected renewal case UUID; event_type = renewal_progress_updated.
- summary = the one-line message (or manual status update label).
- actor_id = signed-in staff member, occurred_at = database-generated server timestamp.
- event_metadata stores the confirmed status, next action, optional note, original one-line message, and previous event ID for traceability.

The browser reads only staff-authenticated records and derives the active Ops tracker status from the most recent matching event. The source Renewal Master status and next action remain visible under explicitly imported labels. Each case has a dated history of status changes and notes; the overview reflects the most recent confirmed tracker status. Access is restricted by existing INSERT and SELECT grants and staff RLS on ops_events. No UPDATE or DELETE permissions are given to the browser for events.

### Natural-language input guardrails

The one-line control uses deterministic phrase matching (no third-party AI calls). For example, "I just sent a lease to sign" suggests **Sent for signature**, not Signed. "One tenant signed" suggests Partially signed. The suggested status and next action can be edited before saving. Negations ("not sent yet") and uncertain/unknown wording never imply a positive action. Every write requires clicking **Save confirmed update**; mere typing has no effect. Additional notes are optional.

Cases must be selected from the existing renewal case list. For live staff usage, first sign into Oaktown Ops, click Leases & renewals, search/click the case, type an update or choose a status manually, optionally fill next action/notes, and save. This records the operational fact stated by the staff member, not proof of delivery or signature. The app does not call TurboTenant or send emails.

### Testing and limitations

Tests in tests/renewal-tracking.test.cjs and tests/portfolio.e2e.spec.cjs exercise classification, negation, manual notes, API event payloads, saved state after reload, and property/case linkage using fictional API fixtures. Status updates are append-only, so history is retained. If the newest history changed between load and save, the user must refresh and review before retrying. Do not add tenant identities or sensitive document contents to free-text notes unnecessarily.

The event-journal list fetch currently loads the newest 1,000 renewal update events across the workspace and shows up to the latest 50 in the selected case; pagination can be added as volume grows. For cases never updated in Ops, the imported Master status remains as historical context and the tracker starts untracked.


## PDF layout correction — late charges, appliances and initials

A subsequent small rendering patch fixes four layout details while leaving the lease data, clauses and five-page master unchanged:

- The existing 5% and 10% late-charge **form underlines are redrawn** after the values are inserted. Values retain two-decimal formatting; the preprinted dollar symbols are not duplicated.
- All seven appliance **Yes/No lines retain visible underlines** beneath the inserted answers, instead of being erased by the white field knockout.
- Occupants A–E render at **10.5 pt** (formerly 9.5); the pets description / "None" at **9.1 pt** (formerly 8.1), shrinking only when needed to fit approved field bounds.
- The yellow **INITIALS** highlighting is restored on pages 1–5 using the original master's highlight coordinates. A multiply blend colors the white background while preserving the original black initials labels and underline ruling.

The fix is applied at PDF-generation time. Neither the supplied example screenshots nor tenant/master database values are edited. The PDF continues to download locally; nothing is stored in Supabase.
