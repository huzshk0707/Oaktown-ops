# Task — shared task pagination correction

- [x] Independent Focus Board reviews complete: [#80](https://github.com/huzshk0707/Oaktown-ops/pull/80), linked #76/#78/#79.
- [ ] **OPS-FOCUS-READER-CURSOR** — hp claim/heartbeat in HANDOFF; implement/test only the bounded cursor correction on this child branch.
- [ ] **OPS-FOCUS-DEFER-ROLLOVER** — next separate unclaimed task; do not change it in this reader increment.
- [ ] Owner retention/native-approval/rollout decisions — remain explicit in #80; Ravi's #77 is independent staging work, not permission for activation.

Canonical broader backlog/rules remain on main; this older feature base gained a
per-task handoff/index without merging unrelated branches. Preserve feature draft,
real-data and no-merge/deploy instructions. Release the claim and record exact
next task when the implementation/validation checkpoint is pushed.
