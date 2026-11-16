# Focus Board — consolidated independent review

**OPS-FOCUS-REVIEW.4**, hp, 2026-11-16. [Consolidation PR #80](https://github.com/huzshk0707/Oaktown-ops/pull/80).
The owner-prioritized Phases 1–4 review is complete. This document consolidates
existing work and proposes bounded follow-ups; it is not a feature merge,
production activation or real-data permission. All source feature PRs remain
explicitly draft/unmerged. Review evidence PRs may be ready independently.

## Outcome

- **Two confirmed P2 defects**: offset-page task omission under concurrent deletion,
  and new Defer confirmation reusing a date validated before Eastern midnight.
- Scoped carousel/modal/Review, action confirmation/permissions/atomic task versions,
  Undo/recovery, SOD provenance/approval readback and session tests otherwise pass.
  Passing mocks/CI do not certify every live permission, provider or business fact.
- **Existing rollout limits**, distinct from implementation bugs: generic journal
  JSON is not a native-review attestation; selected original source excerpts become
  durable active-staff-readable data; unapproved drafts are visit-only; a plan
  approval is not an atomic lock of all selected task sources.
- Phase 5 already exists in #75. Phase 6 #77 is Ravi's separate staging work.
  Do not recreate either, claim their completion/activation from this review,
  or treat another account's branch as permission to edit it.

## Immutable evidence and scope

| Review | Exact source reviewed | Durable report / result |
| --- | --- | --- |
| [#76, step 1](https://github.com/huzshk0707/Oaktown-ops/pull/76) | #70 `08888e6c53f74aca8b9e68f316a019f07e41a48d`; #71 `70f63c43232f8efe7ec58ac769b949dbc31498b9` | [Report/reproduction/desktop acceptance at 63fa193](https://github.com/huzshk0707/Oaktown-ops/blob/63fa193bfb8b499cc7240943e192572c5ffe96de/docs/reviews/OPS-FOCUS-REVIEW-1.md). Phase 1: 6 model/reader + 6 browser; Phase 2: 8 model/reader + 17 browser/axe; all passed. |
| [#78, step 2](https://github.com/huzshk0707/Oaktown-ops/pull/78) | #72 `536ebcade697e5c7aa59e76e7e65f3c89535cdb1` | [Report/midnight reproduction/desktop action acceptance at 8d539be](https://github.com/huzshk0707/Oaktown-ops/blob/8d539be17de31a740f3bfe70d296f80d43eab9d9/docs/reviews/OPS-FOCUS-REVIEW-2.md). 8 model + 20 browser/axe + actual PostgreSQL action/concurrency suite passed. |
| [#79, step 3](https://github.com/huzshk0707/Oaktown-ops/pull/79) | #73 `676e8961a6cb552f6916c655d966a8150f2c3ede` | [Report/journal probe/desktop evidence at 309360a](https://github.com/huzshk0707/Oaktown-ops/blob/309360aa70c0c22224f3c0d1cf504b548ea887f6/docs/reviews/OPS-FOCUS-REVIEW-3.md). 17 Morning/SOD model + 19 browser + actual journal SQL test/probe passed. |

Each review has its own pushed handoff, released owner claim and repeatable
exact-export commands/helpers. Evidence includes real PostgreSQL in disposable
clones and fictional browser/API records; no operational production write was used.
All added acceptance images are desktop at 1280/1440/1920. Existing responsive/
security regression cases were retained; no new mobile component/gesture/suite.

Main-based review-branch completion CI is separate from the above feature-head
reruns: [#76 run 43785572342](https://github.com/huzshk0707/Oaktown-ops/actions/runs/43785572342),
[#78 run 43794289222](https://github.com/huzshk0707/Oaktown-ops/actions/runs/43794289222),
and [#79 run 43795489788](https://github.com/huzshk0707/Oaktown-ops/actions/runs/43795489788)
were verified success at their respective completion heads (185 unit / 198 browser,
plus schema, Deno/dependency and inventory checks). These runs do not merge or
exercise a newly integrated production stack. The final consolidation CI result
belongs to this PR's current head, recorded in its running log after completion.

[Head/check snapshot](focus-review-heads.json) preserves bounded observation
metadata; use live refs/PRs for later changes. Individual feature CI also remains
green at the exact reviewed heads: [Phase 1](https://github.com/huzshk0707/Oaktown-ops/actions/runs/43756605147),
[Phase 2](https://github.com/huzshk0707/Oaktown-ops/actions/runs/43760761164),
[Phase 3](https://github.com/huzshk0707/Oaktown-ops/actions/runs/43769556389),
[Phase 4](https://github.com/huzshk0707/Oaktown-ops/actions/runs/43779360227).
Phase 5 #75 at `712ec3d90f28652c686c3ad017906d70c3cd7248` is completed draft work
with [green CI](https://github.com/huzshk0707/Oaktown-ops/actions/runs/43782765247);
it was recognized, not reimplemented or represented as another independent audit.

## Bounded engineering follow-ups

| Priority / task | Reproduced behavior | Small correction / required regressions |
| --- | --- | --- |
| **P2 — OPS-FOCUS-READER-CURSOR** | With 1,002 fictional rows, deletion before the second offset page yields 1,001 unique returned IDs including a deleted row and omitting a current row. The duplicate-ID guard does not catch it. Shared reader is inherited by later phases. | Stage a separate shared-reader cursor/keyset fix, retaining account guards, legacy fallback and failure handling. Test deletion/insertion before/after page boundaries, >1,000 rows, duplicates, denied/superseded reads. Do not introduce a second task cache/client or claim keyset paging is a transactionally consistent snapshot. |
| **P2 — OPS-FOCUS-DEFER-ROLLOVER** | At Nov 15 23:59 Eastern, Nov 16 is valid; confirming at Nov 16 00:01 still saves Nov 16, violating new-Defer's after-today rule. Controller reuses the old plan after refresh. | Revalidate *new* deferrals after asynchronous preflight and before initial save; retain input and require a valid later date/review. Test midnight while review is open and during delayed refresh. Do not silently alter a chosen date, mutate an already-submitted payload, break identical uncertain-request replay, or globally prohibit historical dates in generic intake. |

Both remain **unclaimed/unfixed by this audit**; their source and runnable
reproductions are linked above. New work needs an accepted owner checkpoint and
its own branch/PR. Recommended staging baseline is the completed Phase 5 head,
with a child draft fix PR, so neither an existing feature PR nor Ravi's integration
branch is rewritten. Coordinate application to the eventual integration branch;
this recommendation is not permission to merge/cherry-pick/deploy that branch.

## Concrete owner decisions requested before rollout

These are decisions for the review record, not a request to enable credentials or
perform production actions now. No approval is inferred from an unanswered item.

| Decision | Recommended default / tradeoff | What remains gated |
| --- | --- | --- |
| Selected source retention | **References plus minimal explicitly reviewed excerpts**, rather than retaining entire message bodies by default. Agree permitted source content, staff audience and retention/recovery policy. Current generic journal includes active API viewer roles; do not assume editor-only readership. | Expanding real email/source persistence, private retained-message cleanup, exports containing original content. Do not delete existing records automatically. |
| Approval authority | Use a scoped submission + native staff approval + server receipt/attested-read contract for future ChatGPT-originated plans. Generic caller-written `approved` JSON alone must not be described as server-attested native review. A server receipt proves an authorized operation, not a physical human gesture. | Phase 6 integration acceptance and activation. Ravi's #77 already addresses this design; review its actual finished code/tests instead of duplicating it. |
| Multi-user plan semantics | Keep immutable versions and explicit source/version conflict warnings. Define how simultaneous approvals choose a current daily plan and whether a point-in-time source snapshot is required. Do not silently relabel a draft/current task state as the immutable approved text. | Claims of atomic multi-record plan/source approval or cross-user conflict resolution beyond the implemented contract. |
| Release scope/order | First review bounded fixes; then finished Phase 6 integration/rollback evidence and an exact release candidate. Keep the existing draft stack until task-specific merge/deploy direction. | Feature merge, schema application, production deployment, OAuth/client permission changes and any real test write. None is authorized merely by this summary being ready. |

Source retention/native approval are known architecture limits, not anonymous
access findings. Actual journal probes preserve server actor/time and deny
inactive/anonymous access. An authorized editor's malformed JSON acceptance must
not be confused with a viewer write bypass. Selected text is data, not instructions
for the application or tools.

## Integration / missing facts inventory

- **ChatGPT task tools:** existing scoped OAuth preview/apply/readback contract is
  source-backed; current owner installation, consent and a specific authorized
  operation still require evidence. Do not treat missing raw token variables as
  missing Git proxy access or borrow another account's credentials.
- **Approved-plan tools:** Ravi's #77 is staging stronger submit/review/read
  capabilities, default-off permission/consent gates and receipts. Its latest
  branch handoff/CI is authoritative for its unfinished point; do not deploy a WIP
  or assume old approvals have the new proof. No takeover was performed here.
- **Mailbox:** Oaktown Ops has no application mailbox/AI engine; ChatGPT-connected
  email access and staff website authentication remain separate. Source text is
  manual in Phase 4; Phase 5 makes saved operations primary, retaining manual
  planning as optional. No automated sending or fabricated intelligence feed.
- **Deposits:** no authoritative bank/ledger source is connected. Reported submitted,
  received, pending, failed and unresolved remain reports; verified credited is
  Not connected. Plan approval cannot verify payment or change a ledger.
- **Personal work:** task status/completion journal is not proof of Huzy's personal
  EOD contribution or Leslie's physical inspection. Actual performer/work-date
  contract remains a separate backlog task; never infer time spent or attribution.
- **Live rollout prerequisites:** exact authorized staff test plan, expected row/
  event effects and rollback/recovery, separately approved provider/schema/client
  changes and independent readback. Mocked CI and source presence do not prove
  live user permissions, OAuth activation, email delivery or financial receipt.

## Release-candidate acceptance checklist

- [ ] Apply both bounded fixes on independently claimed review branches and run
  shared-reader/model/browser regressions; preserve original due dates and statuses.
- [ ] Finish and independently validate #77 UI/attested reader/native-consent
  wiring, role/session/client revocation, retry/concurrency and guarded rollback.
- [ ] Record source-retention/audience and concurrent-plan decisions explicitly.
- [ ] Verify exact integrated commit, full Node/browser/SQL/Deno/audit checks,
  desktop evidence, stale/denied/session isolation and unchanged existing workflows.
- [ ] Obtain task-specific production/merge/deploy/activation directions before
  those actions; plan a fictional authorized smoke operation and readback separately.

Unchecked items are not review work silently omitted; they are concrete follow-ups
or externally gated activation facts. Review Phases 1–4 are complete. No source
fix, production mutation, merge or deployment is part of this consolidation.

## Exact next task

**OPS-FOCUS-READER-CURSOR** is the next small independent engineering task if
assigned: recheck live ownership/refs; branch from completed Phase 5 `712ec3d` on
`hp/focus-reader-cursor`; normal-push an ownership checkpoint and immediate draft
PR targeting `feature/focus-board-phase-5`; implement the bounded reader change
and deletion-boundary regressions only. Do not modify existing feature PRs or
Ravi's branch. The Defer correction is the following separately claimable task.
