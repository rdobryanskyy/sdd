---
name: tasks
model: inherit
effort: medium
agents: []
description: >
  Use to break a designed feature into atomic tasks of ≤1 day. Each task has a dependency graph
  entry and its own Definition of Done. The skill also writes a machine-readable tasks.json that
  the implement engine reads. Triggers on "task breakdown for {slug}", "break down tasks for {slug}",
  "tasks for {slug}", "plan the work for {slug}", "/sdd:tasks {slug}", "break {slug} into tasks",
  "decomposition of {slug}", "task list". Reads spec.md + sad.md + Accepted ADRs (+ data-model +
  openapi if present). Writes docs/features/{slug}/tasks/{_epic,tracker,<task>}.md AND
  docs/features/{slug}/tasks.json. Tracker export to an issue tracker is optional and
  tool-neutral. Hard-refuses if spec.md or sad.md or an Accepted ADR is missing.
---

# Skill: tasks

This skill makes a task breakdown. The rules for each task:

- Each task is atomic and takes ≤1 day.
- Each task is a separate change that a reviewer can examine. A size of ≤~500 LOC is preferred.
- The tasks have a visible dependency graph.
- Each task has its own Definition of Done.

One task = one focused session = one PR. "Build the feature" is not a task. Break it down.

Task files **link** to the upstream artifacts (`spec.md §AC-N`, `sad.md §6`, `data-model.md`, `contracts/openapi.yaml`, `adr/NNNN-*.md`). They do not copy them. With the human-facing markdown, this skill also writes **`tasks.json`**. The `implement` engine reads this contract to build its dependency DAG.

Task prose (`title` / `dod`, the markdown bodies) follows `artifact_language`. The `tasks.json` machine fields (`id`, `layer`, `deps`, `acs`, `files_hint`, `slug`) and the tracker states stay English → [`../_shared/artifact-language.md`](../_shared/artifact-language.md).

English prose (artifacts, questions, reports, handoff) follows ASD-STE100 Simplified Technical English → [`../_shared/ste100.md`](../_shared/ste100.md).

## Owner

Tech Lead.

## Inputs

- `<slug>` — the feature slug.
- **Gate (hard refuse):** `docs/features/<slug>/spec.md` + `docs/features/<slug>/sad.md` + ≥1 Accepted ADR in `adr/`. If one is missing, STOP. Point at the skill that makes it (`specify` / `design` / `decide-adr`).
- Read these directly (not through an index):
  - spec §5 AC and §6 NFR.
  - sad §5 module boundaries, §6 runtime and §9 ADR index.
  - Each Accepted ADR.
  - If present: `data-model.md` and `contracts/openapi.yaml`.
- (Expected) `sad.md` frontmatter `target_surfaces`. It controls which layers appear (step 4).
  - If it is absent or empty, **warn** («surfaces undeclared — re-run `design`, or proceeding as `backend-service`»).
  - Then **use `[backend-service]`** (→ [`../_shared/surfaces.md`](../_shared/surfaces.md)).
  - Never write `ui` tasks for a surface that is not declared, and never do this silently.

## Protocol

1. **Prereq check (hard).** Make sure that spec.md, sad.md and ≥1 Accepted ADR exist. If one is missing, refuse and name the missing one.
2. **Read upstream directly.** Each task will link back to the section that it comes from. Do not add a paraphrase layer.
3. **Scaffold output.** Make `docs/features/<slug>/tasks/` with these files:
   - `_epic.md` (summary + links + the DAG `flowchart`).
   - `tracker.md` (status table).
   - One `<task-slug>.md` for each task.

   Templates → [`./templates/_epic.md`](./templates/_epic.md), [`./templates/tracker.md`](./templates/tracker.md), [`./templates/task.md`](./templates/task.md). **Validate the `_epic.md` `flowchart` per [`../_shared/mermaid-check.md`](../_shared/mermaid-check.md).** If `mmdc` is available, render-parse with it. If not, use the structural lint. Fix the errors before you commit.
