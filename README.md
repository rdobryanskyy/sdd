# SDD — Spec-Driven Development for Claude Code

A self-contained Claude Code plugin that carries a feature from a one-line idea to
implemented, tested code through **12 atomic, stack-agnostic skills** and a **TDD
implementation engine** with agent-team and dynamic-workflow modes.

Every skill is Socratic (it walks decisions with you, it doesn't dump a wall of output),
gated (a stage hard-refuses when its prerequisite artifact is missing), and stack-agnostic
(no language, tracker, or test-tool is hard-coded — the skills detect what your repo uses).

## Install

```text
/plugin marketplace add genkovich/sdd
/plugin install sdd@sdd
```

Then trigger any skill by name (`/sdd-classify-size <slug>`, `/sdd-specify <slug>`, …) or
just describe the work in natural language — the descriptions trigger the right skill.

## The pipeline

Artifacts land in `docs/features/<slug>/`. Run the skills in order; each reads the previous
one's output and refuses if it's missing.

| # | Skill | Produces | Reads |
|---|---|---|---|
| 0 | **classify-size** | `.size` (XS/S/M/L/XL) | the idea |
| 1 | **specify** | `spec.md` (PRD + acceptance criteria) | the idea, `CONTEXT.md` |
| 2 | **clarify** | resolved `spec.md` (ambiguities closed/deferred) | `spec.md` |
| 3 | **glossary** | `CONTEXT.md` (lazy domain glossary) | the spec, the repo |
| 4 | **design** | `sad.md` (Arc42 + C4 L1/L2) + `adr/*.md` | `spec.md`, `CONTEXT.md` |
| 5 | **sequences** | `sad.md §6` Mermaid sequence diagrams | `sad.md`, `spec.md` |
| 6 | **data-model** | `data-model.md` + paired `*.up.sql`/`*.down.sql` | `spec.md`, `sad.md`, sequences |
| 7 | **api** | `contracts/openapi.yaml` + drift report | `data-model.md`, sequences, `spec.md` |
| 8 | **tasks** | `tasks/{_epic,tracker,*}.md` + **`tasks.json`** | all of the above |
| 8a | **decide-adr** | `adr/NNNN-*.md` (post-hoc) | `sad.md`, the decision |
| 9 | **plan-tests** | `test-plan.md` (AC → tests) | `spec.md`, `data-model.md` |
| 10 | **implement** | code + tests + wiring, committed per task | `tasks.json` + all artifacts |

`classify-size` and `glossary` are utilities you can run any time. `decide-adr` fills an ADR
gap that `tasks` (or a review) flags.

## The implementation engine

`implement` reads `tasks.json` (emitted by `tasks`), builds a dependency DAG, and runs a
**TDD cycle per task**: `SELECT → RED → GREEN → REFACTOR → GATE → COMMIT`. It writes a failing
test first, proves the failure is for the right reason, writes the minimal code to pass, keeps
refactors green, runs unit + (when available) integration + lint + vet gates, and commits with
`SDD-Task` / `SDD-AC` trailers.

Three execution modes, chosen automatically from settings + DAG shape (with graceful fallback):

- **Sequential single-agent TDD** — the default and the floor everything degrades to.
- **Agent team** (`team_mode: true`) — `sdd-test-author` → `sdd-implementer` → `sdd-reviewer`
  over the DAG, coordinated through a shared task list, one git worktree per agent.
- **Dynamic workflow** (`workflow_mode: auto`) — a generated `Workflow` pipeline that fans out
  independent tasks up to a parallelism cap, each task a `write-test → implement → verify →
  review → commit` chain.

### Configuration — `.claude/sdd.local.md`

`implement` lazy-creates this per-project settings file (YAML frontmatter) on first run with
safe defaults. Edit it to change behaviour:

```yaml
tdd: true                  # enforce red→green→refactor
team_mode: false           # true → agent team via TeamCreate
workflow_mode: auto        # auto → dynamic Workflow; off → never
max_parallel_agents: 3
isolation: worktree        # worktree | inplace (parallel>1 ⇒ forces worktree)
stop_on_red: true
max_red_retries: 3
gate_lint: true
gate_vet: true
require_integration: auto  # auto | always | never (Docker-probed)
auto_commit: per_task      # per_task | per_phase | off
branch_strategy: feature   # feature | current
cmd_test_unit: ""          # empty = autodetect (escape hatch)
cmd_test_integration: ""
cmd_lint: ""
cmd_vet: ""
model_test_author: inherit
model_implementer: inherit
model_reviewer: inherit
```

Command detection is a stack-agnostic cascade: settings override → Makefile targets →
`package.json` scripts → language manifests (`go.mod`, `Cargo.toml`, `pyproject.toml`, …) →
Docker probe for the integration tier. Nothing is hard-coded to one language.

## Quick start

```text
/sdd-classify-size checkout-discounts
/sdd-specify checkout-discounts
/sdd-clarify checkout-discounts
/sdd-design checkout-discounts
/sdd-data-model checkout-discounts
/sdd-api checkout-discounts
/sdd-tasks checkout-discounts
/sdd-implement checkout-discounts
```

## Repository layout

```
.claude-plugin/   plugin.json + marketplace.json (self-marketplace)
agents/           sdd-test-author, sdd-implementer, sdd-reviewer
skills/_shared/   canonical socratic-loop / critic / size-matrix / ask-style (referenced, not duplicated)
skills/<name>/    SKILL.md spine + references/ (heavy detail) + templates/ (output scaffolds)
```

## License

MIT © Kyrylo Genkov. See [LICENSE](./LICENSE).
