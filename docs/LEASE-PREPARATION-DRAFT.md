# New-tenancy lease preparation — draft PR

This tool follows the application/non-refundable-deposit handoff. It is separate
from the existing five-page renewal generator. The uploaded lease is the layout
reference; no legal clauses or template fee terms are being rewritten.

## Confirmed source

- File: `Updated Blank Lease.pdf`
- SHA-256: `4096d6ff98fa0a354dd3b03a0c1428d44607aba1220b46a84c10e395c6190ac4`
- Ten US Letter pages, 612 × 792 points, with no native form widgets.
- Original bytes, extracted text, and page images remain outside the repository.
  The apparently blank first page retains old filled text beneath visual masking.
  Page 8 is a filled five-bedroom example, and page 7 includes premarked disclosure
  choices and a signature. None of those values or marks is a new-lease default.

## Workflow and editable scope

| Area | Preparation fields | PDF status |
| --- | --- | --- |
| Handoff | Staff review of approval and preceding deposit step; reference/questions | No application or payment status changes |
| Page 1 | Lease date, term, rent, amount printed as deposit; tenant names/emails and exact unit address | Mapping pending clean master |
| Page 1 | Occupant lines A–E, pet description; utility payer and appliance Yes/No choices | Starts blank, no current tenant auto-import |
| Page 8 | Address, bedroom count and overall satisfactory Yes/No; kitchen, living, bathrooms, bedrooms, basement, exterior and systems condition entries | Replacement blank page and 2–5 bedroom examples pending |
| Pages 1 and 10 | Fixed 5% and 10% labels; editable dollar amounts | One shared amount for each charge on both pages |
| Other pages | Approved original wording, ruling, highlights, order and unsigned signature areas | Must be checked against clean masters; page 7 needs separate disclosure review |

The operator explicitly confirmed that **dollar amounts are editable and the 5%
and 10% percentages stay fixed**. Calculations use currency cents and round to the
nearest cent. Each amount can be overridden independently; changing rent preserves
manual overrides. An explicit reset returns both to the rent calculation.

## Deposit rules await the operator

Security deposit, pet deposit, other one-time fees and monthly pet rent are
separate inputs. The amount to print in the deposit box is entered explicitly.
There is no automatic addition, deduction, non-refundable-deposit credit,
refundability interpretation or pet charge. The operator will provide the rules
and filled examples before any formula or print placement is implemented.

## Condition observations

All entries start blank. The suggestions catalog contains only phrases observed
in the supplied example or explicitly provided by the operator: Good, Good & New
Paint, Good & Fresh Paint, Good LVT, Good Vinyl, Good & New Carpet, New, and Good
New Filter. This is an initial catalog, not an exhaustive approved set.

Each room/item is editable, including doors, walls, ceiling, flooring, kitchen
fixtures, bathroom fixtures, windows/screens, locks, porch/stairs, water heater,
exterior/yards/garage, HVAC, electrical fixtures/outlets, other items and comments.
Room labels/counts in this prototype do not assume that bedroom 3 is a primary
suite, a basement bedroom or any other fact from the example. Bathroom counts and
basement presence require explicit input. Unsupported layouts require examples.

Changing the bedroom count preserves out-of-layout notes only in this visit's
memory; the field review excludes those rooms. Choosing a different protected
unit starts a fresh draft after confirmation. Free-text wording is supported
without claiming the selected condition has been independently verified.

## Current implementation

`Leases & renewals → Prepare new lease` offers a staff-only, in-memory five-step
form, with One step/View all and freely navigable steps. The Applications handoff
opens it without transferring approval, payment or tenant assumptions.

The existing shared staff session is reused. No new Supabase queries, schema,
storage, authentication mechanisms or record writes are introduced. Reload,
Clear draft, sign-out or an account change clears all entered details and the
review. Existing portfolio units may supply an address; existing people and
historical lease dates are never copied into a new tenancy.

The review is **not a lease**. No new-tenancy PDF exporter or signing operation is
present. Download stays disabled even when every field is filled; client input
cannot override the pending-source state. This PR remains draft.

## Needed before exact PDF export

1. Replacement blank page 8 and filled examples for two, three, four and five beds.
2. Clean-master approval: remove recoverable old field text; review every page for
   inherited signatures, initials, annotations, hidden data and preselected facts.
   Supply a clean page 7 or confirm the intended handling of its disclosure marks.
3. Deposit/pet deposit/fee rules and filled page 1 examples showing the printed amount.
4. Page-by-page field coordinates, font sizes, multiline/overflow limits and
   synchronized charge placements on pages 1 and 10.
5. Render comparisons against each approved source layout. Compare unchanged
   regions/pages and verify that no sample findings or signatures are inherited.
6. Enable an unsigned ten-page exporter only after those checks and operator review.

## Validation

Unit tests cover cents-based calculations and override synchronization, explicit
deposit allocation, room counts and blank observations, excluded-room notes,
missing inputs and the permanent draft export block. Browser checks cover staff
access, sign-out clearing, no writes, independent condition fields, changing
units, handoff/keyboard navigation and six-theme responsive layouts. The existing
renewal and guided-workflow suites remain required regressions.

Fictional UI previews: [terms](ui-review/new-lease-terms-draft.png),
[condition fields](ui-review/new-lease-conditions-draft.png),
[phone](ui-review/new-lease-phone-draft.png).
