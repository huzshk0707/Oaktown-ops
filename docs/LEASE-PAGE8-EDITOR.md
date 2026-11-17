> November 17 continuation: the authorized Drive review is recorded at checkpoint 233877e. All five completed references contain twelve pages, with the checklist at actual page 8. The source-measured blank-checklist profile is now wired into the editor. Use **Suggest original room positions**, **Preview original Page 8**, or **Use measured Page 8 positions** on a matching clean master. Suggestions remain editable; no condition facts are inferred. The full supplied master contains existing disclosure/signature marks and remains unsuitable for final unsigned export. See [source asset and validation notes](../lease-assets/README.md). Earlier access limitations below are historical.

# Lease preparation and original Page 8 editor

November 16, 2026 · PR #85 · replaces the visit-only export limitation described
in `LEASE-PREPARATION-DRAFT.md`. The five-page renewal generator remains available.

## What works in this change

From **Leases & renewals → Prepare renewal**, choose a protected unit and click
**Prepare Lease · ten-page original / Page 8**. The existing new-lease form opens
with that exact unit. Historical residents are not copied into a new tenancy.
The protected unit/lease context shows recorded room facts or “not recorded”;
staff must confirm missing or conflicting facts. Selecting a verified lease and
clicking **Use selected verified lease dates / rent** copies its recorded dates
and a single verified current monthly rent, when available. New terms remain
editable and require review. Imported offers/listings never supply conditions.

Page 8 supports 3/4/5 bedrooms, separate room labels and locations, two columns
and up to three entries per position. Existing 1/2-bedroom behavior is retained;
there is no sixth-bedroom control or export. A den can use unused Bedroom 4;
an additional bathroom can occupy the column beside its bedroom. Complex extra
rooms require explicit positions. Colliding active positions prevent export.
Confirmed absent areas print **N/A in the mapped label** and blank dependent
conditions. Observations start empty. Presets include the requested descriptions;
**Custom** preserves the entered capitalization, punctuation and symbols.

Use **Load approved template profiles** for an existing reviewed profile, then
attach the matching approved blank ten-page PDF. The exact file SHA-256 and page
dimensions must match. No original PDFs, fonts or tenant reference files are
uploaded by this interface or committed to Git. Saved details contain the source
reference and mapping, so the same original/font must be reattached after reload.

For a new master, **Template setup / adjust field positions** provides a one-time
mapping editor on the original canvas, including pointer placement, exact numeric
bounds/fonts, protected signature rectangles and JSON import/export. Routine
preparation reuses approved profiles without editing coordinates. No real-master
coordinates are bundled or inferred. Map setup still needs an authorized person
with the real original and completed references; this change does not claim that
setup has already been performed for Leslie's files.

The viewer starts on **actual PDF page 8** and lets staff inspect every actual
page from 1–10. These indexes are not printed page numbers in an enclosing packet.
Working condition edits refresh a valid mapped preview after a short pause;
**Preview mapped ten-page lease** and the full PDF link allow explicit review.
The engine loads the original PDF and adds text only. It never redraws clauses,
whiteouts printed content, changes page order, fills signatures or silently shrinks
text. A value that does not fit its reviewed font/rectangle is rejected visibly.
An original printed label that needs changing must have an approved editable
blank position; covering or deleting original text is deliberately unsupported.

## Save, review, reuse

1. Confirm the handoff, intended terms, occupants, services and actual room facts.
2. Review the approved blank source, font/field positions and complete PDF preview.
3. **Save as Draft** for incomplete work, or **Mark Ready for Review** after checks.
4. Check the exact saved PDF review confirmation and explicitly **Approve reviewed
   preparation**. Approval is for preparation only; it is not execution/payment.
5. **Download approved unsigned lease PDF** performs a fresh server read and
   compares the exact data/version/receipt/template before generating the PDF.

