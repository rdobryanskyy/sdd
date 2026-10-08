---
name: survey
model: inherit
effort: medium
agents: [explorer]
description: >
  Use to make the architecture map of the repo. The other steps of the pipeline read this map.
  Two modes. On an EXISTING codebase, it scans the code one time and records what it finds. On an
  EMPTY/greenfield repo, it runs a short foundation session that adapts to the level of the user.
  It picks the stack / folder structure / data approach / conventions WITH you (it gives many
  defaults). It records them as the foundation + foundational ADRs. Then it writes a scaffold
  tasks.json that implement changes into a real skeleton. Triggers on "survey the
  codebase", "map the architecture", "set up a new project", "bootstrap the foundation",
  "/sdd:survey", "study the codebase", "architecture map", "new project", "lay the foundation".
  Output: docs/architecture-map.md (+ adr/ + scaffold tasks.json on greenfield). It records
  reflects_commit to show when the map is stale. It reads an authored architecture doc, but
  never overwrites it.
---

# Skill: survey

This skill is the architecture anchor of the pipeline. It writes `docs/architecture-map.md`. This file is the single source of "what the system is". `specify` (constraints), `design` (compares against it), `data-model` and `implement` read this file. They do not discover the code again. The skill runs in one of **two modes**, and it finds the mode automatically:

- **Brownfield** (the repo has source) → scan the repo one time and record the **current** architecture.
- **Greenfield** (an empty or almost empty repo) → run a short **foundation session that adapts to the level of the user**:
  - Pick the stack / structure / data approach / conventions *with* the user (give many defaults).
  - Record them as the **foundation** + foundational ADRs.
  - Write a **scaffold `tasks.json`**. `implement` changes it into a real skeleton.
  - For the greenfield details → [`./references/foundation.md`](./references/foundation.md).

This skill is a repo-level utility: one map serves all features. The [`explorer`](../../agents/explorer.md) agent does the scan. For the question style → [`../_shared/ask-style.md`](../_shared/ask-style.md). For the depth → [`../_shared/size-matrix.md`](../_shared/size-matrix.md).

The prose of the map follows `artifact_language`. Put the language in the dispatch prompt of the explorer. Frontmatter keys such as `test_cmd` / `reflects_commit` stay in machine form. Module names and file names stay as they are → [`../_shared/artifact-language.md`](../_shared/artifact-language.md).

English prose (artifacts, questions, reports, handoff) follows ASD-STE100 Simplified Technical English → [`../_shared/ste100.md`](../_shared/ste100.md).

## Owner

Architect / Tech Lead. This person owns the architecture. In brownfield, they confirm that the map agrees with the code. In greenfield, they decide the foundation.

## Inputs

- (Optional) a hint for the path or the scope (default: repo root).
- (Read it, never overwrite it) an authored architecture doc, if it exists (`docs/architecture.md`, `ARCHITECTURE.md`, root `CLAUDE.md`, ADRs). This doc is a strong input. The map agrees with it and never overwrites it.

## Protocol

1. **Find the mode and the freshness (do an incremental re-survey if the map is stale).**
   - If `docs/architecture-map.md` exists and is fresh (its `reflects_commit` ≈ current HEAD), ask: «map is fresh (reflects `<commit>`). Reuse or refresh?». If the user selects reuse, STOP.
   - If the map exists but is **stale**, use the **incremental re-survey** as the first choice:
     1. Run `git diff --name-only <reflects_commit>..HEAD`.
     2. Put the changed paths into groups by top-level module.
     3. Dispatch the step-3 explorer **only on the changed subfolders**.
     4. Update only the map rows and sections that changed (module inventory, conventions, frontend, machine keys).
     5. Write `updated_at` + `reflects_commit` again.
   - Do the **full re-scan only if the diff touches more than half of the modules** in the inventory, or if `reflects_commit` does not resolve. In the handoff, tell which mode ran.
   - If there is no map, decide the mode. Use **brownfield** if the repo has source (modules or packages, not only config). Otherwise, use **greenfield**. Greenfield is an empty repo, or a repo with only scaffold files such as a bare `go.mod` / `package.json`.

