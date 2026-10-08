---
name: implement
model: inherit
effort: medium
agents: [test-author, implementer, reviewer]
description: >
  Use to implement a feature from its tasks.json with test-driven development. For each task, it
  writes a failing test first, makes the test pass, refactors, runs the gate and commits. Triggers
  on "implement {slug}", "build {slug}", "TDD {slug}", "code up the tasks for {slug}",
  "/sdd:implement {slug}", "implement {slug}", "implement feature {slug}", "write code from the tasks".
  Reads docs/features/{slug}/tasks.json and the upstream artifacts. Detects the test, lint and vet
  commands of the repo for each stack. Builds a dependency DAG and runs one of three modes:
  sequential single-agent TDD, an agent team (TeamCreate) or a dynamic Workflow. The settings and
  the DAG shape select the mode, with a safe fallback. Hard-refuses if tasks.json is missing.
---

# Skill: implement

This skill is the implementation engine. It changes `tasks.json` into committed, tested code. Each task goes through a strict TDD cycle: `SELECT → RED → GREEN → REFACTOR → GATE → COMMIT`.

The engine runs this cycle in one of three modes: sequential, agent-team or dynamic-workflow. A clear decision tree selects the mode. All steps are stack-agnostic. The engine **detects** the test, lint and vet commands. It never hard-codes them.

This file is the spine. Each step sends you to a file in `references/`.

## Owner

The Tech Lead controls the run. The engine runs the cycle. The plugin ships three subagents:

- [`test-author`](../../agents/test-author.md) (RED).
- [`implementer`](../../agents/implementer.md) (GREEN/REFACTOR/GATE).
- [`reviewer`](../../agents/reviewer.md) (read-only review).

Each dispatch prompt tells the subagent to write its report, code comments and commit messages in ASD-STE100.

## Inputs

- `<slug>` — the feature slug.
- **Gate (hard refuse):** `docs/features/<slug>/tasks.json`. If it is missing, say «run `tasks <slug>` first».
- Read these files for context. The agents read them directly, not through a paraphrase:
  - `spec.md` (AC).
  - `data-model.md` and the **staged** migrations under `docs/features/<slug>/migrations/`. A `layer: migration` task **promotes** these into the live `migrations/` tree → [`./references/inputs.md`](./references/inputs.md).
  - `contracts/openapi.yaml`, `test-plan.md`, `sad.md` and the Accepted `adr/`.
- Settings: `.claude/sdd.local.md` → [`./references/settings.md`](./references/settings.md). If the file is absent, a skill creates it with the documented defaults. Usually `specify` creates it at the start of the backbone. If you start directly with `implement`, `implement` creates it.

## Protocol

1. **Preconditions.** Make sure that `tasks.json` exists and parses. Load the list of upstream artifacts. Details → [`./references/inputs.md`](./references/inputs.md).
2. **Settings.** Read `.claude/sdd.local.md` → [`./references/settings.md`](./references/settings.md).
   - If the file is absent, create it with the documented defaults. Write the frontmatter and the «What each key does» body, so that the file documents itself.
   - Patch `.gitignore` with `.claude/*.local.md` and `.worktrees/`.
   - Use the same template that `specify` writes.
3. **Detect commands.** Run the stack-agnostic cascade to find the unit, integration, lint and vet commands → [`./references/command-detection.md`](./references/command-detection.md).
   - The cascade order is: settings override → Makefile → package scripts → language manifests → Docker probe for the integration tier.
   - Print the detected commands.
4. **Build the DAG.** Parse `tasks.json`.
   - Make sure that `deps` is acyclic.
   - Sort the tasks topologically into phases (Kahn).
   - Calculate `task_count`, `longest_chain` and `parallel_width`.
   - Mark the serialization lanes: `layer: migration`, and tasks with overlapping `files_hint`.
5. **Select the mode.** Run the decision tree (below; full form → [`./references/decision-tree.md`](./references/decision-tree.md)). Apply the guards.
6. **Make the run-plan.** → [`./references/team-exec.md`](./references/team-exec.md) / [`./references/workflow-exec.md`](./references/workflow-exec.md).
   - Sequential: an ordered task list.
   - Team: a shared TaskList with the full task text in each body.
   - Workflow: a generated `Workflow` script (DAG → Kahn phases → fan-out pipeline).
7. **Banner.** Print the active mode and the settings that caused it: `mode=<…> tdd=<…> isolation=<…> parallel=<n> integration=<…>`. The user sees how the engine will operate before it starts.
8. **Execute** in the selected mode. Each task runs the TDD cycle → [`./references/tdd-loop.md`](./references/tdd-loop.md).
   - A `layer: migration` task first **promotes** its staged migration files (`docs/features/<slug>/migrations/<NN>_*`) into the live `migrations/` tree.
   - It gives each file the real sequence number or timestamp, as the repo convention tells. It keeps the ordinal order.
   - *Then* it applies and reverts the migrations. Details → [`./references/inputs.md`](./references/inputs.md).
