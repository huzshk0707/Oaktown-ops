# PR #6 review — Lead Copilot v0.5.1

Compared with v0.4 main e808600a5a8a7f95ece2b6b7b2d476f821d48e25.

## Corrected issues

- Prevented delayed lead saves from rebinding another visible lead. Writes lock record controls and check account/form identity before applying results.
- Cleared conversation history when creating/opening a record and ignored stale responses after record changes or logout.
- Preserved staff-edited reply text across unrelated field changes. Regeneration and discarding unsaved lead work require confirmation.
- Bumped the changed shell script cache URL so cached v0.4 navigation cannot hide the new workflow.
- Replaced automatic ID/viewing progression with a human-review handoff. Historical opening remains a reference; active output is marked TEST DRAFT and is not approved for applicant use.
- Tightened financial parsing: ambiguous, negative, compound and malformed amounts are not treated as a reliable monthly amount; pay period survives extraction. Full-rent illustration is suppressed for disclosed or unknown voucher status. Partial confirmed answers still require clarification.
- Disabled all lead/message endpoints in the shipped build. Existing Supabase property reads and v0.4 workflows continue using the shared account.
- Reset saved availability/rent verification on opening a lead. A saved screening snapshot is not a current listing authority.

## Architecture and verification

Lead rules remain a deterministic pure module. Lead UI/styles are separate from the notice generator and property editor. All browser tests block or mock remote calls; future cloud paths are enabled only by a local test-response replacement, with no production runtime switch.

GitHub Actions runs every JavaScript unit/integration test and every Chromium Playwright test. A disposable PostgreSQL 16 database tests the staged schema's deny-by-default guard, RLS, active admin/editor writes, viewer read-only access, inactive/unapproved denial, creator/identity immutability, stale-write rejection and delete denial. It contains only fictional fixtures and has no live Supabase credentials.

## Deployment boundary

No live database changes are made by this PR or its tests. The staged SQL refuses default execution before DDL. Its isolated-CI marker is not a production rollout mechanism.

Read-only schema inspection found public.units and other Portfolio Master table structures, but no populated new unit inventory or authoritative listing/asking-rent contract. Complete the separate master reconciliation first, preserve existing property UUIDs and v0.4 APIs, then produce a reviewed replacement lead migration with stable unit/listing references. Repeat the role matrix in a Supabase staging environment and run advisors before any production database application.

Lead persistence and applicant-facing screening/template usage each require explicit approval after those dependencies. Existing Notices, Properties and court workflows remain operational. Current test drafts are memory-only and do not survive reload.