### Brownfield path (existing code)

2. **Read the authored docs first.** A hand-maintained architecture doc, a root `CLAUDE.md` or ADRs are the authoritative input. Make the map agree with them. Never overwrite them.
3. **Scan with the explorer.** Dispatch the [`explorer`](../../agents/explorer.md) agent with `subagent_type: "sdd:explorer"` (`haiku`/`low`, in a clean, isolated context per [`../_shared/agent-roster.md`](../_shared/agent-roster.md)). Use this prompt: «Report (a) language + frameworks + versions, (b) top-level module layout + per-module layers, (c) layering / wiring conventions, (d) datastores + access, (e) inter-module comms, (f) cross-cutting conventions (errors, IDs, tests, migrations) with one cited example each, (g) 2–3 representative features as precedents, (h) **if a frontend exists** — the component library / design system, design tokens (colors/spacing/typography), styling approach (Tailwind / CSS-modules / styled-components / …), shared UI primitives, and a representative screen/component as the UI precedent to reuse. Write your report in ASD-STE100 Simplified Technical English.»
   - If the repo is large, dispatch one explorer for each subtree.
   - The fallback is `subagent_type: "Explore"`.
   - Item (h) is the **source of the reuse invariant**. It fills the §Frontend / UI foundation section. Later, `design` / `tasks` / `implement` **compose against this section and do not make the UI again**. New UI work reuses these components, these tokens and the single styling approach. `review` flags new UI that copies them from zero.
   - An incomplete inventory here silently permits a second design system downstream.
4. **Synthesize, stamp, validate and write.**
   - Fill [`./templates/architecture-map.md`](./templates/architecture-map.md) with real `file:line` anchors. Include the C4 of what exists, the module inventory, the cited conventions, the datastores, **the Frontend / UI foundation if a frontend exists**, the precedent guide and the constraints.
   - **Fill the machine-readable frontmatter keys** (`language`, `build_cmd`, `test_cmd`, `lint_cmd`, `migration_tool`, `frontend`) from the findings of the explorer. If a key has no evidence, it stays `""` (unknown). **Never guess.** The command-detection cascade of `implement` reads `test_cmd`/`lint_cmd` from here.
   - Record `updated_at` + `reflects_commit: <short HEAD>`.
   - **Validate the C4 Mermaid per [`../_shared/mermaid-check.md`](../_shared/mermaid-check.md).** If `mmdc` is available, render-parse with it. If not, use the structural lint. Fix the errors before the commit.
   - Then do the **structural self-check** (per [`../_shared/self-check.md`](../_shared/self-check.md)). Read the map again from the disk and make sure that:
     1. Each machine key has a value from the explorer or the explicit `""`.
     2. Each convention line cites a file that exists.
     3. The C4 is validated.
     4. `reflects_commit` = current short HEAD.
   - Write and commit `survey: architecture map (reflects <commit>)`.
   - Then **emit the stage-handoff block** per [`../_shared/handoff.md`](../_shared/handoff.md): *What I did* + *Review* (`docs/architecture-map.md`, + scaffold `tasks.json` on greenfield) + *Run next* (`/clear`, then `/sdd:specify <slug>`).

### Greenfield path (empty repo) → [`./references/foundation.md`](./references/foundation.md)

G2. **Calibrate to the person.** Ask one opening `AskUserQuestion` to find how the user wants to work: «pick good defaults, I will confirm» / «walk me through each choice with explanations» / «let me choose each piece, keep it terse». The answer sets the depth and the words of the dialogue. For a junior, give defaults + short explanations per [`../_shared/ask-style.md`](../_shared/ask-style.md). For a senior, use fewer words and give more control. This question is not a product brief.

G3. **Intent (short).** Ask 1–3 questions: what the project is, and the type of capabilities it will have (for example «HTTP API» / «CLI» / «web app»). Get only enough to choose an architecture. Do NOT ask for the feature briefing. That is the job of `specify`, for each feature.

