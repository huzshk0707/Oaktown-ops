# Oaktown Ops v0.2 — exact-layout notice integration

Status: development branch for review; **not merged into the main application**. A separate test preview is published at https://huzshk0707.github.io/Oaktown-ops/preview-v02/ while the original homepage still serves v0.1.

## What changed
- Retained the v0.1 Oaktown Ops green sidebar, navigation language, responsive shell, and feedback access.
- Integrated the previously tested standalone HTML generator as `generator.html`, using the same reference notice layout and embedded blank USPS PS Form 3877 visual template.
- The 7-day notice output retains Times New Roman page layout, yellow-highlighted balance, six separate Current statement columns, and continuation-page handling.
- One generator batch creates both the notices and a Firm Book with eight addressee rows per landscape page.
- Existing standalone property selection, add/remove charge lines, notice duplication, JSON import/export, and local browser saving are present.
- The original v0.1 interface is preserved at `legacy.html` for manual court follow-up; it is **not** connected to generator batches.
- New static/JavaScript syntax checks protect the document and form integration.

## Critical limitations
- Public GitHub Pages is not a secure tenant database. Browser storage is local to each browser profile/device, not synchronized, and can be deleted. Export backups and use fictional tenant data during testing.
- Neither email nor TurboTenant delivery is automated. Leslie still decides on eviction referrals, and filing confirmation still comes from attorney email.
- No proof of physical mailing is collected by generating the Firm Book.
- The USPS form background is a user-supplied reference reproduction, but the receiving post office must accept any computer-generated facsimile.
- The wording of the notice examples has not been independently approved as applicable legal wording. In particular, statements about certified mail must be confirmed against the actual service method.
- The current standalone print implementation uses the reference notice page-break behavior and requires an operator to inspect a test PDF and multi-page examples before operational use.
- Amounts must reflect verified charge rows; the generator is **not** a late-fee calculator. Resolve the earlier conflicting 5%-vs-$20 example against leases and applicable law.

## Review checklist
1. Open the integrated Notice Studio and compare a fictional one-row notice with the Edmonia and Baird references.
2. Add a second charge line and compare both notice pages with the Wintergreen example.
3. Add nine fictional notices and confirm two Firm Book pages, with 8 + 1 filled entries.
4. Print to PDF: Letter portrait for notices, Letter landscape (11 x 8.5 in) for Firm Book; enable background graphics.
5. Inspect the yellow total, all six table headings, recipient addresses, and postal acceptance fields.
6. Refresh and verify browser-local saving; export and import a fictional JSON backup.
7. Open court follow-up and confirm it clearly remains a separate, manual legacy prototype.

No migration of actual tenant case records has been performed.

## User feedback incorporated — tenant message and navigation (v0.2.1)

- Removed the redundant top-level Firm Mailing Book navigation item. The same notice generator still provides its internal Firm Book preview and printing.
- Removed the "Open full-screen generator" link from the app shell. All primary actions remain inside Oaktown Ops.
- Added a dedicated **Tenant message** tab with a visible read-only text preview and **Copy text** button.
- The message is extracted directly from the same generated notice's rendered HTML (no separate maintained wording): tenant/occupants name and property address, past-due heading, date, greeting, 7-day heading, all notice paragraphs, and the existing sign-off.
- The message excludes only the **sender/owner return-address block** and **Current statement title and charge table**, as requested.
- Copy is disabled if tenant name, property address, date, or amount-due entries are incomplete; the app shows the reason.
- Clipboard copy occurs only when the user presses the button. No email or TurboTenant message is sent automatically.
- Tenant email identifiers, contact records, message workflow checklists, and delivery automation are **future features**, not implied to exist in this build.
- Original notice PDF and USPS Firm Book rendering rules were not changed as part of these updates.

### Manual testing still needed

1. In **7-day notices**, select a fictional tenant and add a verified amount.
2. Open **Tenant message**; verify the names, full property address, greeting, heading, notice body and sign-off match the notice PDF.
3. Verify there is **no P.O. Box sender block and no Current statement table** in the copied message.
4. Select **Copy text** and paste into a blank local note. Confirm paragraph breaks and the highlighted amount render as ordinary text with the exact dollar amount.
5. Edit the notice amount or switch selected notice, return to **Tenant message**, and ensure the text refreshes correctly.
6. Confirm the Firm Book preview/print remains available inside **7-day notices**.
