# Oaktown Ops v0.6 — Unit Detail: business rules and first-page specification

**Status:** Proposed for owner review · design only · do not implement or merge without resolving decisions below.
**Relationship:** Designed against the live Portfolio Master database structure, with PR #5 retaining migration history. Independent of Lead Copilot PR #6.
**Scope:** Read-first Unit Detail page. No production edits, imports, data conversion or schema changes in this design PR.

## Outcome and entry point

In **Properties**, open a property, then choose a unit. Show a single accurate page with the unit's present occupancy, current tenancy participants, current lease terms, rent schedule, security deposit status, important dates, related notices, upcoming tasks, and history. Preserve the existing property dropdown, search and notice generator. Display real records only, never fictitious placeholders as if they were imported.

The live database currently contains **13 properties, 0 units, 0 leases**. Until the verified portfolio import is completed, show "No units imported — portfolio onboarding pending", **not** "Vacant" or "No tenants". The 13 earlier `property_addressees` entries are unverified mailing addressees, **not** verified people/lease/occupancy records.

### Intended navigation

Properties → Property overview → Unit list/search → **Unit Detail**.

```text
Oaktown Ops / Properties / [Property street] / [Unit label]
[Back to property]    [Unit selector]             [Verification: Unverified]

[Occupancy: Unknown] [Tenancy: Needs verification] [Lease: Missing] [Next action: —]

Overview  |  Residents & tenancy  |  Lease & renewals  |  Rent & deposits  |  Notices  |  History
           Selected unit: Unit / apartment identifier, property address, unit type
Residents:  — until independently verified       Lease:  — until verified
Rent:       — (scheduled rent only)               Deposit: Not tracked yet
Dates:      lease term / move-in / move-out / renewal / tasks (as known)
Related notices: linked to THIS unit only; legacy property-level notices need review
```

## Existing database mapping (observed, not proposed)

| Concern | Existing source | v0.6 usage / caution |
| --- | --- | --- |
| Property | `properties` | Parent address, existing UUID retained |
| Unit | `units` | Stable `id`, `property_id`, label/code, occupancy/verification status |
| Person | `people` | One identity reused across tenancies; never derive person from notice addressee string |
| Tenancy | `tenancies` | A unit's occupancy episode; start/end/status/basis |
| Tenancy members | `tenancy_people` | People, roles and effective membership dates within tenancy |
| Lease | `leases` | Contract kind, status, term dates, signature state and linked tenancy/unit |
| Signatures | `lease_signatures` | Person/signature status/evidence; do not call an unsigned draft executed |
| Contract rent | `rent_schedules` | Amount and effective interval; not charges, payments or balance due |
| Renewals | `renewal_cases` | Status, offers and next action; separate from signed/amended leases |
| Tasks/events | `ops_tasks`, `ops_events` | Work items and auditable actions, where linked |
| Notices | `notice_batches.payload` | Existing editable notice drafts are JSON; not yet reliably unit-linked |
| Security deposits | **No deposit ledger currently** | Display **Not tracked**; design ledger before showing held/refund balances |
| Verification | `verification_issues` and verification fields | Unknown/unverified must be visibly different from confirmed |

### Identity invariant

`properties.id` identifies the physical property, `units.id` identifies the individual rentable space, `tenancies.id` identifies a period of occupancy, and `leases.id` identifies an agreement. None of those identifiers may be replaced by an address, tenant name or display label. A person's occupancy can change without renaming the unit. Unit labels may change without losing history.

## Proposed business rules for approval

### 1. Properties and units

1. A property may contain one or more rentable units. A verified single-family property may have one explicit default unit ("Main" or an owner-chosen label); **do not** create it just because a property exists.
2. Unit labels are unique **within their property**, not globally. The stable UUID is the canonical key; respect the existing global `unit_code` uniqueness rule if one is supplied.
3. Vacancy is never inferred from an empty tenants table during import. Use **Unknown / Needs verification** until the unit's status and occupancy are confirmed.
4. The unit selector should support search, including 50+ properties/units, and distinguish identical unit labels in different properties.

### 2. Multiple tenants and joint leases

