# Technical audit follow-up — November 4, 2026

Reviewed baseline: main `a97e8923bf087d3253aa26dd024af33ab0f20532`, after merging
PR #40. The user authorized improvements based on the supplied audit, merging #40,
and retiring superseded #23. This record distinguishes source code, live read-only
evidence, disposable-database verification and outstanding production controls.

## PR and release baseline

- PR #40 is merged: the full condition sheet remains present and unused areas print N/A.
  Its CI passed before merge, and the merged main check also passed.
- PR #23 was reviewed and closed as superseded. It changes documentation only.
  Its branch/history are retained. Its useful distinctions between mocked tests,
  live checks and recovery evidence are carried forward here; its old status snapshot
  is not the current roadmap.
- GitHub reports the repository **private** and `has_pages: false`. The README's old
  GitHub Pages address needs the owner's confirmation or replacement. Current hosting
  availability is not certified: the deployed-address request returned HTTP 403 from
  this execution environment. No repository-visibility or hosting settings were changed.

## Findings verified against current code/data

| Audit feedback | Current evidence | Disposition |
| --- | --- | --- |
| Renewal/task links can be inconsistent | Separate foreign keys exist; direct writes can bypass Today RPC checks | First hardening migration staged below |
| Portfolio import is incomplete/empty | Live counts: 112 properties, 124 units, 110 tenancies, 114 leases, 118 renewals, 2 tasks, 633 source links | The portfolio was imported; repeatable dry-run/reconciliation tooling still needs work |
| Existing records may have mismatched contexts | All 13 aggregate preflight checks returned zero violations | Preserve existing rows; add future-write protections |
| Source-link targets are not enforced | All 633 existing target references resolve; no polymorphic target FK exists | Target-validation and immutable provenance remain follow-up work |
| Caller-controlled journal attribution | Clients can insert actor/timestamp fields; no stamping trigger exists live | Server attribution staged below |
| Task lookup performance | `archived_by` FK has no supporting live index | Index included in the staged migration |
| Separate renewal preparation/tracking | Already implemented, with a separate new-lease tab too | Preserve existing workflows |
| Property list/detail navigation | Already implemented for desktop and small screens | Preserve; refine only for concrete usability findings |
| Large buildless app files | HTML/CSS/JavaScript modules and layered styles remain | Gradual boundaries/shared utilities; no framework rewrite in this batch |
| Backup/recovery readiness | No full production restoration exercise was performed in this review | Still an operational priority; schema rollback is narrower evidence |

`supabase/verification/portfolio-integrity-preflight.sql` is the repeatable read-only,
aggregate-only query. It checks direct record relationships, task-to-renewal context
and supported source target types/existence. Zero counts establish those checks only;
they do not certify lease execution, tenant identity, current balances or source accuracy.

## First hardening batch — STAGED, not applied to production

Migration: `20261104114559_portfolio_record_links_and_event_attribution.sql`.

1. Eight composite foreign keys enforce matching property/unit, tenancy/unit,
   lease/unit and lease/tenancy pairs on renewal cases and tasks. Linked tenancy/lease
   references require explicit unit context. Property-only renewals and general tasks
   remain supported. Nullable, genuinely unknown tenancy fields stay nullable.
2. Matching indexes support these lookups; an archive-actor index covers the existing
   missing lookup. PostgreSQL also protects against parent-row changes invalidating
   the referenced relationships.
3. New authenticated journal entries derive their actor from `auth.uid()` and their
   receipt timestamp from the server. Reported work dates stay in event metadata.
   Trusted administrator imports without a user identity retain their supplied history.
   Existing entries are not rewritten; this is still a staff journal, not a complete
   automatic audit trail of all database changes.
4. The Today editor clears a stale tenancy when an operator selects a different lease
   within the same unit. It does not assign another tenant automatically.
5. The migration and rollback check the expected Today RPC body fingerprint and stop
   if a newer definition is present. Changes are transactional with short lock/time limits.

The matching file in `supabase/rollback/` restores the previous constraints/index/RPC
behavior without deleting business records. A rollback removes these new protections;
use it as a controlled recovery action, not routine application behavior.

### Verification completed for this batch

- 127 Node tests passed on the reviewed source baseline.
- The complete 16-stage SQL workflow passed in disposable PostgreSQL 16, including
  the historical role matrix and existing intake/Today/archive/reference-library tests.
- New checks reject mismatched inserts and updates, same-unit wrong-tenancy links,
  invalid parent moves, forged actor IDs and backdated receipt timestamps.
- Property-only renewals, general tasks, nullable tenancy contexts, normal status
  updates and the reviewed Today lease-switch flow passed.
- Migration and rollback preserved every existing fictional business row and original
  relationship constraint; rollback restored the previous RPC definition exactly.
- A separate cloned disposable database proved that existing inconsistent data causes
  an atomic rejection, retaining the source row and old RPC without partial schema changes.
  An unexpected RPC revision was also rejected without being overwritten.
- Live Supabase inspection/preflight was read-only. No production row, grant, schema
  or authentication setting was changed by this hardening batch.

The CI workflow now replays the previously omitted whole-property-renewal migration
and runs the existing task RPC regressions against the hardened schema.

## Rollout and remaining controls

Before applying the staged migration, re-run the preflight with authorized access
and check the Today RPC fingerprint against the reviewed baseline. Investigate any
nonzero relevant result; do not auto-reassign tenants or rewrite imported history.
Record deployment/recovery readiness, apply the single transaction, then verify its
validated constraints, RLS/grants, role behavior and normal operational RPCs. CI does
not apply production migrations. The Supabase changelog HTTP request was blocked
in this environment; current RLS/column-privilege documentation was checked through MCP.

Still unresolved:

- Task-to-renewal scope consistency across all nullable/property-level combinations.
  The new direct-record foreign keys do not fully enforce that separate relationship.
- Immutable source IDs/provenance and supported polymorphic target enforcement,
  including protection when a target is changed/deleted and on repeated portfolio imports.
- A tested portfolio dry-run importer with source fingerprints, idempotency and conflict review.
- Production backup retention, recovery scope and an end-to-end restore into an isolated
  destination, covering the database and the external document references/files.
- Intended website hosting, current deployed assets and real staff browser/write/recovery checks.
- Supabase's existing [leaked-password-protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
  The existing archive-deletion SECURITY DEFINER warning needs contextual review; its
  staff/permission/dependency checks already have regression coverage. Private intake-ledger
  no-policy informational findings must be evaluated with their RPC/grant design, not
  resolved by granting broad table access. No Auth setting was changed here.

Full ten-page new-lease export, deposit rules, page 7 handling and final PDF matching
remain separate unfinished product work. Maintenance, financial operations and wider
integrations are later modules; completed UI work should be preserved while hardening proceeds.
