# Morning Plan & SOD — V1

The Morning Plan/SOD workflow is part of Today. This format update keeps its review-and-copy behavior and temporary storage.

## Source-derived SOD format

The user's latest SOD examples define these sections, in order:

1. `Good Morning Leslie,`
2. A chosen greeting: `Hope you're doing well!` or `Hope you had a good weekend!`
3. `I'm getting started for the day. My priorities today are:`
4. Specific priorities, one bullet per line: `- Subject: concrete next action`.
5. Recurring bullets: Tenant Communications; REI Hub – Import Feed; Maintenance & Leasing.
6. `Please let me know if there's anything else you'd like me to prioritize today.`
7. `Thank you, and wishing you a wonderful [weekday]!` using the Louisville/Eastern work date.

Recurring sections vary slightly across examples. V1 uses a coherent source-derived default and allows the author to edit or uncheck any recurring line. The Monday/weekend greeting must be chosen, never inferred from a date. The email examples contained actual addresses and special notice exclusions; **those case details are not committed as defaults or fixtures**, and never apply to a different day without fresh evidence.

## Data and review workflow

- A signed-in Oaktown staff member opens Today → Morning Plan & SOD email. The Louisville/Eastern work date is shown on screen and supplies the weekday in the closing. It is not inserted into priority wording or task deadlines.
- Pick from actual active, non-archived tasks. Waiting tasks can be selected deliberately but are not automatically marked actionable, urgent or completed.
- Task choice imports the saved title and existing `intake_details.next_action` into an editable daily line. Blank actions require a concrete author-supplied action. Current tasks may be reordered/removed without changing their original priority or status.
- Add new email/screenshot priorities manually as `Subject: Action` lines. These are **draft content only**; they do not create duplicate Supabase task records.
- The pure SOD model validates missing actions, duplicate titles, invalid lines and recurring labels. It builds a copy-ready draft from the approved plan. The author can edit the final text and copy it.
- Copying is not sending. No Gmail API, task-write RPC, `ops_events` writer, storage or server endpoint is invoked by this feature.
- Drafts and candidate data stay in browser memory; sign-out clears them. A selected task that changes or closes on a fresh Today read is removed from the draft and requires re-review.

## Limits and next increment

- V1 is a **client-session planning and email composer**, not persistent daily planning. Reload closes the draft. It deliberately does not claim a saved SOD or a sent email.
- The Task Dashboard AI may suggest the ordering and priority wording, but the author confirms them before putting them into this UI.
- After V1 is reviewed in real staff use: implement persistent, user-approved daily plan records, AI-side proposal import and human-confirmed sent email snapshot. Reuse existing EOD journal rather than duplicating tasks.
- Full 37-task Master Backlog availability in Supabase remains a separate production verification; the displayed candidates come only from actual saved task rows.

## Acceptance

- All three recurring sections are editable or removable and have the correct source-derived structure.
- Specific priorities appear before the recurring sections, with greeting and signoff preserved.
- No tenant/property-specific case facts from historical examples are inserted automatically.
- No write operations occur on generate or copy. The staff can manually edit the draft.
- Sign-out clears private text; stale selected tasks invalidate prior drafts; read-only session still allows a copy-only draft.
- Existing Today, Task Intake, Completed, EOD, OAuth connector, property profiles and global search remain unchanged.