4. **Identify work-items by layer.** Use these generic layers. They do not depend on the stack:
   - `migration` (DB).
   - `domain` (entities/invariants).
   - `infra` (repo/persistence).
   - `app` (service/use-case).
   - `ports` (handler/API).
   - `ui` (UI components / screens / view-state). Use it only when a UI surface is declared.
   - `tests`.
   - `wiring` (composition/DI).
   - `docs`.

   **The `sad.md` frontmatter `target_surfaces` controls which layers appear** (→ [`../_shared/surfaces.md`](../_shared/surfaces.md)):
   - A `web-frontend` / `mobile-app` / `desktop-app` surface adds `ui` tasks.
   - A backend-only feature gets domain/infra/app/ports (no `ui`).
   - A `cli` feature gets app/ports.
   - A `worker` gets domain/infra.

   Each `ui` task **names the existing components / tokens / styling that it uses again** (from `architecture-map.md` §Frontend). List a *new* component only when no existing primitive is applicable. List 8–20 items, by size (see [`../_shared/size-matrix.md`](../_shared/size-matrix.md)).
5. **Atomic check.** Each task takes ≤1 working day. If it takes more, split it. A change of >~500 LOC is a sign that the task is too wide.

   **Contract-task rule:** Some tasks change a shared interface/type that existing implementations must satisfy. In a statically-checked language (Go, TS, Java, …), do **not write such a task as a standalone task**:
   - It cannot be committed green alone, because the compile-time check breaks each implementer.
   - **Put it into the first implementing task.**
   - If a split is still necessary (several implementers), mark the pair as a **compile-coupled lane**.
   - Both tasks list the contract file in `files_hint`. This uses the existing overlap-lane mechanics again, with no change to the `tasks.json` schema.
   - Thus `implement` serializes the two tasks. It can close them with one shared gate + commit.
6. **Dependency graph.** For each task, write `deps: [...]`. Identify the parallel branches. For example, the migration and a pure-domain task can start at the same time. This graph IS the DAG that `implement` will topologically sort into phases.
7. **Per-task DoD.** Each task must be testable. Examples: «unit tests for the new validation pass», «migration applies and reverts cleanly», «handler returns the spec'd outcome for AC-03». Do not use a subjective «done when I say so».
8. **AC refs + files hint.** Each task lists the `acs` that it satisfies (spec §5 IDs). Each task also lists a `files_hint`: the directories/files that it will touch.
   - With `files_hint`, `implement` serializes tasks that have overlapping file sets.
   - `layer: migration` is always serialized (ordered migration sequence).
   - A **compile-coupled pair** (step 5) puts the contract file in both `files_hint`s, for the same reason.
   - `layer: ui` is **not** serialized automatically. UI tasks run in parallel, unless their `files_hint` values overlap.
   - The `files_hint` of a migration task is the **staged** pair `docs/features/<slug>/migrations/<NN>_*`. It is not a live `migrations/` path. When `implement` runs the task, it promotes the pair into the live `migrations/`.
9. **Estimate + owner.** Give S/M/L or hours. Give a named owner (or `<TBD lead>`). If the team has its own sizing, use it.
10. **Emit `tasks.json`** (see the contract below) at `docs/features/<slug>/tasks.json`. It is the same model as the markdown, in machine form.
11. **Optional tracker export.** If an issue-tracker MCP is connected (Jira / Linear / GitHub Issues / Redmine, as the repo uses), offer to create tickets from `_epic.md` + the task files. If not, give bodies that the user can copy and paste. Never bind the skill to only one tracker.
12. **Self-check.** Make sure of these items:
    - Each task takes ≤1 day.
    - The DAG is acyclic and has ≥1 parallel branch where the work permits it.
    - Each task has a DoD.
    - The `acs` cover each spec §5 AC.
    - `tasks.json` validates against the contract.