G4. **Pick the foundation, with many defaults.** At the calibrated depth, choose:
   - the stack (language/framework/datastore),
   - the architectural style (for example, hexagonal modules),
   - the folder/module structure,
   - the data/persistence approach (migration tool, ID strategy),
   - the core conventions (errors, tests, CI).

   Recommend a coherent default set. The user confirms it or changes it. For the choice menus and the defaults → [`./references/foundation.md`](./references/foundation.md).

G5. **Fix the foundation.**
   - Write `docs/architecture-map.md` as the **established foundation**. Mark it `mode: greenfield-bootstrap`. The C4 is the *target* baseline.
   - Write **foundational ADRs** in `docs/adr/` for the irreversible choices (stack, module style, persistence).
   - **Fill the machine-readable frontmatter keys** from the selected foundation (`language`, `build_cmd`, `test_cmd`, `lint_cmd`, `migration_tool`, `frontend`). Here, they record the *decided* toolchain. If an item is not decided yet, it stays `""`.
   - Record `reflects_commit`.
   - **Validate the C4 Mermaid per [`../_shared/mermaid-check.md`](../_shared/mermaid-check.md)** before the commit.
   - Do the same step-4 structural self-check.

G6. **Write the scaffold and hand off.**
   - Write a scaffold `tasks.json` per the contract in [`./references/foundation.md`](./references/foundation.md). It is the skeleton: the folder/module structure, a baseline module, the test harness, the migration tooling, CI, and a `CLAUDE.md`/rules doc.
   - The DoD of each task uses the **skeleton smoke test** as its anchor: «the project builds + boots + the empty test suite runs + the migration tool runs».
   - Propose: «foundation fixed — run `implement` to materialize the skeleton». This is a light hand-off.
   - Commit `survey: greenfield foundation + scaffold plan`.

## Definition of Done

- `docs/architecture-map.md` exists with `updated_at` + `reflects_commit`. If an authored doc exists, the map agrees with it, and the skill did not overwrite it.
- **Brownfield:** the C4 of what exists + the module inventory + the cited conventions + the precedent guide, with real anchors (no placeholders).
- **Greenfield:** the foundation is fixed (stack/structure/data/conventions) at the calibrated level of the user. There are foundational ADRs and a scaffold `tasks.json`. Its tasks have the skeleton smoke-test DoD and are ready for `implement`.
- The step-4 **structural self-check** passed ([`../_shared/self-check.md`](../_shared/self-check.md)):
  - The machine keys come from the explorer or are explicitly `""`.
  - The convention citations resolve.
  - The C4 is validated.
  - `reflects_commit` is current.
  - The handoff tells the result of the check.

## Anti-patterns

- **A scan of the repo again in each downstream skill.** The skill scans one time, and the other skills read the map. Drift detection is the only second read, and it reads real domain files.
- **An overwrite of a hand-maintained `docs/architecture.md`.** Survey writes its own map and makes it agree with the doc.
- **A map with no `reflects_commit`.** The map becomes incorrect silently, and no person knows that it is stale.
- **Greenfield: a full product brief.** The foundation session picks the *architecture*, not the features. The idea and the briefing are the job of `specify`, for each feature. Ask only about the intent and the foundation choices.
- **Greenfield: no attention to the level of the person.** Give a junior defaults + explanations in plain words. Give a senior control and fewer words. One calibration question sets this. Do not give a first-time user a long list of senior-level choices.
- **Placeholders or a guessed layout.** Cite the source, or write `UNKNOWN`. A fictional map is worse than no map.

## References & template

- [`./references/foundation.md`](./references/foundation.md) — greenfield: the calibration question, the depth for each level, the choice menus and defaults for stack/structure/conventions, the list of foundational ADRs, and the scaffold `tasks.json` contract.
- [`./templates/architecture-map.md`](./templates/architecture-map.md) — the output scaffold. It is the same file for the current map OR the foundation. A `mode:` marker shows which.
- [`../_shared/agent-roster.md`](../_shared/agent-roster.md) — the explorer contract.
