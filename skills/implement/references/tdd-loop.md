# TDD loop — the per-task cycle (step 8)

Each task runs `SELECT → RED → GREEN → REFACTOR → GATE → COMMIT`. The cycle is the same for all runners: the sequential agent, a team `implementer` or a Workflow stage. The RED step is the most important step. If you do not obey its rules, the method becomes "write code, then write a test that passes by accident".

## SELECT

Select the next task whose `deps` are all `done`. In sequential mode, this is the topo order. In parallel modes, the orchestrator gives out the tasks. Read the task body, its `acs` from `spec.md §5` and the applicable `test-plan.md` rows. Before you write, know the observable result that the test will assert.

## RED — write the failing test first

1. Write the tests for the `acs` of this task **before you write production code**. Put them where the repo keeps tests for that layer. Detect this location. Do not assume it.
2. Run the unit command. Record the output.
3. **Classify the first run.** This step is mandatory. State the class in your output:

   | Class | What it looks like | Action |
   |---|---|---|
   | **GOOD red** | The test compiles and runs. It fails on an assertion or on «not implemented». | Go to GREEN. |
   | **BAD red** | The test itself does not compile, has import errors or uses a wrong symbol. | The test is broken, not the code. **Fix the test**, run it again and classify again. |
   | **false-pass** | The test is green on the first run, before production code exists. | The test is too weak (it asserts nothing real). **Make it stronger** until it is GOOD red. |
   | **NON-red** | The test is skipped because its dependency is not available (for example, Docker is absent for an integration test). | It is not a pass and not a fail. Record NON-red. `require_integration` controls it. |

4. **Quote the failing line** before you write production code. This is the assertion with expected and actual values, or the «undefined: X» line. The quote is the proof that the test examines the correct thing.

A task can have only a NON-red integration test and no unit coverage. Local TDD cannot control such a task. Write the unit-level RED too. Let the integration RED occur in CI (the proving-run pattern).

## GREEN — minimal code to pass

Write the **least** code that makes the quoted failing assertion green. Do not add speculative general code. Do not make unrelated edits. Do not change files outside the `files_hint` of the task. Run the unit command again. Make sure that the quoted failure is now green and that nothing else is broken.

## REFACTOR — clean while staying green

Make the names clear, extract helpers and remove duplication. Run the unit command again after each change. If a refactor makes a test red and the fix is not simple, **revert the refactor**. The job of the task is GREEN, not the cleanup.

## GATE — the task isn't done until this is clean

Run these checks with the detected commands and the settings:

- **unit** — must be green.
- **integration** — green if available. If Docker is absent and `require_integration: auto`, record NON-red. For `always`, the BLOCK already occurred before dispatch.
- **lint** (if `gate_lint` and a linter was found) — clean.
- **vet/typecheck** (if `gate_vet` and a command was found) — clean.

A hard-gate failure means that the task is not done. A hard-gate failure is: unit red, integration red when it ran, or lint/vet errors. Fix the problem, or escalate (see [`escalation.md`](./escalation.md)).

## COMMIT — task-scoped, traceable

When `auto_commit: per_task`, commit only the files of this task, with a message like this:

```
<type>(<slug>): <task title>

<one-line what + why>

SDD-Task: T3
SDD-AC: AC-02
SDD-AC: AC-04
```

Add one `SDD-AC` trailer for each AC that the task satisfied. The `SDD-Task` trailer connects the commit to `tasks.json`. Then mark the task `done` in `tracker.md`. With `per_phase`, one commit contains all tasks of a phase. With `off`, the user makes the commits, but the engine still updates the tracker.

**Compile-coupled lane exception.** A compile-coupled lane is a shared-contract change and its implementers. `tasks` marks the lane with the shared contract file in `files_hint`. The tasks of such a lane cannot each have a green commit alone, because the contract change breaks each implementer at compile time. Thus, they use **one shared GATE and one commit**:

- The commit has an `SDD-Task` trailer **for each task** and all their `SDD-AC` trailers together.
- The body names the coupling (for example, «compile-coupled: T3 interface change + T4 implementation»).
- This is a permitted exception to task-scoped commits. It does not permit you to put unrelated tasks in one commit.

In parallel modes, the **lead makes the commits one at a time, in dependency order**, although the work occurred at the same time. Thus, the history stays linear and bisectable.
