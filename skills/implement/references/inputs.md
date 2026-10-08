# Inputs + preconditions (step 1)

## Hard gate

`docs/features/<slug>/tasks.json` must exist and parse as JSON. If it is missing or malformed, refuse: «run `tasks <slug>` first (it emits tasks.json)». Do not try to make the tasks again from the markdown. `tasks.json` is the contract.

## Validate the contract

The loaded `tasks.json` must agree with the shape from the `tasks` skill:

- The top level is `{ slug, tasks: [...] }`.
- Each task has `id` (unique), `title`, `layer`, `deps` (an array of existing ids), `acs` (array), `dod` (string) and `files_hint` (array).
- `deps` makes a DAG (no cycles). Step 4 examines this. A cycle is a hard error. Report the cycle and stop. The cycle is a `tasks` bug, not an `implement` bug.

## Scaffold task sets (from `survey` greenfield)

A `tasks.json` with `slug: "_scaffold"` and `layer: scaffold` tasks comes from the greenfield foundation of `survey`, not from `tasks`. These tasks have **no feature `acs`**. They create the project skeleton: structure, baseline module, test harness, migration tooling, CI and the conventions doc. Use these special rules for them:

- **The skeleton smoke test is the red→green anchor**, not a feature AC.
  - RED = «the project does not build / boot / the tooling doesn't run».
  - GREEN = «build + boot + the empty test suite + the migration tool all succeed».
  - Write that smoke test as a part of the scaffold (task S2 in the foundation contract). Then build the skeleton until the test passes. Do not do TDD for each folder.
- Read `docs/architecture-map.md` (`mode: greenfield-bootstrap`) to get the exact stack and conventions for the scaffold.
- After the scaffold is green, the repo is real. Then the usual feature flow (`specify → … → implement`) builds into it with real feature TDD.

## Context the agents read directly

The engine does **not** paste these files into prompts. Each agent (or the sequential runner) reads them itself, so that no paraphrase changes their meaning:

- `docs/features/<slug>/spec.md` — the §5 acceptance criteria. They are the source of truth for each test assertion.
- `docs/features/<slug>/test-plan.md` — the AC→test map, if `plan-tests` ran. **For XS/S, the plan is usually inline** in a `## Test plan` section in `spec.md` (from the size matrix). Examine the two locations and read the one that exists.
- `docs/features/<slug>/data-model.md` and the **staged** migration files under `docs/features/<slug>/migrations/` — the schema for the code. A `layer: migration` task promotes them into the live `migrations/` tree (see «Staged migrations → promote» below).
- `docs/features/<slug>/contracts/openapi.yaml` — the API contract that the handlers must agree with.
- `docs/features/<slug>/sad.md` and the Accepted `adr/` — the architecture and the locked decisions.
- `docs/architecture-map.md` (from `survey`, if it exists). This file gives two things, so that the agents do not have to find the patterns again:
  - The conventions of the existing system that the new code must follow: module wiring, error handling, IDs, tests and migrations. **For a `ui` surface, read §Frontend / UI foundation** for the design system, components, tokens and styling to use again.
  - The closest precedent to copy. For a new screen, this includes the **closest UI precedent**.

## Staged migrations → promote before running

`data-model` stages each migration as `docs/features/<slug>/migrations/<NN>_<verb>_<entity>.up.sql` + `.down.sql`, with a feature-local ordinal. These files are **not** in the live `migrations/` tree. Thus, nobody can apply a design-stage schema to a real DB before the feature is built. The `layer: migration` tasks own the **promotion**:

1. **Promote in ordinal order.** For each staged `<NN>_*` pair (in ascending order), copy it into the live `migrations/` directory of the repo. Use the detected convention of the repo:
   - Sequential → the **next free number** (`000023_*`).
   - Timestamped → a new timestamp.
   - Keep the order inside the feature.
   - Give the number **now, at promote-time**. Thus, two features that build at about the same time never get the same number.
   - Copy the SQL body **verbatim**. Never write it again during promotion.
   - After promotion, the live file is canonical. The staged copy is the frozen design record. Git keeps it. Do not edit it manually.
2. **Then apply + verify.** Run the migration with the repo tool against the DB (ephemeral, testcontainers). Examine the task DoD «migration applies and reverts cleanly» on the promoted file. The integration tests of the feature run against the promoted schema.
3. **Commit** the promoted live files with the migration task. `data-model` already committed the staged pair under `docs/features/<slug>/migrations/`.

If a `layer: migration` task has **no** staged file under the `migrations/` of the feature, there is a `tasks`/`data-model` mismatch. Report it. Do not write new SQL.

## `ui`-layer tasks

A `layer: ui` task exists only when the `sad.md` frontmatter `target_surfaces` declares a UI surface (`web-frontend` / `mobile-app` / `desktop-app`). This task runs through the **same TDD cycle** as all other tasks. But it follows the **frontend test convention of the repo**, not a backend assumption. The engine detects the component or e2e-through-UI runners from the `package.json` scripts (Playwright / Storybook / a visual-diff tool / etc.). The engine does not change: command-detection already finds frontend scripts in its cascade.

**Use the UI foundation again (do not make a new one).** A `ui` task **composes the existing design system** from `architecture-map.md` §Frontend:

- Use the existing components and shared primitives again.
- Get the design tokens (colors / spacing / typography) from the token source of the repo.
- Build with the **one** styling approach of the repo.
- Find the **closest existing screen or component** (the §Frontend UI precedent). Extend or compose it.
- Write a **new** component only when no existing primitive is applicable. Use the styling approach of the repo. Never add a second approach.

This is the frontend form of the rule "follow the repo + copy the closest precedent" → [`../../_shared/surfaces.md`](../../_shared/surfaces.md).

## Repo state

- Record the current branch. If `branch_strategy: feature` and the repo is on its default branch, create or go to a feature branch before a commit (see [`settings.md`](./settings.md)).
- Do not touch unrelated dirty changes. Change only the files that the `files_hint` of each task names.