9. **Per-task gate + commit.** After GREEN and REFACTOR, these must be clean: unit, integration (if available), lint and vet.
   - Then make a commit for the task only, with the trailers `SDD-Task: <id>` and `SDD-AC: <id>` (one for each satisfied AC).
   - Tasks in one **compile-coupled lane** (a shared contract file in `files_hint`) use one shared gate and one commit. This commit has the trailers of all these tasks. This is the permitted exception in [`./references/tdd-loop.md`](./references/tdd-loop.md) §COMMIT.
   - Update `tracker.md` → `done`.
10. **Summary + hand off.** Report the covered AC, the commits (with `SDD-Task` trailers), each dropped or blocked task and the per-task gate results.
    - Then **emit the stage-handoff block** as [`../_shared/handoff.md`](../_shared/handoff.md) tells:
      - *What I did*: the covered AC, the commits with `SDD-Task` trailers and the gate results.
      - *Review*: the committed diff and `tasks/tracker.md`.
      - *Run next*: `/clear`, then `/sdd:review <slug>` (a clean-context pass over the full diff), then `/sdd:ship <slug>`.
    - In team mode, the [`reviewer`](../../agents/reviewer.md) can also run for each task. But the `review` skill does the authoritative independent review of the full change. `implement` does not certify its own work.

English prose (artifacts, questions, reports, handoff) follows ASD-STE100 Simplified Technical English → [`../_shared/ste100.md`](../_shared/ste100.md).

## Decision tree (compact)

```
parallel_eligible := isolation==worktree AND max_parallel>1 AND parallel_width>=2
                     AND (size in {M,L,XL} OR task_count>=4)

if team_mode AND parallel_eligible:                          → AGENT TEAM (TeamCreate) over the DAG
elif workflow_mode=="auto" AND parallel_eligible AND Workflow-available: → DYNAMIC WORKFLOW
else:                                                        → SEQUENTIAL single-agent TDD (topo order)
```

**Guards (apply before dispatch):**

- If `team_mode` is set but the feature is not eligible, warn and go down to the next mode.
- If `max_parallel>1` and `isolation: inplace`, set parallel to 1. Two agents must not edit one tree.
- If `workflow_mode: off`, never generate a Workflow.
- If `tdd: false`, skip RED. Give a strong warning, because you lose the safety net.
- If `require_integration: always` and Docker is absent, **BLOCK** before dispatch.
- If `require_integration: auto` and Docker is absent, run unit tests only and mark integration NON-red.
- If `require_integration: never`, skip the integration tier.

Full table → [`./references/decision-tree.md`](./references/decision-tree.md). Safe fallback: if `Workflow` or `TeamCreate` is not available at runtime, go to sequential mode.

## TDD cycle (per task)

The cycle is `SELECT → RED → GREEN → REFACTOR → GATE → COMMIT`. The RED step is the most important step. Write the test first and run it. Then **classify the first run**:

- GOOD red: an assertion fails, or the code is not implemented.
- BAD red: the test itself does not compile. Fix the test.
- false-pass: the test is green immediately. The test is too weak. Make it stronger.
- NON-red: the test is skipped because Docker is absent. `require_integration` controls this case. It is not red and not green.

Quote the failing line before you write production code.

If a test stays red, use the escalation ladder → [`./references/escalation.md`](./references/escalation.md):

1. Use a more-capable model.
2. Try again.
3. Split the task.
4. If the test encodes a wrong AC, **ask a human**. Never make the test weaker.
5. Roll back to the last green.

`stop_on_red` selects the result: stop the run, or drop the task and continue (the dependent tasks are blocked automatically).

## Definition of Done

- Each task in `tasks.json` is committed (test-first, gate-clean, `SDD-Task`/`SDD-AC` trailers), or the report shows it as dropped or blocked, with the reason.
- The unit gate is green. Integration is green where it is available, or NON-red is recorded with the policy reason. Lint and vet are clean for the detected commands.
- The banner showed the active mode and settings before execution.
- `tracker.md` shows the final status. The summary reports the gate results and hands off to `review` (the independent review gate). `implement` does not certify the full change itself.
- The per-task GATE (unit + integration + lint + vet) is the **structural self-check** of this skill ([`../_shared/self-check.md`](../_shared/self-check.md)). The handoff reports its results.

## Anti-patterns

- **Code before the test.** Always do RED first (unless `tdd: false`, which gives a warning).
- **A weaker test to make it pass.** If the AC is wrong, ask a human and correct the AC. Never edit the test to make it less strict.
- **No RED classification.** A false-pass looks green, but it hides a test that has no value.
- **Parallel agents that edit one working tree.** Parallel work must have worktree isolation. The guard sets parallel to 1.
- **A commit with a red or skipped gate** that you call done. Label a NON-red integration tier. Do not hide it.
- **A team for <4 tasks.** The coordination cost is larger than the gain. The eligibility check prevents it.
- **A claim that integration passed when Docker was absent.** Report NON-red correctly.

## References & template

`inputs.md` · `settings.md` · `command-detection.md` · `decision-tree.md` · `tdd-loop.md` · `team-exec.md` · `workflow-exec.md` · `escalation.md` — all in [`./references/`](./references/).
