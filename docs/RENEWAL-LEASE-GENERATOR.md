# Renewal Lease Generator — Phase 1 (PR #10 follow-up)

## Scope added to the existing Leases & renewals workspace

The new staff-only Renewal Lease Generator · Preparation form connects to the existing authenticated portfolio and requires explicit verification before displaying the populated field summary. It neither creates nor overwrites current leases and does not send anything for signature.

1. Select a property unit (not just an address) and the expiring lease record.
2. Show the Kentucky-local generation date. Suggest new start and end dates based on the previous lease while keeping both dates editable.
3. Enter monthly rent and calculate 5% and 10% charges formatted with commas and two cents digits (example $4,000.00).
4. Prepopulate tenant name and email plus up to five occupants from tenancy-linked records, for verification and editing. Enter pets manually.
5. Choose exactly one Landlord or Tenant responsibility for Water, Electric, Gas, Trash and Internet; the eventual lease will display one X per utility.
6. Choose Yes or No for Range, Refrigerator, Dishwasher, Blinds, Microwave, Garage Door Opener and Washer & Dryer.
7. Display the fixed security deposit wording "Amt: carried over" instead of inventing a verified amount.
8. Require confirmation that the lease, tenant identity, unit and deposit have been independently checked. Imported values are suggestions, not certified current tenancy data.

## Not implemented in Phase 1

- **Final PDF generation is disabled.** The original five-page Word master must be cleaned and compared at rendered-page level against the signing example. The sample has overlapping old/new text and its sixth page is an audit trail, not a lease page.
- **No Supabase writes or renewal-status transitions.** Retained renewal documents and history will need additive RLS-protected schema, document storage and an approval plan.
- **No persisted local copies of personally identifying tenant details.** The review summary is in memory only.
- The appliance and automatic month-to-month renewal wording in the template need authorized review before final leases are issued.

## Phase 2 acceptance criteria

- Clean five-page PDF master with exactly placed values and blank signing spaces.
- Visual regression checks for page layout, currency formatting, dates, long names/emails, address wrapping and pets.
- Immutable document versions, renewal history linked to units and expiring leases, controlled status transitions and no auto-replacement of the current lease.
- Private document storage and staff-only access policies.
- Tests for rounding, expired-term edge cases, property/unit isolation, exact PDF and signing safety.

## Verify Phase 1

Run the Node renewal rules tests and Playwright portfolio tests. Sign in, open Leases & renewals, choose a unit and lease, review its auto-suggested data, select every utility and appliance, confirm verification, and choose Review renewal inputs. This shows the field summary only; it is not a PDF or lease.