13. **Propose commit + handoff.** Propose the commit `tasks: <slug> (breakdown + tasks.json)`. Then **emit the stage-handoff block** per [`../_shared/handoff.md`](../_shared/handoff.md): *What I did* + *Review* (`tasks/`, `tasks.json`) + *Run next*. **Find the next stage per `.route`** (the Routes table in [`../_shared/size-matrix.md`](../_shared/size-matrix.md)):
    - The forward stage is `/sdd:plan-tests <slug>`, then `/sdd:implement <slug>`.
    - On `quick`, `plan-tests` always collapses to the inline `## Test plan` in `spec.md`.
    - The N/A condition of `plan-tests` is: **the DoD of each task already names its test**. Only then, the skip target is `/sdd:implement <slug>` directly.
    - The skip is automatic on `quick`. It is offered as `↳ or` on `standard`. It is never used on `full`.

## `tasks.json` contract (read by `implement`)

```json
{
  "slug": "<slug>",
  "tasks": [
    {
      "id": "T1",
      "title": "imperative, specific",
      "layer": "migration|domain|infra|app|ports|ui|tests|wiring|docs",
      "deps": ["T0"],
      "acs": ["AC-01", "AC-02"],
      "dod": "one testable sentence",
      "files_hint": ["path/or/dir/the/task/touches"]
    }
  ]
}
```

- The markdown task files and `tasks.json` use the **same field names** (`deps`, `acs`). This skill writes both from one model. Thus, no translation layer can drift.
- `deps` must make a **DAG** (no cycles). It must refer only to ids that are in the file.
- The serialization rules:
  - `implement` serializes the `layer: migration` tasks (ordered migration sequence).
  - `layer: ui` is **not** serialized automatically (UI tasks run in parallel).
  - Tasks with overlapping `files_hint` go into the same lane and are serialized, for all layers.
  - A **compile-coupled pair** (step 5) uses this same mechanism through the shared contract file. `implement` can commit the pair together (one gate, both `SDD-Task` trailers).
- The `sad.md` frontmatter `target_surfaces` controls which layers are present. A UI surface adds `ui`. A backend-only feature has no `ui` → [`../_shared/surfaces.md`](../_shared/surfaces.md).

## Definition of Done

- `tasks/_epic.md` + `tasks/tracker.md` + one `tasks/<task>.md` for each task exist. They link to upstream and do not copy it.
- `tasks.json` exists and validates: the `deps` are acyclic, each `acs` entry is a real spec §5 AC, and each task has a `dod` and a `files_hint`.
- Each task takes ≤1 day and has an owner. The DAG shows ≥1 parallel branch where the work permits it.
- ≥1 task's `acs` covers each spec §5 AC.
- The step-12 check (atomicity, acyclic DAG, per-task DoD, AC coverage, `tasks.json` contract) is the **structural self-check** of this skill ([`../_shared/self-check.md`](../_shared/self-check.md)). Report its result in the handoff.

## Anti-patterns

- **«Build the feature»** as one task. Break it into ≥8 atomic tasks.
- **5-day monster tasks** → a reviewer cannot examine them. Split them.
- **No dependencies** → tasks start in parallel and block each other on the next day.
- **No per-task DoD** → «done when I decide».
- **No owner** → nobody starts, or each person thinks that a different person will start.
- **Binding to one tracker** (Jira-only language). The export is optional and tool-neutral.
- **The task body copies the spec AC / sad §6 / data-model verbatim.** Link to them. Do not paste them.
- **`tasks.json` does not agree with the markdown.** They must show the same model.
- **A task that violates a Hard Rule** from spec §6 / sad §11. For example: «edit another module» when the architecture forbids it.

## References & template

- [`./templates/_epic.md`](./templates/_epic.md) · [`./templates/tracker.md`](./templates/tracker.md) · [`./templates/task.md`](./templates/task.md)
- [`../_shared/size-matrix.md`](../_shared/size-matrix.md) — the number of tasks for the feature size.
- [`../_shared/surfaces.md`](../_shared/surfaces.md) — `target_surfaces` (from `sad.md`) controls which layers appear. A UI surface adds the `ui` layer (not serialized automatically).
