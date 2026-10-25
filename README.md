# Oaktown Ops

**v0.1 — a working prototype for testing and feedback.**

[Open the workspace](https://huzshk0707.github.io/Oaktown-ops/) · [Share feedback](https://github.com/huzshk0707/Oaktown-ops/issues/new?template=feedback.yml)

Oaktown Ops is a planned rental-operations application. The first release focuses on notice drafts, mailing preparation, and manual court follow-up, based on the material recovered from the project discussion.

## Try the first version

1. Open the workspace and use the three fictional example notices.
2. Change a recipient, address, or statement line and watch the draft update.
3. Print a draft using the browser's print dialog.
4. Select notices in **Mailing worksheet** and enter sample tracking numbers.
5. In **Court follow-up**, record a sample attorney confirmation, court date, and reminder plan.
6. Send feedback here in chat or through the repository's issue form.

**Edits are held in this browser tab only and disappear on refresh.** There is no shared saving, login, database, email connection, or notification delivery. Nothing entered into the workspace is sent to GitHub. Use fictional data while evaluating this prototype.

## Included

- Editable sender, recipient, address, date, wording, and sign-off.
- Editable statement lines with exact-cent totals and validation.
- Live draft preview and print styles.
- Mailing selection, tracking-number fields, and printable preparation worksheet.
- Manual records corresponding to LEGAL-001 Steps 9 and 10.
- Responsive layout, labeled controls, and keyboard navigation.
- Automated calculation and validation tests plus a GitHub feedback form.

The application is buildless HTML, CSS, and JavaScript. Source changes are made directly on GitHub; no local project clone is needed. GitHub Pages serves the repository root from main. The browser app has no external scripts, fonts, analytics, API calls, or application storage.

## Project documentation

- [First release: scope, usage and test checklist](docs/RELEASE-0.1.md)
- [Project introduction and disclaimer](docs/PROJECT-BRIEF.md)
- [Requirements and decisions](docs/REQUIREMENTS.md)
- [Source document observations](docs/DOCUMENT-REQUIREMENTS.md)
- [Source coverage and limitations](docs/SOURCE-COVERAGE.md)
- [Remaining questions](docs/OPEN-QUESTIONS.md)

## Limits and disclaimer

This is an early testing tool. Existing source notices have not been validated for legal use; the app starts with a generic payment reminder and marks printed notices as drafts. It does not calculate legal deadlines, send notices, prove service, file proceedings, or replace review of wording and amounts.

The mailing worksheet is not an approved USPS PS Form 3877 or a postal receipt. Court and reminder entries are manual notes; no reminders are sent.

The earlier project discussion was only partially recoverable. Development can proceed iteratively under the user's latest instruction, but the missing decisions remain unresolved. No completed tenant PDFs or private case data are included in this public repository.

## Checks

GitHub Actions checks JavaScript syntax and runs `node --test tests/model.test.cjs`. Browser and print review are separate from these model tests; see the release checklist.

Updated: 2026-10-25.