1. A tenancy can have **multiple people**, with explicit roles: *leaseholder / financially responsible*, *authorized occupant*, *guarantor* (if applicable), or *other / needs review*.
2. One household may have two or more responsible leaseholders. The page shows all participants, not a single free-text tenant field. Signature requirements for each agreement are recorded explicitly; do not assume every adult occupant signed or every listed person owes rent.
3. Roles have effective `from_date` / `to_date`; a person may join, leave, or change role without being deleted. A person record can be connected to historical and future tenancies.
4. Children/minors and protected personal information should not be required for the first version. Keep access to names/contact information restricted to authorized staff.
5. **Do not automatically copy** `property_addressees.notice_addressee_text` into person or leaseholder rows. This address label is unverified mailing text, potentially including "All Occupants".

### 3. Tenancy, current occupancy and history

1. A **tenancy** represents one occupancy episode of one unit; different tenancies are kept as separate records.
2. Under normal one-household rentals, allow at most one **verified current tenancy** for a unit on a given date. Overlapping dates/statuses become a **needs-review conflict**, not a silent overwrite or hidden record.
3. Occupancy statuses are distinct from contract statuses: e.g. occupied with an expired agreement, approved upcoming move-in, or vacated unit with an outstanding deposit review.
4. Historical tenancies remain accessible by date and must never be overwritten when people move out. A move-out does not erase members, leases, notices, rent schedules, signatures or events.
5. Current/previous/upcoming views use both explicit verified statuses and effective dates; a date alone must not automatically declare a household evicted, terminated or moved out.

### 4. Fixed-term leases, month-to-month and renewals

1. Lease terms belong to a **lease record**, not simply to the unit or person. Preserve lease versions and signed evidence.
2. **Fixed term:** effective start and end dates may be stored. Validate end >= start. A signed/active label still requires verification of actual execution.
3. **Month-to-month:** explicit contract kind and effective start date; end date may be blank. Do not infer month-to-month solely because a fixed-term end date passed.
4. **Renewal proposal:** a separate `renewal_cases` record is a workflow, not a signed agreement. Proposed rent and proposal status never replace the current `rent_schedules` amount until verified/approved and actually effective.
5. **Executed renewal/amendment:** preserve the previous lease and signatures; record a new linked lease or explicit amendment history (implementation choice still open). No destructive replacement of the original document.
6. **Holdover or expired date:** flag for manual review. Do not calculate notice periods, tenancy termination, or legal rights automatically.

### 5. Contract rent vs ledger vs deposits

1. Display **Scheduled Rent** from the effective `rent_schedules` row, including amount, period, effective date and verification. Missing rent means **Unknown**, never $0.
2. Rent schedule is **not** the tenant ledger. Never label scheduled rent as amount owed, current balance or late fee; those need verified charges and payment transactions (future ledger milestone).
3. Proposed deposit tracking (requires new schema): separate deposit account/event records for security/pet/other types as needed, with *received, adjustment, approved application, refund, transfer*, event date, amount, evidence, and authorized actor.
4. Display a deposit's **Held / Pending review / Fully returned / Not recorded** separately from amount. A lease's deposit provision is not proof that money was collected. Never treat missing deposit transactions as $0 held.
5. Returns and deductions are never made automatically; require approval and supporting evidence. Jurisdiction-specific deposit rules and timelines must be separately confirmed before automation.

### 6. Related notices and legal follow-up

1. Related notices must refer to the **unit UUID** and, where known, tenancy/lease UUID, not solely to an address string or property UUID.
2. Existing v0.4 `notice_batches.payload` stores drafts and may include only the source **property** UUID. That is not sufficient for multi-unit matching.
3. Until a verified link exists, list legacy property-level notices separately as **"Possible related notices — verify unit"**, not as confirmed unit notices. In a building with multiple units do not guess.
4. Snapshot recipients, amounts, dates and wording at notice issuance; later edits to current names/leases must not rewrite historical issued notice details.
5. Existing court-follow-up notes remain attached to their original notice. Unit Detail may link to them but must not imply a court filing or certified mailing occurred automatically.

### 7. Important dates, verification and audit

1. Show verified lease start/end, tenancy move-in/out, scheduled rent-change effective dates, renewal task dates, and linked notice/court dates (where supported).
2. All dates carry source or verification state. Alerts are operational prompts, **not** automatic legal deadlines; no sending, filing or reminders without an explicitly built workflow.
3. Every consequential correction (tenant membership, signed agreement, rent schedule, deposit transaction, unit assignment) should retain who changed it, when, why, and a supporting document reference.
4. Prefer soft-archive/corrective records over hard delete. Existing historic records remain queryable only by appropriately authorized staff.

