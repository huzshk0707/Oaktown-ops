# Oaktown Ops workspace design

Baseline: main `18eb477` (Today, reviewed task editing, Tasks intake, Notices, Properties and Renewals). Design refresh: November 1, 2026.

## Direction and source

Use a quiet, legible operations workspace: deep forest navigation, warm neutral canvas, white work surfaces, restrained gold identity and clear selected states. Serif page titles echo the existing Oaktown wordmark; system sans-serif controls and tabular numbers keep daily work readable. No remote fonts, images, frameworks or animation libraries are needed.

Guidance: [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), reviewed at commit `3a13158ff1f32156cbe144108de48eda2ecaed9a`, specifically its [skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/3a13158ff1f32156cbe144108de48eda2ecaed9a/.claude/skills/ui-ux-pro-max/SKILL.md) and accessibility, interaction, performance and responsive rules. The `internal enterprise dashboard` search matched Minimalism & Swiss Style; its marketing hero pattern did not fit this existing staff app. We retained the operational layout and existing brand instead of adopting generated landing-page, teal/blue palette or external-font suggestions. A focused `focus not obscured` query informed removal of the sticky Notices tab bar.

## Shared rules

- `workspace-design.css` owns the new application presentation, loaded last by `index.html`. It applies only under `.ops-workspace` and `@media screen`. Generator documents and PDF renderers do not load it.
- Semantic tokens define canvas, surfaces, text, muted text, borders, control outlines, accent, radius, shadows and a 4/8px spacing rhythm. New components should reuse them.
- Body and helper text remain sans-serif; only the main workspace heading uses Georgia. No delayed font downloads. Stronger section hierarchy replaces repeated competing headline sizes.
- Primary actions use forest with white text. Secondary actions use a bordered white surface. Keep focus rings visible, provide hover/pressed feedback, preserve native disabled semantics and honor reduced motion.
- Primary text `#243c33`, muted text `#56665e` and forest buttons `#173f35` are chosen for readable contrast on the white/warm surfaces. Do not use muted divider colors for field outlines or meaningful text.
- Controls are at least 44px high. Mobile inputs use 16px text. Checkbox labels remain the full clickable selection row.
- Today metrics share one summary surface. Task cards align editing actions at desktop and stack them on phones. Important states remain visible text; color does not infer urgency, execution, signature or legal readiness.
- Preserve the existing property list/detail 40/60 layout at desktop, mobile Back navigation, DOM/focus preservation, task review/save rules and unit identity.
- Seven workflow entries remain reachable through the existing scrollable phone navigation; no hidden menu or hover-only action is introduced. Planned workflows stay labeled.

## Verification

Use the existing Node and Playwright suites, including Today task editing, denied/stale saves, Tasks receipt/archive flows, unit selection, tab state and notice/renewal PDF downloads. Screenshots use only fictional API fixtures, never production tenant information.

Review signed-in and signed-out layouts at 320, 375, 768, 1024 and 1440px, landscape, keyboard focus, 200% zoom and reduced motion. Compare print-mode document geometry and generator sources with the base revision. Record executed results in the PR; this document is design guidance, not a claim that unrun checks passed.

## Review evidence

Local validation after the refresh: 82 Node tests and 57 browser tests passed, including downloads and task editing. Supplemental checks found no horizontal page overflow across five workflows at 320, 375, 768, 1024 and 1440px, 812×375 landscape, and a 720px CSS viewport (the reflow equivalent of a 1440px viewport at 200% zoom), with reduced motion enabled.

Axe 4.10.2 found no automated WCAG A/AA violations in the ten sampled signed-in/signed-out workspace states after fixing the editor caption contrast and adding explicit group roles to named containers. The audit excludes the embedded document generator; the existing download/geometry suites cover its unchanged outputs. Automated results are not a complete manual accessibility certification.

All images below use fictional mocked records and capture a viewport, not the full page:

- [Today before](design-review/today-before.png) / [Today after](design-review/today-desktop.png)
- [Today on phone](design-review/today-mobile.png)
- [Notices on desktop](design-review/notices-desktop.png)
- [Tasks on phone](design-review/tasks-mobile.png)
