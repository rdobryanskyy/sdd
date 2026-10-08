# Greenfield foundation — calibrate, pick, fix, scaffold

If `survey` finds an empty repo, it does not write «greenfield — nothing here». It runs a short
session to **set the foundation**. Then the per-feature flow has a real base for new features.
After the session, survey gives a skeleton to `implement`. The session **adapts to the person**.
Find the level of the user one time, then work at that level.

## G2 — Calibrate (one question, sets everything after)

Start with one `AskUserQuestion`. It finds how the user wants to work, and it also shows their
level. Use friendly words, per [`../../_shared/ask-style.md`](../../_shared/ask-style.md):

- **«Pick good defaults, I will confirm»** → *guided-default* depth:
  - Propose a complete, coherent foundation.
  - Ask for **one** confirmation.
  - Explain each item in plain words.
  - This depth is best for a first-time user, a person who is not an engineer, or a user who wants to start quickly.
- **«Walk me through each choice with explanations»** → *guided-explained* depth:
  - Ask one question for each major choice.
  - Give a short explanation for each option. Do not use jargon without an explanation in plain words.
  - This depth is best for a junior who wants to learn the reasons.
- **«Let me choose each piece, keep it terse»** → *expert* depth:
  - Give the choices without the long explanations.
  - Accept the changes of the user freely.
  - This depth is best for a senior.

The calibration sets the **depth + the words**. It does not change the set of decisions. The skill
fixes the same foundation at each depth. If the answer is not clear, use *guided-default*. Too
much explanation costs less than too much information at one time.

## G3 — Intent (short, not a brief)

Ask 1–3 questions at the calibrated depth:

- **What is this** (one line).
- **What type of capabilities** (for example HTTP API / CLI / web app / library / worker).
- The one or two hard constraints, if they exist (must use language X / must deploy to Y).

Stop after these questions. The feature-level scope is the job of `specify`, for each feature.
The only goal is «enough to choose an architecture».

## G4 — The foundation choices (recommend a coherent default set)

Pick these items together. In *guided-default* mode, show the full set as one recommended bundle
and ask for one confirmation. In *guided-explained* / *expert* mode, ask about the important items
one by one. Always recommend a **coherent** default, where the items agree with each other. Give a
short explanation for each item per ask-style.

| Decision | What to pick | Default heuristic |
|---|---|---|
| **Stack** | language + framework + datastore | Match the intent. HTTP API → a mainstream web framework + a relational DB. CLI → the standard CLI lib of the language, no DB. |
| **Architectural style** | how the code is organized | Use a good default for the stack. Modular service → hexagonal `domain → app → infra → ports`. CLI/library → the idiomatic layout of the ecosystem. SDD works with all styles. Pick the style that fits. Do not force hexagonal. |
| **Folder / module structure** | the top-level layout | Use the conventional layout of the stack. A modular service can use `cmd|src/` + `modules/<m>/...` + `migrations/` + `docs/`. A CLI/library follows its ecosystem. You can adapt it freely. |
| **Data / persistence** | migration tool + ID strategy | Use the standard migration tool of the stack. Use time-sortable IDs that the app makes. Use «DB as dumb storage» (see the baseline of `data-model`). |
| **Conventions** | errors, tests, CI | Use one unified error envelope. Use a unit + integration test layout (the integration tests use an ephemeral real dependency). Use one CI workflow that runs build+test+lint. |

Each irreversible choice (stack, module style, persistence) becomes a **foundational ADR** in
`docs/adr/`. These ADRs record the «why» of the base structure of the project. Then a later
contributor does not silently argue about these decisions again. These ADRs are real
blast-radius decisions: a later change of the stack or the style is a rewrite.

## G5 — Fix the foundation (the map as target baseline)

Write `docs/architecture-map.md` from the template with `mode: greenfield-bootstrap`.

- The C4 + the module inventory show the **target baseline**: the structure that the scaffold will make.
- The conventions catalog is the set of rules for the scaffold and for each future feature.

Brownfield mode writes the same file. Thus the downstream skills do not need to know which mode
made it.

## G6 — Scaffold `tasks.json` contract (handed to `implement`)

Write `docs/features/_scaffold/tasks.json`. This is a repo-level task set, not a per-feature
task set. `implement` uses it to make the skeleton. It has the same shape as the `tasks`
contract, with `layer: scaffold`:

```json
{
  "slug": "_scaffold",
  "tasks": [
    { "id": "S1", "title": "Create the module/folder structure + entry point", "layer": "scaffold", "deps": [],
      "acs": [], "dod": "project builds (empty)", "files_hint": ["cmd/", "internal/modules/"] },
    { "id": "S2", "title": "Wire the test harness + a smoke test", "layer": "scaffold", "deps": ["S1"],
      "acs": [], "dod": "empty test suite runs green; `app boots` smoke test passes", "files_hint": ["..."] },
    { "id": "S3", "title": "Set up the migration tool + an initial empty migration", "layer": "scaffold", "deps": ["S1"],
      "acs": [], "dod": "the migration tool applies + reverts cleanly", "files_hint": ["migrations/"] },
    { "id": "S4", "title": "Add the CI workflow (build + test + lint)", "layer": "scaffold", "deps": ["S2"],
      "acs": [], "dod": "CI config is valid; the commands match the detected toolchain", "files_hint": [".github/" ] },
    { "id": "S5", "title": "Write CLAUDE.md from the chosen conventions", "layer": "scaffold", "deps": ["S1"],
      "acs": [], "dod": "conventions doc reflects the foundation map", "files_hint": ["CLAUDE.md"] }
  ]
}
```

**The skeleton smoke test is the TDD anchor.** Scaffold tasks have no feature AC. Thus
`implement` uses the structural smoke test as the anchor for red→green:

- RED = «the project does not build / boot / the tooling doesn't run».
- GREEN = «build + boot + empty test suite + migration tool all succeed».

This keeps the discipline of the engine useful for structural work. Do not do TDD for each folder
only for show. `implement` reads the foundation map to get the exact conventions for the scaffold.

After the scaffold, the repo is real, and `docs/architecture-map.md` describes it. The normal
per-feature flow (`specify → … → implement`) adds features to it. The feature tests of
`implement` are real TDD against a project that now boots.
