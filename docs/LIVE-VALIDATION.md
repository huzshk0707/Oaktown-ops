# Oaktown Ops: live validation record and checklist

Recorded November 1, 2026 (Asia/Kolkata), against local main `f8f3ab5`. This record distinguishes local mocked tests from production evidence. Keep tenant identities, credentials, document contents and raw production responses out of this public repository.

## Current evidence

| Check | Result | What it establishes |
| --- | --- | --- |
| Local Node suite | 62 passed, 0 failed | Calculation and workflow logic with repository fixtures |
| Local Chromium suite | 42 passed, 0 failed or skipped | Fictional API behavior only |
| Read current Git main and PR #19 head | Passed | Main baseline and superseded PR comparison available |
| GitHub API | Passed after user network change | #19 closed as superseded, not merged; no open PRs before the documentation update |
| Deployed signed-out Chromium navigation | Passed at 320/768/1024/1440px, including both lease tabs; 0 uncaught page errors | Public UI smoke check; no staff session |
| Deployed Pages/assets | Passed: 31 HTML/JS/CSS/master-image assets matched main byte for byte | Checked deployment content matches the baseline |
| Supabase public auth-settings GET | HTTP 200 | Public endpoint reachable; admin settings were not audited |
| Anonymous protected-table GETs | All 13 requests returned HTTP 401 | Tested public key without a staff session; no data exposed by these requests |
| Staff session | Unavailable: no configured Supabase staff binding/session | Authenticated live data and role checks unrun |
| Latest main CI | checks, browser-downloads and portfolio-schema all succeeded | [Run 41227916262](https://github.com/huzshk0707/Oaktown-ops/actions/runs/41227916262); schema evidence from disposable CI, not production |
| Pages deployment CI | Succeeded | [Run 41227915854](https://github.com/huzshk0707/Oaktown-ops/actions/runs/41227915854) |

Initial proxy HTTP 403 denials were resolved by the user's network-settings change. An agent draft update conflicted and was not saved or retried over that change. Required destinations: `api.github.com`, `huzshk0707.github.io`, `wjdzaexhhjsjtdgxivyw.supabase.co`. Access now works for these destinations. Do not disable TLS or replace platform authentication. Staff access must use the normal approved sign-in path; never put passwords, tokens or tenant data in GitHub or chat.

Anonymous GETs covered `properties`, `property_addressees`, `units`, `people`, `tenancies`, `tenancy_people`, `leases`, `rent_schedules`, `renewal_cases`, `ops_tasks`, `ops_events`, `staff_memberships`, and `notice_batches`, using `select=*&limit=1`. This establishes rejection of these requests, not comprehensive RLS/grant coverage or authorized-role behavior.

## Remaining live checks and repeatable procedure

Record date, deployed revision/asset versions, role, expected/observed outcome and a non-sensitive evidence reference for each check. Mark blocked, failed and passed separately. An open port, login screen, empty result or mocked test alone is not proof of production correctness.

1. **Deployment:** fetch the deployed root and referenced JS/CSS/master images; compare content with main. Verify Notices, Properties and both Renewals tabs load with no unexpected console/network errors at 320, 768, 1024 and 1440px.
2. **Access boundaries:** anonymously request protected tables using only the public client key; verify no protected rows are exposed. Check an approved editor/admin can read expected records and that inactive/unapproved staff cannot. Inspect access behavior directly, not just hidden UI controls. Do not copy live response data into logs or public artifacts.
3. **Read-only staff workflow:** verify property/unit identity, current versus historical leases, renewal selection, tab-state preservation and sign-out clearing protected details. Compare displayed terms and counts with an authorized source. Previously documented import counts are not current expected live counts.
4. **Local drafts/downloads:** with fictional inputs on a clean browser, verify readiness errors, statement totals, notice/ZIP/Firm Book downloads and five-page unsigned renewal PDF. Confirm Notice drafts stay local and generated renewal PDFs are not uploaded. Clear fictional browser data afterward.
5. **Writes and recovery (separate controlled pass):** use a designated test record/account approved by the owner. Check a confirmed renewal update appends one correctly linked event, history survives reload, and a permitted legacy address edit affects only its intended record. Test password-reset delivery and the configured redirect only with the designated account. These actions change records or send email; this read-only reconciliation did not perform them.
6. **Operational controls:** authorized Supabase administration must verify leaked-password protection, recovery redirects, grants/RLS for the intended role matrix, context consistency across cases/tasks, trusted attribution and provenance restrictions. Inspect current state before proposing migrations.
7. **Restore evidence:** verify a backup restoration in a disposable destination, record recovery scope/time and reconcile record relationships. Do not restore over production or rerun historical migrations.

## Exit criteria

Operational validation is complete only after required live checks pass and remaining defects have an explicit disposition. Any blocked check stays pending. New modules, automatic messages, signing, production migrations and financial/legal automation are outside this reconciliation.
