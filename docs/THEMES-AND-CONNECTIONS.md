# Appearance modes and recorded connections

The top-bar Mode selector switches instantly between Veyra (the existing navy/cyan direction), Oryn (charcoal, gold and serif headings), and Nilo (light slate/teal with rounded, softly raised surfaces). The names are working appearance labels, not different AI services. Workflow order, entered forms, session selection, permissions and saved records do not change. Fonts use local system stacks; there are no font/CDN requests.

Only the whitelisted appearance name is stored in `oaktown-theme-v1`. It is applied before styles load, survives reload, and synchronizes across tabs. Invalid preferences and blocked storage fall back safely. Screens and controls are themed; notice/lease document masters, print styles and generated PDFs are unchanged.

Today → Connections explores one task at a time from the existing protected Today snapshot. The bounded map includes task, property, unit, explicitly linked lease and renewal records when available. Every edge is backed by an actual record reference. Parent relationships may be traversed from linked units/leases/cases; no direct task links are inferred. Missing or inconsistent references remain explicit. Names written in a General operations task's summary never become relationship edges.

Nodes are native buttons supporting keyboard and touch inspection. The saved relationship list provides a text alternative; on small screens, the spatial graph becomes a list of record cards. Ambient motion is decorative and can be paused. Reduced-motion settings disable it, and keyboard focus pauses the ambient orb. Sign-out and unavailable Today data clear record names and details. The explorer makes no additional requests, writes no records and simulates no AI activity or streaming data.

Design guidance: UI UX Pro Max's data-dense dashboard style, small SVG network-graph guidance and reduced-motion/accessibility matches informed this implementation. Its generated marketing/gateway page patterns did not fit this personal application; layout therefore follows the existing workspace, with palettes and depth adapted from the user-provided references. No generated marketing pattern was persisted as the product design system.

Validation covers stored-link integrity, general/missing/inconsistent contexts, theme persistence and invalid storage, intact intake drafts, keyboard inspection, responsive layouts and reduced motion. Optional local Axe checks use `OAKTOWN_THEME_AXE=1` with the separately installed audit tooling; normal CI has no additional dependency. All fixtures/screenshots use fictional records.

## Fictional-data previews

| Mode | Workspace | Connections |
| --- | --- | --- |
| Veyra | [Navy workspace](design-review/themes/veyra-workspace.png) | [Connections](design-review/themes/veyra-connections.png) |
| Oryn | [Gold workspace](design-review/themes/oryn-workspace.png) | [Connections](design-review/themes/oryn-connections.png) |
| Nilo | [Slate workspace](design-review/themes/nilo-workspace.png) | [Connections](design-review/themes/nilo-connections.png) |
