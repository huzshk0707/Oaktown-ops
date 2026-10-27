# Renewal Lease Generator — five-page PDF patch on PR #10

## Available on the PR branch

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

The PR is a **draft**, not merged or deployed. Do not treat a generated document as signed or legally approved. In particular, the template's appliance-supply language and automatic month-to-month renewal clause need an authorized owner/legal review before production issuance.

## Later patch: renewal records and history

The generated PDF currently downloads locally only. Saving immutable PDF versions against an existing renewal case (or creating a new case), private storage, staff-only RLS, signing progress and executed-lease transition is separate work. Do **not** silently replace the active lease or treat imported renewal-case rent offers as verified contractual amounts.
