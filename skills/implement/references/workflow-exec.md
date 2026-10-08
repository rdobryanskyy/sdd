# Dynamic-workflow execution (`workflow_mode: auto`)

When the decision tree selects the workflow, the engine **generates a `Workflow` script** from the DAG and runs it. This is the unattended mode with the most parallel work. Each independent task goes through its own pipeline. If a task fails, only the subtree of that task is dropped. The other branches continue.

## Why a generated workflow (not a fixed one)

The shape of the work is `tasks.json`, and it is different for each feature. Thus, the engine emits a script for this DAG: validate → layer → fan-out → per-task pipeline. The tasks array controls the script. The engine fills in the script and calls `Workflow`.

## Generated script shape

```js
export const meta = {
  name: 'sdd-implement-<slug>',
  description: 'TDD-implement <slug> from tasks.json (dynamic DAG)',
  phases: [{ title: 'Implement' }, { title: 'Review' }],
}

// tasks + deps are inlined from tasks.json by the engine
const TASKS = /* [{id, title, acs, dod, files_hint, deps, layer}, ...] */;

// Kahn layers → phases; within a layer, fan out up to the parallel cap.
// Each task is one independent pipeline: write-test → implement → verify → [review] → commit.
const done = new Set();
for (const layer of kahnLayers(TASKS)) {              // computed from deps
  await parallel(layer.map(t => () =>
    pipeline([t],
      () => agent(redPrompt(t),     { phase:'Implement', label:`red:${t.id}`,   schema: RED_VERDICT }),
      r  => agent(greenPrompt(t,r), { phase:'Implement', label:`green:${t.id}`, schema: GATE_VERDICT }),
      g  => agent(verifyPrompt(t,g),{ phase:'Implement', label:`verify:${t.id}`,schema: GATE_VERDICT }),
      v  => agent(reviewPrompt(t,v),{ phase:'Review',    label:`review:${t.id}`,schema: REVIEW_VERDICT }),
    ).then(res => { if (res?.gate_green) done.add(t.id); return {t, res}; })
  ))
}
```

- **Agent prompts.** Each prompt that `redPrompt`, `greenPrompt`, `verifyPrompt` and `reviewPrompt` build must tell the agent to write its report, code comments and commit messages in ASD-STE100 Simplified Technical English.
- **Schema-validated verdicts.** Each stage returns a structured verdict. Thus, the orchestrator makes decisions from data, not from prose:
  - `RED_VERDICT { class: GOOD|BAD|false_pass|NON, failing_line }`
  - `GATE_VERDICT { unit, integration, lint, vet, gate_green }`
  - `REVIEW_VERDICT { ac_satisfied, issues[] }`
- **A failure drops the subtree.** A stage can throw, or return `gate_green: false` after the retries. Then that task becomes `null`, and the engine removes it from `done`. Thus, the engine skips each transitively dependent task, because its deps never complete. The independent branches finish with no effect. This is the advantage of the workflow over a team stop.
- **Parallel cap.** `parallel(...)` obeys `max_parallel_agents`. The workflow runtime also limits concurrency. If a layer is wide, the extra tasks wait in a queue.

## Serialization inside the workflow

The lanes of the team also apply here:

- `layer: migration` tasks go into one ordered sub-sequence. Do not put two migrations in the same parallel layer. Connect them with synthetic deps before you calculate the Kahn layers.
- Tasks with overlapping `files_hint` get a synthetic dep, so that they are never in the same parallel batch.
- A **compile-coupled pair** (a shared contract file in `files_hint`) gets the same synthetic dep. Also, its commit steps become one step: one shared gate and one commit with the `SDD-Task`/`SDD-AC` trailers of all the tasks ([`tdd-loop.md`](./tdd-loop.md) §COMMIT).
- Each migration task **promotes** its staged `docs/features/<slug>/migrations/<NN>_*` file into the live `migrations/` (next free number, in ordinal order). Then it applies the file — see [`./inputs.md`](./inputs.md).

## Commit + integration

- The `commit` step of each pipeline makes the commits, with the `SDD-Task`/`SDD-AC` trailers, one at a time in dependency order. If `auto_commit: per_phase`, the engine makes the batch commits after the workflow returns.
- The integration tier obeys `require_integration`. In CI (Docker present), the integration RED→GREEN runs in the verify stage. Locally, with `auto` and no Docker, it is NON-red. Then the proving run uses CI for the integration green.

## Graceful fallback

If the `Workflow` tool is **not available** at runtime, the decision-tree guard skips this full mode. The engine then goes to the team (if eligible) or to sequential single-agent TDD. The generated script is never a hard dependency.
