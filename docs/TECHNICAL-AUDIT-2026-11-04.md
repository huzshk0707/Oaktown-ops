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

## First hardening batch — original staging review

Migration: `20261104220620_portfolio_record_links_and_event_attribution.sql`.

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

## Second-audit follow-up: recovery and rollout readiness

PR #41 was reviewed with successful CI and no outstanding review threads, then merged
as `d21f5bf27fcf21cf16abbd2abb61b32ff8cafcb3` on November 4.

An application-data snapshot captured at 21:59:47 UTC was restored into an isolated,
network-disabled PostgreSQL 17 database. All 24 application tables (including the
three private intake tables), 1,678 rows and 37 foreign keys restored successfully.
Every table's ordered JSONB SHA-256 and count matched. Functions, indexes, triggers,
policies and table grants were included. Auth references used UUID-only stubs: this
does **not** restore Supabase Auth credentials, provider settings or platform secrets.

All ten original PDFs were downloaded from Drive and matched their original SHA-256
and byte counts. A 17,696,652-byte recovery ZIP containing the snapshot, restore script,
reports, document manifest and PDFs was uploaded to the restricted Recovery snapshots
folder. Its downloaded copy matched SHA-256
`f0a5d2cb44af96afc6e9d49946df2cbc09e4bc7d6b06a632283632795df97825`;
all 14 ZIP entries passed integrity checks. Folder and archive permissions were owner-only.
Private artifacts remain outside this repository. This is one verified snapshot;
scheduled retention and complete Supabase Auth/platform recovery remain outstanding.

The reviewed migration and rollback both ran against the restored production application
records. All 24 table checksums remained identical after each operation. A fresh live
preflight returned zero violations across all 13 checks; the Today RPC fingerprint was
the expected `e054aa9fb661941391c1b39d59aab22d`. Expected rollout effects are the eight
validated relationship guards, server journal attribution, nine indexes and the reviewed
RPC replacement, with no business-row rewrites. The matching rollback remains the
recovery path if these verified changes need to be reverted; the private snapshot is
additional application-data/document recovery evidence, not a replacement for platform backups.


### Production rollout — applied and inspected

The hardening migration was applied through Supabase as observed version
`20261104220620` on November 4. The source and rollback filenames now match that
registered version; the SQL body is unchanged from the reviewed PR #41.
Post-rollout inspection confirmed eight validated composite foreign keys, nine
lookup indexes, the enabled attribution trigger and hardened RPC fingerprint
`0f6c12ce503799811c944b1fc3e2e55d`. Authenticated RPC access remains enabled and
anonymous access denied; all application tables retain RLS. The 13 aggregate
preflight counts remain zero with unchanged portfolio counts. Security advisories
are unchanged from the baseline described above. No tenant record was edited to
make the migration pass, and no real staff browser/write session was exercised.

The original staging notes above describe the review baseline, not the current
live migration status. Hosting and real browser validation remain unverified.

## Connected experience increment

Implemented on the feature branch: Ctrl/Cmd+K search and quick actions, an on-demand
Today Action Centre, saved preset filters, compact density, exact property/unit/lease/
person profiles, recorded rent schedules, a source-linked activity timeline and the
existing reference-catalog browser. See `CONNECTED-WORKSPACE.md` for behavior and
limits. No guessed deadlines, current occupants, document associations, approvals,
work orders, signing or delivery events are added. Maintenance remains task-based;
lead/application integrations and a versioned document-management module remain later work.

Private records are held in memory behind the existing verified staff session/RLS.
The connected reader pages API results and rejects silent truncation. Core failures
clear connected results; optional failures are labeled. Sign-out/account change and
late replies are covered; unapproved viewer sign-in still fails at the shared boundary.
Existing task/renewal adapters open the reviewed source workflows, including a
read-only fallback if the renewal tracker fails. No new database schema was needed.

Validation: 131 Node tests passed; the full 16-stage SQL chain and atomic rejection/
RPC-fingerprint regressions passed in disposable PostgreSQL 17. The original complete
browser pass exposed a signed-out palette bug (fixed), an outdated mock missing the two
new read collections (updated), and a running-clock timing assumption (frozen before
navigation). All affected checks were rerun successfully; final CI verifies the whole
suite on the published commit. Fictional visual review covered Today, search and profiles;
connected mobile checks covered all six themes at 320px. The search dialog's axe scan
reported zero violations. Real staff browser/write/printing and hosting remain separate
unverified controls, not substitutes for these mocked checks.


## November 9 UI/UX refinement

PRs #50 and #51 were reviewed and merged in order, with the second PR retargeted
to main. Two SOD task-selection control defects were fixed before #51 was merged;
its exact final head passed unit/syntax, schema and browser CI. The follow-up
interface work is recorded in [UI/UX refinement](UI-UX-REFINEMENT.md). It retains
the shared staff session and read/write boundaries and adds no production data
operation. Mocked browser checks are not a live staff permission certification.