Saving uses `OpsCloud` and the native `ops_lease_preparation` RPC. Private drafts
belong to their actual staff actor and an existing unit, with an optional lease
that must belong to that unit. Version checks reject competing edits. An uncertain
outcome locks inputs and retains one immutable request for identical retry;
independent readback is required before showing success. Account/unit changes
clear working details, file bytes, approval state and preview URLs. Unsaved edits
retain the existing destructive-clear/reload confirmation.

Approval snapshots are immutable. Later draft edits clear current approval but
preserve previous approved versions and a server-attributed `ops_events` receipt.
**Load unit / lease facts** exposes the latest approved conditions plus up to 20
previous approved condition versions for that unit. **Reuse approved unit
conditions** copies only room/condition data into unreviewed working inputs,
leaving the current tenant/financial terms intact. Previous observations never
prove current condition. Draft rows record actor, creation/edit time, version and
status; immutable receipts record reviewer/time/source hash. No new property,
unit, tenancy, executed lease, payment or task is created by this workflow.

## Backend installation and source limits

The additive migration and guarded rollback are staged in this PR, tested in
disposable PostgreSQL, **not applied to the live project by this execution**.
See [the deployment packet](releases/LEASE-PAGE8-2026-11-16.md). Missing backend
returns a visible explanation and cannot approve a final download. Source can
be merged/published under the user's explicit instruction while these actions
remain unavailable until backend installation. Merging is not evidence of that
installation or an operational staff acceptance test.

The user granted Drive access. This execution exposes no Drive download/search
connector or shared browser-session tool, and the folder's public HTTP response
requires sign-in. The following originals remain necessary for exact comparison:

- The approved blank **ten-page** lease master (the existing catalog calls one
  candidate `Updated Blank Lease.pdf`; confirm the actual approved revision).
- Completed reference leases for **814 Flicker Road**, **5601 Littleridge Drive**,
  **6909 Brook Bend Way**, **1119 Ireland Drive**, **6600 Queens Falls Court**.
- Any approved font file needed for exact typography and the intended page-7
  disclosure selections/blank signature treatment in the approved source.

Reference filenames/revisions beyond the existing catalog were not verified.
No exact visual match to those originals, source-specific map, lease wording,
deposit allocation rule or real property condition is certified here. The
synthetic examples below demonstrate behavior, not Leslie's original design.

## Verification and examples

- `node --test tests/*.test.cjs`: **233 pass** at the implementation checkpoint.
- `node scripts/workflow-states.cjs --check`: 30 families / 68 scripts covered.
- Focused browser checks: `npx playwright test tests/lease-preparation.e2e.spec.cjs
  tests/lease-template.e2e.spec.cjs tests/lease-template-render.e2e.spec.cjs
  --workers=1 --reporter=line` (22 cases; final CI result linked in the PR).
- `PGDATABASE=oaktown_portfolio_ci node tests/lease-preparation-database.cjs`:
  disposable clones only, using the historical baseline from the CI workflow.
  Covers native sessions/roles, direct/anonymous/OAuth denial, actor/unit linkage,
  field/map validation, concurrent CAS, replay, immutable history, condition-only
  redaction and guarded rollback. Set `OAKTOWN_PSQL_BIN` only for an equivalent
  local disposable psql wrapper, never a production target.
- Render test compares all ten rendered pages for five fictional cases, requiring
  zero changed pixels outside mapped fields and visible changes within page 8.
  Original content streams, page count/order, dimensions, blank signatures,
  exact receipts, overflow and six-bedroom denial are separately tested.
- New desktop checks cover 1280/1440/1920 and WCAG A/AA scans in all six themes.
  Existing responsive/security regressions remain in the full browser suite.

See [fictional desktop screenshots and ten-page PDF examples](lease-editor-examples/README.md).
Recreate with the pinned CI Playwright dependencies, localhost on port 8765 and
`node scripts/capture-lease-editor.cjs`. Fixtures mock all protected APIs; no real
staff login, private document or production record is used. Hosted full CI is
the release gate; its exact SHA/run belongs in the PR and release handoff.
