# Holding deposit preparation

The owner's supplied pet and no-pet filled Word forms and deposit email define
this workflow. Original applicant examples and the Gmail thread remain outside
Git. `assets/deposit/holding-template.docx` is a sanitized blank derived from the
supplied layout: applicant fields are tokens, signature blocks are generated
blank, document metadata is generic and custom XML is removed. Company header,
logo, typography and clause wording are retained. The fixed supplied vendor PDF
is a general company sheet containing business/vendor contacts, with no tenant
information; the packet includes it byte-for-byte.

## Confirmed rules

- Holding deposit = confirmed base security deposit + $150 per pet, confirmed
  explicitly by the owner for multiple pets.
- Full first-month rent and move-in date are separate confirmed fields. The
  examples do not establish a general monthly pet-rent rate, proration amount,
  or a rule that base rent must equal the security deposit.
- Both variants credit the holding deposit toward security deposit upon lease
  signing. Only a pet case includes the source exception for the pet portion.
- The source paragraphs about viewing/condition, utilities, lease/portal and
  next-month prorated rent are retained without inferring that those events
  happened. Staff reviews the source facts and recorded approval before export.
- The main agreement names the primary signer, as in the supplied form. All
  entered signers receive separate email/name and blank signature/date blocks.

## Staff workflow

Open Applications → Prepare deposit & move-in packet, or the approved-documents
step. Sign in with the existing shared staff session. Enter the exact unit address,
signer names/emails, recorded approval, confirmed base deposit, pet count, total
first-month rent and move-in date. Review the calculated totals and full clauses.

Download the form (.docx) and fixed Move-In Vendors sheet (.pdf) separately, or
use the complete ZIP containing both and the editable email text. A PNG/JPEG
payment-details image can be supplied for that packet; no Venmo/Zelle handle or
QR code is invented. Copy the reviewed email, attach the documents, and send it
through the usual external workflow. Sending, applicant signing, receipt of
money, lease execution, portal creation and utilities transfer are separate facts.
Nothing in this preparation tool writes those states to a case, task or ledger.

Inputs and image previews stay in this tab and clear on sign-out, account change
or reload. Download a packet to retain a draft. Input changes invalidate reviewed
exports; a late asset response after sign-out cannot produce a download. The
final email remains editable until downloaded/copied. Required-field validation
and the recorded-approval checkbox are review controls, not automated approval.

## Verification

Fictional tests cover $150 per pet, no-pet credit wording, independently confirmed
rent, multiple blank signers, XML escaping, editable-email copy, identical vendor
PDF bytes, optional image inclusion, sign-out and six-theme reflow. Rendered
fictional pet/one-signer and no-pet/two-signer Word forms each fit one Letter page,
with amounts, dates and signature areas inspected. Longer signer/address inputs
can continue naturally to additional Word pages. Browser downloads use DOCX;
no full new-lease PDF export or external sender has been added.

CI, merge and website publication are recorded in the implementation PR.

## Signing-area alignment — November 9 refinement

The Word export uses a fixed, borderless two-column signing layout with a clear
column gutter. Email aligns with the signature area; printed name aligns with
the date area. Both writing areas have the supplied yellow highlight and a real
bottom rule. Each identity/field/label block stays together when Word paginates.
The in-app preview uses the same two-column structure and blank yellow areas.

Two newly supplied DOCX examples were inspected as layout references. No filled
applicant data is included in the source, fixtures or template. Rendered fictional
pet/one-signer, pet/two-signer and no-pet/two-signer samples each fit one Letter
page; six signers use two pages with intact blocks. Tests cover escaped names,
blank highlighted cells and aligned preview geometry at phone/desktop widths.
