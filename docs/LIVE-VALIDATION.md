# Live validation and recovery checklist

Current evidence and limits are recorded in the [November 4 audit](TECHNICAL-AUDIT-2026-11-04.md).
The earlier #23 branch contains a dated historical validation record; closing that PR
preserved its evidence but did not certify today's deployed site or operational controls.

Record date, revision, role, expected/observed result and a non-sensitive evidence
reference for each check. Keep failed, blocked and passed separate. Do not put raw
tenant records, passwords, tokens, signed documents or private response bodies in logs.

1. **Hosting/deployment:** confirm the intended live URL and its access model while
   preserving repository privacy. Compare deployed asset versions with the approved
   main commit. GitHub currently reports Pages disabled; current website availability
   is not established by a passing source-code CI run.
2. **Access boundaries:** verify anonymous denial, approved staff access and inactive/
   unapproved account isolation directly at the API, as well as sign-out clearing in
   the browser. Distinguish a real staff session from mocked browser fixtures.
3. **Normal workflows:** check Today, task editing, property/unit identity, current
   versus historical leases, renewal progress and separate preparation tabs. Compare
   against authorized sources without treating imported fields as verified facts.
4. **Documents:** use fictional inputs for notice/ZIP/Firm Book and five-page renewal
   downloads, plus full-template page 8 previews. Verify dimensions, long-field
   handling, actual printing and blank signatures. New ten-page lease export remains disabled.
5. **Controlled writes/recovery:** use a designated test record and account within
   the user's authorized scope. Check optimistic conflicts, correctly linked journal
   entries and password-recovery configuration. Do not send test emails or change
   a real tenancy's operational status as a side effect of a read-only audit.
6. **Staged migration rollout:** run the aggregate preflight, check the reviewed RPC
   version, record backup/recovery readiness and the tested schema rollback, apply
   the intended new transaction, then recheck constraints, roles and real RPC behavior.
   Do not reapply old migrations or silently reconcile mismatched source relationships.
7. **End-to-end restoration:** verify backup ownership, scheduling/retention, recovery
   scope and secure access. Restore into a separate disposable destination, then
   reconcile counts, record relationships, provenance, roles and external document
   references. Record recovery time and missing coverage. Never restore over production
   as a test. A PDF archive, local draft export or schema rollback proves only its own scope.
