# SDD behaviour evals — on-demand, NOT CI

These evals are end-to-end scenarios. Each scenario runs a real `claude` session on a fixture repo.
Then an LLM judge examines the outcome against a rubric. The evals add to
`scripts/validate_plugin.py` (structure) and `server/tests/` (deterministic runtime). The evals
make sure that the **protocol of a skill really operates correctly**: gates refuse, artifacts
have the correct shape, and the skill emits its handoffs.

> **Why not CI.** Each run calls `claude -p` (the run under test) and a judge. It costs real
> tokens, it takes minutes, and it is not deterministic. When you change the protocol of a skill,
> run the evals locally. CI stays deterministic (`validate` + `server-tests`).

## Prerequisites

- The `claude` CLI is installed, and you are logged in. You do **not** have to install the sdd
  plugin. `run.sh` loads the plugin from this checkout with `--plugin-dir`. Thus the eval
  exercises the working tree, not an installed version.
- `jq` and `git` are on PATH.
- Budget: one scenario ≈ one short agent session + one judge call.

## Run

```bash
./evals/run.sh                        # all scenarios
./evals/run.sh design-gate-refusal    # one scenario
SDD_EVAL_MODEL=opus ./evals/run.sh classify-size   # override the model
```

If the verdict of a scenario is `FAIL` (or the verdict cannot be parsed), the exit code is not zero.

## How a scenario works

1. `run.sh` copies `scenarios/<name>/fixture/` into a `mktemp` dir. Then it does `git init && commit`
   (the baseline).
2. It runs `claude -p "$(cat prompt.txt)" --permission-mode acceptEdits --max-turns 40
   --output-format json` **inside that dir**. The prompts always set `--depth=easy` and state
   «headless — no interactive user». The reason: a headless run cannot answer `AskUserQuestion`.
3. Then it asks a judge (`claude -p` with [`judge-prompt.md`](./judge-prompt.md)) to examine the
   **rubric** against this evidence:
   - the file tree;
   - the `git log`, so that rubrics can count and examine the commits of the run (`Bash(git:*)`
     is pre-allowed in the temporary workdir, so runs CAN commit);
   - the full `git diff` against the fixture baseline (committed + uncommitted);
   - the tail of the final message of the run.

   The judge answers with one JSON object:
   `{"verdict": "PASS"|"FAIL", "checks": [...]}`.

## Scenarios

| Scenario | What it proves |
|---|---|
| `specify-happy-path` | `/sdd:specify` makes a spec.md with §1–§8, business-observable ACs, `.size` + `.route`, and the handoff block |
| `design-gate-refusal` | `/sdd:design` on a folder with `.size` but **no spec.md** refuses, points to `specify`, and writes no sad.md/ADRs |
| `classify-size` | `/sdd:classify-size` writes a one-token `.size` + `.route` and gives the handoff (utility variant) |
| `api-fastlane-no-datamodel` | `/sdd:api` on a feature with no schema change and **without** data-model.md does not refuse. It derives the contract from the existing schema, names the legal skip + «existing schema» origins, and emits the handoff |
| `api-schema-change-refusal` | `/sdd:api` on a feature **with** a schema change (staged migration + new sad §5 entity) and no data-model.md hard-refuses. It names `data-model`, writes no contract and does not write a data-model.md itself |
| `design-quick-commit-batching` | `/sdd:design` on route quick + depth easy writes all 12 SAD sections to disk, but puts the commits in batches: ≤4 after the baseline (bootstrap + ≤3 batches), not one for each section |
| `tasks-compile-coupled-lane` | `/sdd:tasks` on a Go feature that extends a shared interface emits no standalone interface-only task. It folds the contract change into a task, or it marks the compile-coupled pair with a shared `files_hint` |
| `terminal-run-no-dashboard-ask` | A TERMINAL `/sdd:design --depth=hard` run, with the dashboard MCP (and its `dashboard_ask` tool) in context, keeps its questions in the terminal. It asks in the final message or decides itself. It never sends the decision to the dashboard/panel |

## Adding a scenario

Make `scenarios/<name>/` with three parts:

- `fixture/` — the start repo tree. The baseline git commit contains it. Keep it minimal.
- `prompt.txt` — the exact `-p` prompt. It contains the `/sdd:` command line and the headless
  framing. State the idea and the answers inline. Always use `--depth=easy`.
- `rubric.md` — numbered PASS conditions. The judge must be able to examine each condition from
  the diff, the tree or the final message only. Make each item observable. «the model tried» is
  not a rubric item.
