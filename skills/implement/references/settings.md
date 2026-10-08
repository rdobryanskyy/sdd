# Settings — `.claude/sdd.local.md` (step 2)

A plugin-settings file with YAML frontmatter configures the engine for each project. On the first run, **lazy-create** the file with the defaults below and tell the user its location. On later runs, read it.

> **Plugin-wide, not implement-only.** Most keys below configure the `implement` engine. But **other skills** also read some keys:
>
> - The Q&A skills (`specify` / `clarify` / `design`) read `interview_depth` to pre-select the depth dial.
> - **Each artifact-writing skill** reads `artifact_language`. It sets the language of the pipeline documents (prose only; the structure stays English → [`../../_shared/artifact-language.md`](../../_shared/artifact-language.md)).
>
> The file is **auto-created with documented defaults the first time a skill needs it**. Usually `specify` creates it at the start of the backbone. Thus, the other pipeline stages find a real file and do not use a fallback with no message. If the file is still missing for some reason, a reader uses its own default (medium). There is **no hard ordering dependency** on an earlier `implement` run.

## Auto-create when absent

The file is created **automatically** the first time a skill needs it. Usually `specify` creates it at the start of the backbone, together with `.size`. If you start directly with `implement`, `implement` creates it. **Idempotent:** if the file already exists, the skill reads it and never overwrites it.

1. If `.claude/sdd.local.md` is absent, write it. Use **the documented frontmatter below, and then the «What each key does» section as the markdown body of the file**. Thus, the file documents itself: each key shows its default, its allowed values and a plain explanation. The user does not have to open the plugin docs.
2. **Patch `.gitignore`** (create it if absent). Add `.claude/*.local.md` and `.worktrees/`. These files are for each developer, and nobody must commit them. The `.claude/*.local.md` glob already includes `sdd.local.md`. Do not add a redundant explicit line.
3. Tell the user: «Wrote `.claude/sdd.local.md` with documented defaults — edit it to change how the pipeline behaves.»

## The documented frontmatter

<!-- This block is written verbatim to the top of `.claude/sdd.local.md`; the «What each key does»
     section below becomes the file's body. Keep the inline comments — they list the allowed values. -->

```yaml
interview_depth: medium    # easy | medium | hard — plugin-wide default for specify/clarify/design (see _shared/interview-depth.md)
artifact_language: en      # en | uk (any language tag) — language pipeline DOCUMENTS are written in; headings + machine tokens stay English (see _shared/artifact-language.md)
tdd: true                  # enforce red→green→refactor
team_mode: false           # true → agent team via TeamCreate
workflow_mode: auto        # auto → dynamic Workflow; off → never
max_parallel_agents: 3     # integer ≥1 — fan-out cap for team/workflow modes (1 = sequential)
isolation: worktree        # worktree | inplace (parallel>1 ⇒ forces worktree)
stop_on_red: true          # halt on a red that survives escalation, vs drop-and-continue
max_red_retries: 3         # integer ≥1 — RED→GREEN attempts before escalation
gate_lint: true            # true | false — include lint in the per-task gate
gate_vet: true             # true | false — include vet / static-analysis in the per-task gate
require_integration: auto  # auto | always | never (Docker-probed)
auto_commit: per_task      # per_task | per_phase | off
branch_strategy: feature   # feature | current
cmd_test_unit: ""          # empty = autodetect (escape hatch)
cmd_test_integration: ""
cmd_lint: ""
cmd_vet: ""
model_test_author: sonnet     # per-role model (see _shared/agent-roster.md); inherit = session model
model_implementer: sonnet
model_reviewer: opus
judgment_model: opus       # opus | fable — one switch for ALL judgment agents (reviewer/critic/devils-advocate/strategist/analyst); per-role model_<role> wins for its role
effort_test_author: medium    # per-role effort; raised to high on escalation
effort_implementer: medium
effort_reviewer: high
dashboard_enabled: false   # true → opt into the SDD visual dashboard (the sdd-dashboard MCP server + browser UI); see skills/start
dashboard_port: 4178       # integer — loopback port the dashboard binds (scans upward if busy); read by the server
```

## What each key does

- **`interview_depth`** — `easy | medium | hard`. The plugin-wide default for the depth dial of the **Q&A skills** (`specify` / `clarify` / `design`).
  - The dial controls how much each skill decides itself and how much it asks you. This includes the number of questions, the autonomy, which ideation analyses run, and the choice between a confirmation for each diagram and no confirmation.
  - It only **pre-selects** the recommended option in the opening depth question of each skill. The user can still select a different option for each run, or give `--depth=` to skip the question.
  - It does **not** change AC-completeness. AC-completeness is a minimum at each level.
  - Full semantics → [`../../_shared/interview-depth.md`](../../_shared/interview-depth.md). The `implement` engine itself does not read this key.
