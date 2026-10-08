# Rubric — tasks applies the contract-task rule (no standalone interface-only task)

The fixture contains these items:

- `spec.md` + `sad.md` + one Accepted ADR (+ `.size` = S, `.route` = quick) for `batch-notify`.
  These are all the inputs that the tasks gate requires.
- A Go module. In this module, the shared `Notifier` interface in `internal/notify/notifier.go`
  has **two** existing implementations (`email.go`, `sms.go`). A compile-time
  `var _ Notifier = (*Impl)(nil)` assertion pins each implementation.

The feature extends `Notifier` with `SendBatch` (sad §5, ADR 0001). Thus a task that changes
**only** the interface file can never be committed green, because the assertions break both
implementers. PASS requires ALL of:

1. `docs/features/batch-notify/tasks.json` exists. It is valid JSON that agrees with the
   contract of the skill:
   - each task has `id`, `title`, `layer`, `deps`, `acs`, `dod`, `files_hint`;
   - `deps` reference only ids that are in the file, and they make an acyclic graph;
   - each spec §5 AC (AC-01 and AC-02) is in the `acs` of one or more tasks.
2. **Key check — no standalone contract task.** There is NO task whose `files_hint` touches
   ONLY `internal/notify/notifier.go` while no other task lists `internal/notify/notifier.go`
   in its `files_hint`. Both resolutions that the skill allows are a PASS:
   (a) **fold** — the interface change is inside an implementation task. The `files_hint` of
   that task contains `notifier.go` TOGETHER with other files (for example, `email.go` / `sms.go`); or
   (b) **compile-coupled lane** — a separate contract task exists, but `notifier.go` is
   in the `files_hint` of at least 2 tasks (the shared contract file marks the lane).
3. `docs/features/batch-notify/tasks/_epic.md`, `tasks/tracker.md`, and one `tasks/<task>.md`
   for each task all exist.
4. The tail of the final message of the run contains the stage-handoff block (*What I did* /
   *Review* / *Run next*).

FAIL on these results:

- An interface-only task exists, and no second task has `notifier.go` in its `files_hint`.
- `tasks.json` is missing or not valid.
- The run refused. The fixture contains each gate artifact (spec.md + sad.md + Accepted ADR).
  Thus a refusal means that the run read a complete fixture incorrectly.
