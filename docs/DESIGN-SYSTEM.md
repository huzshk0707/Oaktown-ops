# Oaktown Ops workspace design

Baseline: main `1fe8e6b` (Today, reviewed task editing, Tasks intake, Notices, Properties and Renewals). Design refresh: November 1, 2026.

## Direction and source

Use the owner's supplied dashboard reference as the visual direction: rich navy, a property illustration banner, individually colored metric cards, a compact multi-column workspace, a donut breakdown and useful quick actions. Replace the earlier sparse cyan HUD styling. The artwork is an original abstract neighborhood illustration, not a map or representation of actual portfolio properties.

This is a personal working tool. Today opens first; the operations brief, promotional/footer copy and staff-facing language have been removed. Keep the reference-led visual design, concise task labels and direct controls. Two visible clocks show Eastern (EST/EDT automatically) and India (IST), including their dates. Clocks do not announce every tick or move keyboard focus. **K.A.R.E.N remains the future assistant name**; no AI agent, chat or voice capability is implied.

Guidance: [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), reviewed at commit `3a13158ff1f32156cbe144108de48eda2ecaed9a`, specifically its [skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/3a13158ff1f32156cbe144108de48eda2ecaed9a/.claude/skills/ui-ux-pro-max/SKILL.md) and accessibility, interaction, performance and responsive rules. The `data dense dashboard` style search and `dashboard color coding` UX search informed the current revision: compact panels, distinct metric accents and text labels for all color-coded categories. The owner's visual reference takes precedence over the earlier command-console direction. No external fonts, chart packages or runtime dependencies are needed.

## Shared rules

- `workspace-design.css` owns the new application presentation, loaded last by `index.html`. It applies only under `.ops-workspace` and `@media screen`. `editor-command.css` extends the command palette only to embedded editor controls and the preview surround. Standalone appearance and document sheets retain their styles; both stylesheets are restricted to screen media.
- Semantic tokens define canvas, surfaces, text, muted text, borders, control outlines, accent, radius, shadows and a 4/8px spacing rhythm. New components should reuse them.
- Body, helper text, page headings and metrics use system sans-serif. Small kickers use restrained letter spacing. No delayed font downloads. The old HUD emblem is removed. The property illustration is a decorative CSS background; metric icons are hidden from assistive technology.
- Primary actions use blue with white text. Secondary actions use a bordered navy surface. Focus uses pale blue, independently of the action fill. Keep focus rings visible, provide hover/pressed feedback, preserve native disabled semantics and honor reduced motion.
- Primary text `#dee8fb`, muted text `#a5b9d8` and action blue `#2a66dd` with white text are chosen for readable contrast against `#081331` / `#101f41` surfaces. The native color scheme is dark within the workspace. Legacy forest/gold variables map onto the navy/blue palette for older components. Do not use muted divider colors for field outlines or meaningful text.
- Controls are at least 44px high. Mobile inputs use 16px text. Checkbox labels remain the full clickable selection row.
- Today metrics have separate colored surfaces and labeled icons. Task cards, schedule overview, quick actions and lease reviews share a compact desktop grid and stack on phones. Important states remain visible text; color does not infer urgency, execution, signature or legal readiness.
- Preserve the existing property list/detail 40/60 layout at desktop, mobile Back navigation, DOM/focus preservation, task review/save rules and unit identity.
- Seven workflow entries remain reachable through the existing scrollable phone navigation; no hidden menu or hover-only action is introduced. Planned workflows stay labeled.

## Verification

Use the existing Node and Playwright suites, including Today task editing, denied/stale saves, Tasks receipt/archive flows, unit selection, tab state and notice/renewal PDF downloads. Screenshots use only fictional API fixtures, never production tenant information.

Review signed-in and signed-out layouts at 320, 375, 768, 1024 and 1440px, landscape, keyboard focus, 200% zoom and reduced motion. Compare print-mode document geometry and generator sources with the base revision. Record executed results in the PR; this document is design guidance, not a claim that unrun checks passed.

## Review evidence

Local validation after the refresh: 85 Node tests and 65 browser tests passed, including downloads and task editing. Supplemental checks found no horizontal page overflow across five workflows at 320, 375, 768, 1024 and 1440px, 812×375 landscape, and a 720px CSS viewport (the reflow equivalent of a 1440px viewport at 200% zoom), with reduced motion enabled.

Axe 4.10.2 found no automated WCAG A/AA violations in fourteen sampled states: ten signed-in/signed-out workspace states, property detail, renewal tracker, reviewed renewal form, and embedded editor chrome. The audit excludes printable sheets. Fixed-field and charge-row inputs have programmatic labels, scrollable detail regions are keyboard-focusable, and skip-link/print-menu contrast is explicit. A stylesheet-toggle comparison confirmed identical computed sheet/subtree typography, colors, borders and geometry in both screen and print modes with the editor theme enabled/disabled. Existing PDF tests exercise the actual downloads. Automated results are not a complete manual accessibility certification.

All images below use fictional mocked records and capture a viewport, not the full page:

- [Today before](design-review/today-before.png) / [Today after](design-review/today-desktop.png)
- [Today on phone](design-review/today-mobile.png)
- [Notices on desktop](design-review/notices-desktop.png)
- [Tasks on phone](design-review/tasks-mobile.png)

## Task chart and personal workflow

The KPI cards and schedule chart reuse `OpsTodayModel.classify` on the task rows already fetched for Today. The four schedule categories (overdue, due today, upcoming, undated) are disjoint. Waiting/blocked is an overlapping status count displayed separately in the KPI row, never added to the chart total. Archived and terminal tasks are excluded. A loaded zero is distinct from signed-out, loading or denied data; those unavailable states show text instead of a pie chart. The chart is cleared on sign-out and read failure.

Quick actions open existing workflows; Prepare lease selects the existing preparation tab. They do not create records or start background work. Browser tests cover chart grouping (including a task beyond the seven-day queue), empty data, private-state cleanup, denied reads and quick-action navigation. Personal-workspace checks cover clock ticks and daylight-saving transitions, the default Today view, removed copy, and reviewed clean-start behavior. [The production workflow test](PERSONAL-WORKFLOW.md) records the next real intake sequence.