- **`artifact_language`** — `en | uk` (any language tag; default `en`). The language of the **pipeline documents**.
  - **Each artifact-writing skill** reads it (spec, SAD, ADRs, sequences, data-model, contracts, tasks, test plan, review/fix records, changelog, roadmap, CONTEXT.md). The `implement` engine does not read it.
  - Only the **prose** changes: paragraphs, table cells, diagram labels, and the prose fields of `tasks.json` / `openapi.yaml`.
  - The **structure stays English**: section headings verbatim from the template, frontmatter keys and values, verdict literals, tracker states, Mermaid keywords and machine fields.
  - Precedence for edits: the language of an existing file has priority over the setting. A new file uses the language of the other files in its feature folder. Never translate an existing file again.
  - Full rule and the never-translate token list → [`../../_shared/artifact-language.md`](../../_shared/artifact-language.md).
- **`tdd`** — when false, the engine skips RED and writes code directly. It gives a warning, because you lose the safety net.
- **`team_mode` / `workflow_mode`** — inputs for the decision tree (see [`decision-tree.md`](./decision-tree.md)). If both can apply, `team_mode` has priority.
- **`max_parallel_agents`** — the fan-out limit for team/workflow modes. `1` forces sequential mode.
- **`isolation`** — `worktree` gives each parallel agent its own git worktree under `.worktrees/`. `inplace` edits the checkout directly and **sets parallel work to 1**.
- **`stop_on_red`** — `true`: a red that stays after escalation stops the run. `false`: drop that task, block its dependents automatically and continue the other branches.
- **`max_red_retries`** — the number of RED→GREEN tries before escalation (see [`escalation.md`](./escalation.md)).
- **`gate_lint` / `gate_vet`** — include lint / vet in the per-task gate. If no command is detected, the gate is skipped with no failure (see [`command-detection.md`](./command-detection.md)).
- **`require_integration`** — `auto`: run integration tests if a Docker daemon answers, else mark NON-red. `always`: BLOCK before dispatch if Docker is absent. `never`: skip the full integration tier.
- **`auto_commit`** — `per_task` (default), `per_phase`, or `off` (the user makes the commits).
- **`branch_strategy`** — `feature`: make sure that the work is on a feature branch (create one if the repo is on the default branch). `current`: commit on the current branch.
- **`cmd_*`** — explicit command overrides. A non-empty value stops the detection. This is the escape hatch for unusual repos.
- **`dashboard_enabled`** — `true | false` (default `false`). Opt into the **SDD visual dashboard**.
  - The `sdd-dashboard` MCP server (auto-started from `.mcp.json`) binds a loopback HTTP+WS listener. It serves the read-only browser UI.
  - The UI shows the pipeline stage of each feature and renders its artifacts. It controls the pipeline: it sends `/sdd:<skill> <slug>` commands back into the live session.
  - When the value is `false` (or absent), the server stays idle. The markdown skills do not change.
  - Run `/sdd:start` after you enable it. **Bun** must be installed.
  - The `implement` engine does not read this key. The dashboard server and the `start` skill read it.
- **`dashboard_port`** — integer (default `4178`). The loopback port that the dashboard binds. If the port is busy, the server scans upward (`4178..4189`), and `/sdd:start` prints the actual port. The server binds only `127.0.0.1`. Mutating routes must have the per-session capability token that `/sdd:start` issues.
- **`model_*` / `effort_*`** — the model and effort of each of the three agents. The engine applies them when it starts the agents, and they override the default in the agent frontmatter. Roster defaults and rationale → [`../../_shared/agent-roster.md`](../../_shared/agent-roster.md). Precedence: env var > this setting > agent frontmatter > session.
- **`judgment_model`** — `opus | fable` (default `opus`). One switch for **all judgment agents**: `reviewer` / `critic` / `devils-advocate` / `strategist` / `analyst`.
  - With it, you can raise the judgment tier to `fable` (the Mythos-tier model) in one location. You do not have to touch `agents/*.md`.
  - A per-role `model_<role>` key still has priority for its role. Full precedence (highest first): `env > invocation > model_<role> > judgment_model > frontmatter > session`.
  - This key does not change the execution agents (`test-author` / `implementer`), `explorer` or `researcher`.
  - **Env path:** when these keys are set, the engine also exports `CLAUDE_CODE_EFFORT_LEVEL` / `CLAUDE_CODE_SUBAGENT_MODEL` for the dispatch. This is the reliable control (see [`agent-roster.md`](../../_shared/agent-roster.md) for why the frontmatter alone is possibly not enough).
  - **`.size` scaling:** before dispatch, the engine raises the default effort for **L/XL** features (execution agents → `high`). It keeps the low-cost defaults for **XS/S**. A cross-module change is where more reasoning depth gives value. The engine prints the resolved model and effort of each role in the banner.

## Reading semantics

The engine ignores unknown keys (forward-compatible). If a key is missing, the engine uses the default above. If the file is malformed, the engine gives a warning and uses all defaults. It does not fail the run.