## First v0.6 implementation slice (after approval and portfolio onboarding)

- **Read-first Unit Detail page** inside Properties. Fetch unit by stable UUID and its parent property; show role-grouped current tenancy participants, verified lease, rent schedule, renewal tasks, historical episodes and verification flags.
- **Explicit empty states:** Unit not imported, unit unverified, no verified tenancy, no verified lease, rent unknown, deposit not tracked, notices not linked.
- **Navigation:** address search → property → unit list → unit details → back; retain all current v0.4 notice, property, and cloud batch workflows.
- **Responsive design:** long role lists, 50+ units, keyboard-accessible selectors, no required horizontal scrolling.
- **No live mutations in first slice:** no automatic unit creation, edits, rent adjustments, deposits or notice creation from this screen.
- **Privacy and access:** use existing Supabase Auth/RLS, no secrets or tenants in public GitHub, no multi-user data leakage, no local fake portfolio data.
- **Unit-notice linking and deposit ledger** are separate reviewed subphases; don't falsely present those as ready on day one.

## Acceptance scenarios (synthetic records only)

1. **Single-family property with no imported unit:** display onboarding pending, not vacant.
2. **Multiunit property:** two units with the same unit label at different addresses render separately; unit identity stays UUID-based.
3. **Joint lease:** two responsible leaseholders plus one other occupant, all visible with correct role and any recorded signature state.
4. **End of fixed term:** a passed date gives a review flag; neither eviction nor conversion to month-to-month is implied.
5. **Month-to-month:** contract kind explicit; missing end date shown without fabricated renewal date.
6. **Renewal proposal:** proposed rent visible separately from the current verified effective rent.
7. **Partial deposit return:** show event ledger and held balance only after actual verified transactions, never based on a lease clause.
8. **Moved-out tenancy:** old residents, lease versions, notices and tasks remain in History; a new tenancy gets a new UUID.
9. **Legacy notice from multiunit property:** appear only as unassigned/possible until a staff member confirms the unit.
10. **Unauthorized/anonymous user:** protected tenancy/lease/person/rent data not exposed by UI or direct Supabase API; tests check RLS.
11. **No data:** empty state doesn't fabricate a current tenant, rent or security deposit.

## Decisions for owner sign-off

These are **proposed defaults**, not confirmed business policy:

| Decision | Proposed default | Approval needed |
| --- | --- | --- |
| Single-family representation | One explicit "Main" unit after verifying the property | Confirm |
| Joint-tenancy roles | Leaseholder, occupant, guarantor, other | Confirm / adapt |
| More than one active tenancy per unit | Prevent as the standard; flag overlaps for review | Confirm exceptions (e.g., room-by-room) |
| Renewal representation | Keep original lease; use renewal case for pending; new lease/version for executed renewal | Confirm amendment handling |
| Month-to-month treatment | Must be explicitly designated; never automatically convert on fixed-term expiry | Confirm |
| Deposit structure | Separate transaction ledger and evidence; no automatic deductions | Confirm desired categories |
| Historical records | Append/correct/archive; never delete signed or issued material | Confirm |
| Notice linking | Require unit ID for confirmed linkage; legacy notices remain unassigned until reviewed | Confirm |

## Dependencies / sequencing

1. Finish PR #5 portfolio schema/history integration and verify import/reconciliation of stable `units.id` records.
2. Approve this ruleset. If the portfolio includes room-by-room rentals or short-term bookings, refine the "one current tenancy" rule for each **rentable unit**.
3. Build the read-first Unit Detail in an isolated feature branch with mock/API contract tests. Do not merge live editing or deposit transactions in that slice.
4. In a separate migration design, address deposit events and canonical unit-notice linkage; include RLS, per-user authorization, backfill rules, and rollback tests.
5. Pilot against verified imported units with owner sign-off before enabling edits.

**Legal boundary:** This document is an application data/workflow proposal, not an interpretation of Kentucky landlord-tenant law. Notices, renewal/holdover treatment and deposit deductions need jurisdiction-specific legal review before operational automation.
