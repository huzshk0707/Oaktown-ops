# Oaktown Ops UI/UX refinement

November 9, 2026. Baseline: main `c5c9706`, after PRs #50 and #51.

## Design references

Guidance was reviewed from [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill):
its [UX guidelines](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/src/ui-ux-pro-max/data/ux-guidelines.csv), product and style catalogs favor a clear, functional productivity interface with stable navigation, accessible controls, meaningful feedback and restrained motion.

Supporting references are the [GOV.UK Design System](https://github.com/alphagov/govuk-design-system) guidance for [Details](https://github.com/alphagov/govuk-design-system/blob/main/src/components/details/index.md), [Buttons](https://github.com/alphagov/govuk-design-system/blob/main/src/components/button/index.md), [Tags](https://github.com/alphagov/govuk-design-system/blob/main/src/components/tag/index.md) and [Check answers](https://github.com/alphagov/govuk-design-system/blob/main/src/patterns/check-answers/index.md). Essential limitations stay visible, supporting detail is optional, and buttons describe the action they perform.

These are design references, not installed dependencies. No third-party installer, framework, fonts, tracking or runtime was added.

## Implemented behavior

- Compact title/header and summary strip; continuous decorative instrument removed from view. All six themes remain available in Appearance with motion and density preferences.
- Explicit mobile Menu disclosure with all destinations, selected state, Escape and focus handling. Destinations no longer depend on horizontally scrolling the sidebar.
- Urgent work and focus are primary; active tasks have title/code search, date/waiting filters, later scheduled work and Show more. Search/filter preferences stay in memory and clear on sign-out. Read-only task viewing uses existing connected profiles.
- Completed tasks remain visible and separate from collapsed archived history. Task Intake remains the reviewed import workflow, rather than being mislabeled as the task list. No new task-creation API is introduced.
- Optional task breakdown and advanced settings/connections use disclosure. Existing SOD and EOD behavior and reviewed saving remain available.
- Workflow/subtab and connected-profile URLs survive refresh and browser Back/Forward. URLs use workflow keys and opaque record IDs, never names/notes. Protected deep links wait for verified staff sign-in. Recovery links keep their existing handling.
- Listings, Leads and Applications identify themselves as guides/prompt builders. Their reading progress is not a saved case status.
- New-lease preparation states temporary storage and unavailable full export before entry. Clear and reload protect entered data; sign-out deliberately clears it. Navigation among workflows retains in-memory inputs.
- Notice step navigation jumps to Select units, Edit details, or Review & export and shows draft/readiness context. It is a navigation aid, not a gated wizard. Existing fields, readiness checks, local persistence, messages, PDF/ZIP/Firm Book output and clauses are retained.
- Theme tokens replace the unreadable green address-editor disclosure. Focus states, controls, metadata and narrow-screen reflow are preserved.

## Verification and release scope

The implementation uses fictional records and mocked APIs for browser checks. New regressions cover workflow/record history and auth hydration, task filters/pagination/read-only access, notice jumps without draft loss, lease discard protection, mobile navigation and appearance across all six themes. Existing document download, staff-session, reviewed-save, SOD/EOD and archive tests remain required.

No database/schema/auth setting, real task, tenant record, notice delivery or email was changed by this UI increment. Full ten-page lease export and durable lease/SOD draft saving remain separate unfinished capabilities. No full WCAG certification is claimed.

Release evidence is tracked with the implementation PR and GitHub checks. A successful Pages deployment verifies publication; real staff usability, authenticated writes and physical printing require their own operational verification.
