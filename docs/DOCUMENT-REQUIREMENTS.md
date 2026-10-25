# Source document observations and candidate requirements

Status: source-derived planning only. No templates or generator have been built.

This file describes fields and structure without reproducing live tenant records. Text was extracted from all eight pages across four supplied PDFs. Exact typography, dimensions, visual positioning, and checkbox states have not been visually verified.

## Notice examples N1-N3

All three examples have a shared structure:

1. Sender/business name and return mailing address.
2. One or more recipient names, occupants wording, and property mailing address.
3. A past-due account heading and notice date.
4. Salutation and a seven-day pay-or-deliver-possession notice heading.
5. Body concerning unpaid rent, late charges, potential eviction, credit reporting, stated certified-mail delivery, and a certified-funds restriction after a stated day of the month.
6. A stated current amount due.
7. Closing and staff/business sign-off.
8. A current-statement table.

The body statements above are observations of supplied examples, not validated legal or operational rules.

### Statement columns

| Field | Observed meaning |
| --- | --- |
| Due Date | Date associated with the charge |
| Category | Charge classification, including rent or late fee |
| Description | Human-readable charge description |
| Status | Charge status |
| Amount | Charge amount |
| Amount Due | Outstanding amount |

One notice spans two pages with a rent entry and a prior-period late fee. The other two examples each occupy one page and show a rent entry. A future design must be checked against both single-page and multi-page cases.

### Candidate input fields

- Sender display name and return address.
- Recipient names, occupants suffix, and delivery address.
- Notice date.
- Approved notice template/version and sign-off.
- Ledger entries corresponding to the statement columns.
- Displayed total due, with a defined source and reconciliation rule.

### Open notice questions

- Is this the only notice type, or the first of several?
- Which text is fixed, configurable, or subject to review?
- Is the amount due entered, imported, or calculated?
- Which charges are eligible for inclusion?
- How are partial payments, credits, adjustments, or disputed charges handled?
- What determines notice eligibility and dates?
- Which sender/business-name variant is authoritative? The samples vary between singular and plural business wording.
- Are recipient order and street-address abbreviation differences acceptable? The overlapping mailing entries are not text-identical to the notice addressees.
- Which output formats, page sizes, batch-printing behavior, and review steps are wanted?

Do not infer rules from the examples' dates, amounts, or wording.

## Firm mailing book F1

The supplied document identifies itself as USPS PS Form 3877, January 2017, Firm Mailing Book for Accountable Mail. It contains four pages:

| PDF page | Content |
| --- | --- |
| 1 | Mailing instructions, first page |
| 2 | Additional instructions and registered-mail value guidance |
| 3 | Mailing form with eight populated addressee rows |
| 4 | Information about privately printed facsimiles |

The user describes this as a firm book supplied filled in to a person whose identity is not established.

### Fields observed in the form

- Sender name and address.
- Mail/service selections.
- Tracking/article number.
- Addressee name and full mailing address.
- Postage, service fees, handling charges, and other service-specific monetary columns.
- Total pieces listed by sender.
- Total pieces received by the post office.
- Receiving employee and dated postmark/receipt area.

The service selections shown on the form are available choices, not proof that every service is used. The filled sample establishes addressee content; it does not establish a complete tracking-number, fee, acceptance, or receipt workflow.

Two notice recipients have corresponding entries in the firm book; the third notice recipient does not appear among its eight listed rows. Do not assume all attachments represent the same complete mailing batch.

### Source instruction topics relevant to later design

The supplied instructions address sender/return addresses, row order and piece numbering, piece totals, unused rows, duplicate copies for certain services, and approval of privately generated facsimiles.

These are topics found in the dated source document, not independently checked current postal guidance. A future generated form's acceptance and applicable requirements must be verified before use. Preserve the distinction between preparing a worksheet and proving mailing or delivery.

### Candidate mailing requirements

- Associate each mailing row with a reviewed recipient and address.
- Define batch membership and stable row order.
- Decide whether tracking numbers and fees are entered by staff or obtained elsewhere.
- Determine how batches exceeding the supplied form's eight rows are handled.
- Define who completes postal acceptance fields and who retains receipts.
- Choose between filling the official form and producing a separately reviewed facsimile.

## Technical observations

No canonical PDF form fields were returned by the extraction tool for any of the four PDFs. Do not assume these attachments can be filled through an existing interactive field tree. This observation alone does not establish the absence of every possible page annotation.

No raw PDFs, personal addressee details, or individual financial values are committed to this public repository.
