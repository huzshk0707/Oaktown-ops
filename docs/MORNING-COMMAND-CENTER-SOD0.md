# Morning Command Center — layout baseline (Stage SOD-0)

This is a source-only PR. No production data is changed.

## Decisions

- Today is the task workstation. Urgent/due, Focus now, work levels, dated follow-ups, global search and connected profiles stay.
- Remove the duplicate Action Centre saved task feed. Keep Ctrl/Cmd+K search, the task editor, property/lease/unit record profiles, reference library and Refresh records in the toolbar.
- Completed tasks appear directly on Today in a visible, searchable, scrollable section. Only saved non-archived completed tasks count. Unknown historical completion dates stay unknown. Search supports title and saved M/W/A code.
- Archived history is separately collapsed. Restore still uses approved staff workflow and preserves status and event history.
- Retain a secondary Task Intake tab for manual task creation, reviewed JSON import and receipts, and archival tools. Retire only after Today replaces these functions safely.
- EOD reporting, OAuth ChatGPT task connection, document access and portfolio workflows remain unchanged.

## Next implementation: Morning review and SOD

1. Read current saved tasks and date-sensitive follow-ups using Louisville/Eastern work dates.
2. Accept new staff emails, screenshots and user context through the Task Dashboard AI. Distinguish source evidence and user interpretations.
3. Propose a daily order: urgent/due, next focus, other planned tasks, waiting dependencies, and repeated constants. Daily focus is NOT a permanent priority edit.
4. Let staff review a daily plan without duplicating tasks. Preserve the exact sent SOD separately from later plan changes.
5. Produce copy-ready SOD from the user's real email examples. Copy is not evidence of sending; sending must be confirmed.
6. Reuse approved tasks and event journal for end-of-day reports. Do not invent work or times.

## Input needed for SOD email template

Two or three prior SOD emails are needed to identify the exact greeting, recurring commitments, daily-change sections and sign-off. Do not impose a generic official template or send an email before those samples are reviewed.

Future persisted daily-plan storage must be separate from task status. No new schema or migration is part of this PR.

## Acceptance

- Zero duplicate Action Centre feeds; Ctrl/Cmd+K and library/profile navigation still work.
- Completed tasks visible without expanding archive; title/code search works, and archived work remains separate.
- Task Intake remains fully functional; no changes to Supabase rows, tenant records, notices or financial data.
- Signed-out and read-only sessions clear sensitive data and cannot silently write.
