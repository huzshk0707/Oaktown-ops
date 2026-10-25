# Oaktown Ops v0.1

Date: 2026-10-25. Status: first working prototype for feedback.

## Authorization and implementation choice

The user has now instructed development to begin with the available material and to refine the product through use, testing, and feedback. This supersedes the earlier instruction to wait before building.

A buildless browser application is the provisional first-release architecture. This is an implementation choice for fast iteration, not a recovered decision from the missing conversation. Source stays on GitHub. GitHub Pages is the selected initial hosting path.

## What is available

### Notice studio

Three fictional notices demonstrate a single rent line and a rent-plus-fee statement. Create an additional blank notice, edit sender and recipients, toggle occupants wording, change dates and amounts, add or remove lines, and edit wording and sign-off.

The sender is shared across the session. Recipient, charges, wording, mailing selection, tracking number, and filing notes are specific to each notice. Switching notices preserves in-memory edits.

Amounts use integer cents. The amount due is separate from the original charge; partial balances are supported. Negative amounts, credits, more than two decimal places, and an amount due greater than its charge are not supported in this release and trigger validation. A zero outstanding amount is permitted and is labeled PAID; notice eligibility is still a manual decision.

The body supports {{total}} and {{date}} substitutions. The initial wording is a generic payment reminder, not a validated statutory notice. Print outputs retain a working-draft label.

### Mailing worksheet

Select notices in their creation order and enter tracking/article numbers. Empty tracking numbers are shown as not recorded. The worksheet includes sender, recipients, addresses, piece count, and tracking numbers. It is a preparation aid and deliberately does not claim to be the official postal form or an acceptance receipt.

### Court follow-up

Manually record an attorney filing confirmation and email reference, then court date, optional time and timezone, reminder date, responsible person, and notes.

Court fields are inactive until confirmation is checked. Unchecking confirmation retains earlier entered dates but makes them inactive. No email is read, filing made, calendar event created, or notification sent.

## Session and data limits

All edits are held in memory. Refreshing or closing the tab loses them; supported browsers show a leave-page warning after edits. There is no browser localStorage, shared save, database, account, upload, download/import, or automatic external transmission. Printing is explicitly initiated by the user through their browser.

The public feedback form must use synthetic examples. Private-data storage and multi-user access need a later design decision.

## Acceptance checklist

- Edit all notice details and confirm preview changes.
- Add/remove statement rows; try a partial payment and invalid amount.
- Confirm totals change and incomplete drafts cannot use the print button.
- Include long recipient names and addresses.
- Switch notices and tabs without losing edits.
- Print a one-page and long multi-page draft; inspect row wrapping and repeated headers.
- Select zero, one, and more than eight mailing entries.
- Leave tracking numbers blank and check the worksheet says not recorded.
- Enter an attorney confirmation and court/reminder plan.
- Verify reminder-after-court-date warnings.
- Try a narrow/mobile viewport and keyboard-only form navigation.
- Refresh after editing and verify the documented reset behavior.

## Automated checks

The Node test suite covers exact cents, malformed money, invalid dates, totals, partial payments, missing details, selected mailing order, batches over eight entries, escaping untrusted text, confirmation details, and reminder ordering.

Browser and print checks must be recorded separately; passing pure-model tests alone does not establish visual correctness.

## Known gaps for feedback

- No saved/shared records or production data integration.
- No credit/adjustment entry or ledger import.
- No automatic legal deadlines or approved legal notice library.
- No direct filling of USPS Form 3877.
- No reminder notifications or email/calendar integration.
- No notice deletion, batch notice printing, or template library.
- No reconstruction of the missing earlier project decisions.

## Deployment

GitHub Pages should use main and /(root), with the included .nojekyll file. Repository-relative assets support the /Oaktown-ops/ project URL.

The first release is live on GitHub Pages. See [verification results and remaining manual checks](TESTING.md).
