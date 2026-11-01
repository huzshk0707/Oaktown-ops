# Requirements and decision register

**Historical discovery baseline:** For current implementation status, priorities and outstanding validation, use [the current roadmap](ROADMAP.md). Later releases supersede the original architecture, storage and module-status statements below. Unresolved business decisions remain unresolved unless explicitly confirmed.

Status: partial baseline with v0.1 update, 2026-10-25.

## Subsequent instruction and first release

The user has now authorized implementation with available material and iterative testing/feedback. PROJECT-004's documentation-first phase is complete. v0.1 provisionally implements the candidate features below as a browser prototype; the proposals are not presented as recovered historical decisions. See [release notes](RELEASE-0.1.md) for exact behavior and limits.

Evidence labels:
- **Confirmed**: explicitly stated by the user in the current chat or recovered source exchange.
- **Observed**: visible in an attachment; not automatically a universal rule.
- **Proposed**: a planning suggestion requiring later validation.
- **Unknown**: unavailable or unresolved in the recovered evidence.

## Current project constraints

| ID | Status | Requirement | Evidence |
| --- | --- | --- | --- |
| PROJECT-001 | Confirmed | Project name is Oaktown Ops; repository is Oaktown-ops. | Current chat |
| PROJECT-002 | Confirmed | Work directly on GitHub without a local project clone. | Current chat |
| PROJECT-003 | Confirmed | Repository is public. | Current chat and repository metadata |
| PROJECT-004 | Completed phase | Prepare documentation before starting the software build; now superseded by the instruction to begin implementation and iterate. | Current chat |
| PROJECT-005 | Confirmed | Use the referenced project chat as the planning source. | Current request |
| NOTICE-001 | Confirmed | Notice generation is an intended area of work. | Source exchange T1 |
| NOTICE-002 | Confirmed | The three supplied notices illustrate the intended kind of notice. | T2 |
| MAIL-001 | Confirmed | A filled firm book is handed to a person referred to as "her." | T3; recipient's identity and role are unknown |

## Confirmed LEGAL-001 steps

The source uses LEGAL-001 and these step numbers. Earlier steps are unavailable; do not reconstruct or renumber them.

| Original step | Confirmed current practice | Evidence |
| --- | --- | --- |
| Step 9 | Confirm eviction filing status through attorney email updates. | T4 |
| Step 10 | After an attorney confirms filing, record the court date and prepare reminders. | T5 |

No additional details were provided in either recovered confirmation.

These statements do not establish automatic inbox access, automatic status changes, reminder delivery, calendar integration, or any authority to file proceedings. They describe current practice only.

## Candidate requirements to validate later

| ID | Status | Candidate requirement |
| --- | --- | --- |
| CANDIDATE-001 | Proposed | Prepare a notice using sender, recipient, notice-date, balance, and statement-line inputs. |
| CANDIDATE-002 | Proposed | Support multiple named recipients plus the applicable occupants wording. |
| CANDIDATE-003 | Proposed | Preserve statement rows across page breaks and reconcile displayed totals with source ledger data. |
| CANDIDATE-004 | Proposed | Prepare a mailing worksheet using the recipients associated with a selected notice batch. |
| CANDIDATE-005 | Proposed | Keep a human-verifiable reference to the attorney update used to confirm filing. |
| CANDIDATE-006 | Proposed | Record court date and reminder plans after filing confirmation. |

These candidates are derived from the available examples and practices. They are not implementation commitments.

## Unresolved decisions

- Standalone HTML versus integrated software: unknown.
- LEGAL-001 Steps 1-8 and any steps after Step 10: unknown.
- Full product modules and priorities: unknown.
- Exact notice rules, approved wording, and review responsibilities: unknown.
- Who prepares, reviews, prints, mails, and receives the firm book: unknown.
- Reminder timing, recipients, channels, and ownership: unknown.
- Source systems and data model: unknown.
