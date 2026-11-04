# New-tenancy lease preparation — current scope

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

The additional blank packet supplies the page 8 layout. Its SHA-256 is
`9e8d2538c2501c002a509fb1446db49a93fc2436ec63fa73f17ea2e790473a59`.
Its displaced bedroom headings, ceiling/floor rows and broken rules are repaired
in the native vector renderer; the source's preselected Yes mark is removed.
The older packet is **not** a replacement for the other updated lease pages:
its page 10 court fee is $275, while the updated reference prints $295. No fixed
fee wording is changed. Five additional filled examples were inspected privately;
their variations are recorded in [the source comparison](LEASE-CONDITION-SOURCES.md).

## Workflow and editable scope

| Area | Preparation fields | PDF status |
| --- | --- | --- |
| Handoff | Staff review of approval and preceding deposit step; reference/questions | No application or payment status changes |
| Page 1 | Lease date, term, rent, amount printed as deposit; tenant names/emails and exact unit address | Mapping pending clean master |
| Page 1 | Occupant lines A–E, pet description; utility payer and appliance Yes/No choices | Starts blank, no current tenant auto-import |
| Page 8 | Address, bedroom count and overall satisfactory Yes/No; kitchen, living, bathrooms, bedrooms, optional den, basement, exterior and systems condition entries | Corrected one-page draft PDF preview; full-lease integration pending |
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

Applicable condition entries and the overall Yes/No answer start blank. The expanded
suggestions catalog contains non-identifying phrases observed in the supplied
examples: fresh/new paint, flooring and tile variations, granite, new appliances,
rekeyed locks, filters and condition exceptions. These are suggestions rather
than verified findings; no choice or known defect is assigned to any property.

Each applicable room/item is editable, including doors, walls, ceiling, flooring, kitchen
fixtures, bathroom fixtures, windows/screens, locks, porch/stairs, water heater,
exterior/yards/garage, HVAC, electrical fixtures/outlets, other items and comments.
Room labels can be edited to describe a primary bath, basement bedroom, den or
other actual room. Bedroom count, one to three bathroom condition groups, basement
presence and den inclusion are explicit choices. The complete template always
contains five bedroom sections, three bathroom condition columns, the den,
basement, kitchen, living room, exterior, systems, comments and other items.
It supports one to five actual bedrooms. Excluded areas stay visible and every
condition field in them prints **N/A**. A two-bedroom unit therefore retains
bedrooms 3–5 with N/A; an excluded basement retains all five N/A rows. Unknown
bedroom/bathroom counts or basement presence never imply absence.

All previews use identical room positions, rules and spacing. The den occupies a
fixed right-column area, allowing all five bedrooms and the den to coexist.
A two-bedroom layout has a synthetic preview and remains unverified against a filled example.
Unsupported layouts and text overflow produce a visible error instead of clipping
observations or silently adding pages.

Changing the bedroom count preserves out-of-layout notes only in this visit's
memory; the field review and PDF replace those observations with N/A until the
area applies again. Automatic N/A fields do not count as recorded observations.
Choosing a different protected
unit starts a fresh draft after confirmation. Free-text wording is supported
without claiming the selected condition has been independently verified.

## Current implementation

`Leases & renewals → Prepare new lease` offers a staff-only, in-memory five-step
form, with One step/View all and freely navigable steps. The Applications handoff
opens it without transferring approval, payment or tenant assumptions.

The existing shared staff session is reused. The form adds no Supabase queries,
authentication mechanisms or record writes. A separate staff-readable reference
catalog indexes the privately archived leases; see [the reference library](LEASE-REFERENCE-LIBRARY.md).
Reload,
Clear draft, sign-out or an account change clears all entered details and the
review. Existing portfolio units may supply an address; existing people and
historical lease dates are never copied into a new tenancy.

The review is **not a lease**. Staff can download a separate, clearly marked
one-page condition-sheet preview through `lease-condition-pdf.js`. Text and rules
are drawn directly onto a US Letter page, without embedding the damaged source
image or any inherited signature, date or condition finding. The original
two-column arrangement, acceptance/smoke-alarm areas and highlighted signature
areas are retained. Long fields must fit within measured bounds.

The full ten-page download stays disabled even when every field is filled;
client input cannot override the pending-source state. No signing operation is
present. The preparation workflow remains available for staff trials.

## Needed before exact PDF export

1. Review the corrected page 8 and provide a filled two-bedroom example. Three-,
   four- and five-bedroom examples and the replacement blank sheet are received.
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
missing inputs and the permanent full-lease draft export block. PDF tests cover
all sixty bedroom/bathroom/basement/den combinations with identical layout geometry,
automatic N/A entries, suppressed inactive-room notes, custom labels,
independent observations, blank signatures, staff access and overflow rejection.
Browser checks cover staff
access, sign-out clearing, no writes, independent condition fields, changing
units, handoff/keyboard navigation and six-theme responsive layouts. The existing
renewal and guided-workflow suites remain required regressions.

Fictional UI previews: [terms](ui-review/new-lease-terms-draft.png),
[condition fields](ui-review/new-lease-conditions-draft.png),
[phone](ui-review/new-lease-phone-draft.png).

Fictional page 8 PDF previews: [one bed](ui-review/condition-pdf-drafts/page-8-1-bed-DRAFT.pdf),
[two beds](ui-review/condition-pdf-drafts/page-8-2-bed-DRAFT.pdf),
[three beds + den](ui-review/condition-pdf-drafts/page-8-3-bed-DRAFT.pdf),
[four beds](ui-review/condition-pdf-drafts/page-8-4-bed-DRAFT.pdf),
[five beds](ui-review/condition-pdf-drafts/page-8-5-bed-DRAFT.pdf).
The fixture conditions demonstrate layout only; they are never form defaults.
