# Oaktown Ops workspace design

Baseline: main `18eb477` (Today, reviewed task editing, Tasks intake, Notices, Properties and Renewals). Design refresh: November 1, 2026.

## Direction and source

Use a JARVIS-inspired operations console: midnight-blue surfaces, restrained cyan accents, a quiet grid, angular panels and static HUD rings. System sans-serif headings keep tasks readable; monospaced kickers and metrics establish the command-center character. Oaktown remains the product identity. **K.A.R.E.N is reserved as the future assistant name**; this design introduces no assistant service, voice/chat, fake telemetry or simulated activity. No remote fonts, frameworks or animation libraries are needed.

Guidance: [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), reviewed at commit `3a13158ff1f32156cbe144108de48eda2ecaed9a`, specifically its [skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/3a13158ff1f32156cbe144108de48eda2ecaed9a/.claude/skills/ui-ux-pro-max/SKILL.md) and accessibility, interaction, performance and responsive rules. The initial `internal enterprise dashboard` search informed the operational hierarchy. Following the owner's request for a JARVIS-like console, a targeted `dark dashboard` style search matched Dark Mode (OLED), Data-Dense Dashboard and Cyberpunk UI. We use dark surfaces, restrained glow and HUD details, with no glitching, scrolling scanlines or animation behind work. A focused `focus not obscured` query informed removal of the sticky Notices tab bar.

## Shared rules

- `workspace-design.css` owns the new application presentation, loaded last by `index.html`. It applies only under `.ops-workspace` and `@media screen`. `editor-command.css` extends the command palette only to embedded editor controls and the preview surround. Standalone appearance and document sheets retain their styles; both stylesheets are restricted to screen media.
- Semantic tokens define canvas, surfaces, text, muted text, borders, control outlines, accent, radius, shadows and a 4/8px spacing rhythm. New components should reuse them.
- Body, helper text and page headings use system sans-serif. Monospace is limited to kickers and metrics. No delayed font downloads. The decorative HUD emblem is hidden from assistive technology and omitted on small phones.
- Primary actions use cyan with dark text. Secondary actions use a bordered dark surface. Keep focus rings visible, provide hover/pressed feedback, preserve native disabled semantics and honor reduced motion.
- Primary text `#d5e7ee`, muted text `#9bb2bf`, cyan accents `#64e5f0` and dark button text `#05202a` are chosen for readable contrast against `#071119` / `#0e1c27` surfaces. The native color scheme is dark within the workspace. Legacy forest/gold variables map onto the console palette for older components. Do not use muted divider colors for field outlines or meaningful text.
- Controls are at least 44px high. Mobile inputs use 16px text. Checkbox labels remain the full clickable selection row.
- Today metrics share one summary surface. Task cards align editing actions at desktop and stack them on phones. Important states remain visible text; color does not infer urgency, execution, signature or legal readiness.
- Preserve the existing property list/detail 40/60 layout at desktop, mobile Back navigation, DOM/focus preservation, task review/save rules and unit identity.
- Seven workflow entries remain reachable through the existing scrollable phone navigation; no hidden menu or hover-only action is introduced. Planned workflows stay labeled.

## Verification

Use the existing Node and Playwright suites, including Today task editing, denied/stale saves, Tasks receipt/archive flows, unit selection, tab state and notice/renewal PDF downloads. Screenshots use only fictional API fixtures, never production tenant information.

Review signed-in and signed-out layouts at 320, 375, 768, 1024 and 1440px, landscape, keyboard focus, 200% zoom and reduced motion. Compare print-mode document geometry and generator sources with the base revision. Record executed results in the PR; this document is design guidance, not a claim that unrun checks passed.

## Review evidence

Local validation after the refresh: 82 Node tests and 57 browser tests passed, including downloads and task editing. Supplemental checks found no horizontal page overflow across five workflows at 320, 375, 768, 1024 and 1440px, 812×375 landscape, and a 720px CSS viewport (the reflow equivalent of a 1440px viewport at 200% zoom), with reduced motion enabled.

Axe 4.10.2 found no automated WCAG A/AA violations in fourteen sampled states: ten signed-in/signed-out workspace states, property detail, renewal tracker, reviewed renewal form, and embedded editor chrome. The audit excludes printable sheets. Fixed-field and charge-row inputs have programmatic labels, scrollable detail regions are keyboard-focusable, and skip-link/print-menu contrast is explicit. A stylesheet-toggle comparison confirmed identical computed sheet/subtree typography, colors, borders and geometry in both screen and print modes with the editor theme enabled/disabled. Existing PDF tests exercise the actual downloads. Automated results are not a complete manual accessibility certification.

All images below use fictional mocked records and capture a viewport, not the full page:

- [Today before](design-review/today-before.png) / [Today after](design-review/today-desktop.png)
- [Today on phone](design-review/today-mobile.png)
- [Notices on desktop](design-review/notices-desktop.png)
- [Tasks on phone](design-review/tasks-mobile.png)
