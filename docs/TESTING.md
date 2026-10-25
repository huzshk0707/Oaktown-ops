# First-release verification

Date: 2026-10-25.

## Automated checks

- 12 calculation/workflow tests passed in GitHub Actions.
- JavaScript syntax checks passed.
- [Latest verified application-code check](https://github.com/huzshk0707/Oaktown-ops/actions/runs/40203023182).
- [Verified GitHub Pages deployment](https://github.com/huzshk0707/Oaktown-ops/actions/runs/40203022807).
- Application commit: 38a9a69718b42866df5a5cbbfce6aa7dacdf8107.

## Live browser checks completed

- Site loads with three fictional notices and a $3,300.00 aggregate balance.
- Recipient editing updates preview; HTML-like input displays as literal text.
- Changing the first rent balance to $200 produces a $250 total including the example fee, and labels the rent PARTIAL.
- A balance greater than its original charge displays a validation error and disables draft printing.
- Adding an incomplete statement row disables printing; removing it restores the valid draft.
- New blank notice creation works and flags missing address/amount details.
- Mailing selection and example tracking-number edits update the worksheet and count.
- Attorney confirmation unlocks court fields; reminder dates after the court date are flagged.
- Switching notices keeps their filing records separate and preserves the active session's edits.
- Desktop (1440px), narrow browser, and phone (390px) layouts were visually inspected.
- No page console errors were observed during the checked session.
- The occupants checkbox now changes both recipient wording and greeting. The fix was verified on the deployed app after versioning the static asset URLs.

## Remaining manual checks

The print-button action encountered a browser print dialog/control timeout in the testing environment. The actual print preview and resulting PDF/paper pages could not be inspected. Print styles are implemented, but one-page and long multi-page layout, repeated statement headers, and mailing-sheet page breaks remain unverified.

A full keyboard-only accessibility pass and testing in other browser engines are also pending.

## Suggested first feedback session

1. Open [Oaktown Ops](https://huzshk0707.github.io/Oaktown-ops/?v=0.1.1).
2. Use sample data and edit a statement.
3. Try Print draft in your normal browser and inspect the PDF preview.
4. Try the mailing worksheet and manual court notes.
5. Tell us what is missing or awkward. Avoid private records in public issues.

All source and documentation were authored directly through GitHub. No local checkout or project files were created.
