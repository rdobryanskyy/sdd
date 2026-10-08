# Escalation — when RED won't go GREEN

A test that stays red after a usual GREEN try is a signal. It is not a small problem. Do the steps of this ladder in sequence. Never skip the ladder with a weaker test.

## The ladder (in order)

1. **Try again**, up to `max_red_retries` times. Read the failing line, the task `acs` and the applicable `data-model` / `openapi` / `adr` again. Frequently, the GREEN step missed a detail that the contract already specifies.
2. **More-capable model.** If the retries do not help, dispatch the GREEN step again on a stronger model. Increase `model_implementer` for this task. A difficult task sometimes needs more capability.
3. **Split the task.** The task can contain two concerns, for example a validation rule *and* an audit write. If so, split it into two tasks with a dep edge. Do a separate RED for each task. Update `tasks.json` and `tracker.md`, so that the DAG stays the source of truth.
4. **Ask a human — the test can encode a wrong AC.** The code can be correct while the *test* asserts something that the AC does not really require. Or the AC itself can be wrong. In these cases, STOP and ask. Show the failing line, the AC text and why they conflict. **Never** edit the test to make it less strict so that a wrong AC passes. A correction to the AC is a `specify`/`clarify` change, with the human in the loop.
5. **Roll back to the last green.** If no step above solves the problem, revert the working changes of this task to the last green commit. The tree must never stay broken.

## `stop_on_red` decides what happens to the rest

After the task completes the ladder with no success:

- **`stop_on_red: true`** (default) → stop the run. Report the blocked task, the failing line and the ladder step where it stopped. Do not commit work that is not complete.
- **`stop_on_red: false`** → drop this task. **Block its transitive dependents automatically** (their deps will never complete). Continue the independent branches. The final summary lists each dropped and blocked task with the reason.

## Never

- **Never make a test weaker** to get green. The test is the spec in executable form. If the test is wrong, a human must decide (step 4).
- **Never commit a red or a skipped hard-gate** as "done". Label a NON-red integration tier. Do not hide it.
- **Never leave the tree broken.** The rollback (step 5) is the minimum.
