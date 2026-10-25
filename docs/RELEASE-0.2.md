# Oaktown Ops v0.2 — exact-layout notice integration

Status: feature branch for review; **not** yet merged or published on the production GitHub Pages URL.

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
