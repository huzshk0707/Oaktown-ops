# Release tags and branch cleanup

Huzy requested merged-branch cleanup and release tags starting at the current
head `b829f73422ba87f0a7fc3a0ec60d21e45c7441c0` on November 11, 2026.

## Starting release

The annotated tag **[v0.5.0](https://github.com/huzshk0707/Oaktown-ops/tree/v0.5.0)**
points to that exact commit, which merged PR #67. This begins release tagging
after the historical v0.4 release notes; older versions are not backfilled.

That source passed 184 Node tests, 194 browser tests, dependency/Deno checks and
disposable portfolio/security checks. Its Pages publication was
[#42965211267](https://github.com/huzshk0707/Oaktown-ops/actions/runs/42965211267).
The [workflow-state review](WORKFLOW-STATES.md) records scope and remaining limits.
Source tags preserve the release snapshot; database/application activity has its
own separate evidence and authorization.

## Every release going forward

1. Merge the reviewed PR. Record the exact resulting commit on `main`.
2. Confirm CI passes and Pages publishes **that same commit**. Do not infer
   publication from source merge or from a passing run for a different SHA.
3. Inspect remote tags and select the next unused `vMAJOR.MINOR.PATCH`. Default
   to a patch increment within the current release line; choose a minor or major
   version when the release scope deliberately calls for it.
4. Create an **annotated** tag targeting the explicit verified commit. Include
   the release scope, PRs, validation/deployment evidence and material remaining
   limitations. Tags are permanent; do not move, overwrite or delete them.
5. Push only the intended tag, requiring that its remote ref does not already
   exist. Independently read the remote annotated-tag object and its peeled
   commit, and compare both with the local tag and intended release SHA.
6. Include the tag/link in the handoff. Clean the merged feature branch after
   checking its current tip, open PRs and documentation references.

Example commands after verifying the chosen release SHA and next tag:

```sh
git fetch origin main --tags
git ls-remote --tags origin
# Set release_sha to the exact CI-verified and Pages-published commit.
# Set release_tag to the next unused version, for example v0.5.1.
git tag -a "$release_tag" "$release_sha" -F release-notes.txt
git push --force-with-lease="refs/tags/$release_tag:" origin "refs/tags/$release_tag:refs/tags/$release_tag"
git ls-remote --tags origin "refs/tags/$release_tag*"
```

The empty expected value in this tag lease requires that the remote tag does
not exist. It is a create-only condition, not permission to overwrite a tag.
The remote `^{}` line must equal the intended release commit.

## Branch cleanup rules

- Preserve `main`, protected/default branches, branches with open PRs, unmerged
  current tips and historical `release/*` references.
- Check tracked documentation for literal and URL-encoded `design/*` citations.
  Keep a cited design reference until its documentation has been deliberately
  updated to another durable source.
- A branch is safely merged when its tip is reachable from main, or a merged
  PR has that **exact current tip** and its merge commit is reachable from main.
  The latter supports squash/rebase merges; a branch updated after its PR merged
  must be re-evaluated rather than deleted automatically.
- Capture reviewed names/SHAs and a recoverable local bundle before a bulk
  cleanup. Use an atomic push with a lease for each exact reviewed branch tip.
  A moved branch causes the transaction to fail for review.
- Read back remote refs after deletion. Prune stale tracking refs and remove
  exact fetch entries for deleted branches while preserving other settings.
  Local branches checked out in another worktree or containing unmerged work
  remain available; branch cleanup does not remove their files.

The initial cleanup removed **65 merged remote branches**. No `design/*` branch
name was still cited in tracked Ops or Brain documentation, so merged design
branches were eligible. Five unmerged branches, `main` and `release/v03-main`
were retained. Remote reads verified both the retained refs and baseline tag.
