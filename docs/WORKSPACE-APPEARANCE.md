# Workspace appearance

The reference direction is an instrument panel: raised surfaces, inset controls,
concentric rings, and restrained edge lighting. Depth applies to navigation,
Notices and Leases tabs, dashboard cards, and the Listings, Lead Handling and
Applications guides. Visible borders and focus rings keep states legible without
relying on shadows alone. Dashboard counts and the task overview still use saved
records; the small header instrument is decorative and hidden from assistive tech.

## Themes

Choose **Theme** in the top bar. Existing Veyra (navy), Oryn (gold) and Nilo
(slate) remain, alongside Ember (carbon/amber), Verdant (forest) and Pearl (linen).
Existing preferences and the Veyra default remain compatible. Preferences sync
between windows. Only appearance names are stored; blocked storage is supported.

## Motion

The header motion button controls short workflow entrances, the decorative
instrument's initial settling movement, hover lifts, existing ambient connection
motion, and workspace scrolling. There are no added timers, pointer trackers,
canvas rendering loops, or animation dependencies. Device reduced-motion settings
always take precedence; the local preference persists independently. The existing
Connections ambient checkbox remains a separate local control within that panel.

## Scope

`workspace-depth.css` is screen-only and loaded by `index.html`. It is not loaded
by the embedded generator or any PDF/document master. No backend, access, applicant
processing, or record mutations are introduced by appearance changes.

## References reviewed

- [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill):
  dashboard hierarchy, neumorphic surface depth, 150–250 ms interaction feedback,
  contrast, visible focus, device reduced motion, and mobile checks. Its generic
  marketing hero/CTA recommendation was not applicable to this internal workspace.
- [shadcn/ui tabs](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/tabs.tsx):
  inset tab rail, raised selected state, visible boundaries, and focus treatment.
  Existing native controls and lease-tab keyboard behavior are retained; no React
  or component library is added.

These are design references. All new implementation is local HTML, CSS and
JavaScript, using the application's existing semantic theme tokens.

## Verification

Browser coverage exercises all six themes with fictional signed-in records at
320, 390 and 1440 px, preference persistence, record preservation, cross-window
sync, keyboard lease tabs, blocked storage, and device reduced motion. Application
prompt editing, copying, clearing and reload are checked in all six themes. The
full existing CI suite remains required before merging.

## Fictional previews

[Ember desktop](ui-review/ember-desktop.png) · [Pearl phone](ui-review/pearl-phone.png)

Screenshots use the browser suite's fictional records, not live operational data.
