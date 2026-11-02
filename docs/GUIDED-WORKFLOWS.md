# Guided workflows and prompt preparation

Listings, Lead Handling and Applications now start with one short workflow card,
not the complete SOP and form. Switch between **Workflow** and **Build prompt**.
**One step** is the default; **View all** displays every step or field group.
Detailed instructions and source notes remain expandable in either view.

## Navigation and progress

- Jump to any step, go back, or use Next without completing prior steps.
- **Reviewed · next** records your place and advances a sequential guide step.
- Applications groups Dropbox signature, internal income review, and verification
  preparation as parallel work. Water and landlord verification are another
  parallel group, subject to required consent. Each branch can be reviewed in any
  order; marking it reviewed does not force navigation.
- Review marks live only in memory during the visit, survive workspace switching,
  and reset on reload. They never change an applicant/case status or verify that
  real work occurred. Selecting a guide step does not silently change the prompt's
  application-stage field.
- An explicit **Build a prompt for this work** action can choose the matching
  description/features or findings-summary prompt mode. Existing inputs remain.

## Prompt preparation

Fields are grouped into small, freely navigable steps. Optional inputs can stay
blank. The review screen shows which groups contain text and offers Edit links.
The long editable prompt is in an expandable preview; Copy remains a direct
button. Edits to the generated prompt survive view/step navigation until an input
change rebuilds it or Clear resets the working inputs. No new persistence,
network calls, AI requests, file handling, or case mutations are introduced.

Original prompt models and their source precedence, privacy and human-decision
rules are unchanged. Brief privacy notices remain above the builder; detailed
source text is preserved in step disclosures and Sources & detailed guidance.
Permission requirements remain visible at external verification steps.

## Appearance and accessibility

Uses the existing raised surfaces and all six themes. Reading controls use native
buttons with pressed states; step buttons announce the current step and reviewed
state. Back/Next focuses the new heading. Inputs retain their labels and IDs.
Animations follow the global/device reduced-motion preference. The motion button
now describes its purpose: **Transitions & hover effects**.

On phones, guide pages use a smaller title banner and horizontally scrollable
step choices. Dual clocks remain available on daily-work pages; guide pages
reclaim that header space for the first instruction or field.

The original full HTML guides remain the fallback if enhancement is unavailable.
UI UX Pro Max's local progressive-disclosure query returned no verified relevant
pattern, so this interaction uses general step-navigation and native disclosure
principles rather than presenting an unrelated search result as guidance.

## Validation

113 existing Node tests; browser coverage for all three guide and prompt paths,
free jumps, out-of-order parallel reviews, all mode, editing/copying, clearing,
workspace switching, reload reset, theme/phone/landscape layouts and reduced motion.
Axe WCAG A/AA scans of both views in all six themes reported zero violations.

Previews (fictional inputs only): [parallel workflow](ui-review/guided-workflow.png),
[grouped prompt fields](ui-review/guided-prompt.png), [phone](ui-review/guided-phone.png).
