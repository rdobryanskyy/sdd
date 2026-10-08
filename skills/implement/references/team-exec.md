# Agent-team execution (`team_mode: true`)

When the decision tree selects the team, the engine becomes a **lead**. The lead coordinates three roles through a shared task list. Each agent has one git worktree. The lead makes the commits one at a time. Use this mode for features with real parallel width, when you also want an independent review pass.

## Roles (the shipped subagents)

Start each role with its plugin-namespaced `subagent_type`: `sdd:test-author`, `sdd:implementer`, `sdd:reviewer` (see [`../../_shared/agent-roster.md`](../../_shared/agent-roster.md) §Dispatching).

- **[`test-author`](../../../agents/test-author.md)** (`sdd:test-author`) — RED only.
  - Writes the failing tests for the `acs` of a task and runs them.
  - Classifies the first run (GOOD/BAD/false-pass/NON-red, from [`tdd-loop.md`](./tdd-loop.md)).
  - Gives the quoted failing line to the next role. Never writes production code.
- **[`implementer`](../../../agents/implementer.md)** — GREEN + REFACTOR + GATE.
  - Gets a task with its red test and writes the minimal code to pass.
  - Refactors while the tests stay green, then runs the per-task gate. Never makes the test weaker.
- **[`reviewer`](../../../agents/reviewer.md)** — read-only. It has no write tools. It has two stages:
  - Stage 1: spec/AC compliance. Does the change satisfy the `acs` that it claims?
  - Stage 2: quality (conventions, edge cases, anti-patterns).

## Setup

1. Create the team (`TeamCreate`). Fill a shared **TaskList** from `tasks.json`.
   - Put **the full task text in each task body**: title, the `acs` text from spec §5, `dod` and `files_hint`.
   - The teammates do NOT read the plan or the conversation. The task body is their full brief.
   - Add this instruction to each task body: «Write your report, code comments and commit messages in ASD-STE100 Simplified Technical English.»
2. Give each agent its own git **worktree** under `.worktrees/<agent>`. The team must have `isolation: worktree`, and the guard enforces it. Two agents never share a tree.
3. Set the **model + effort** for each role, as [`../../_shared/agent-roster.md`](../../_shared/agent-roster.md) tells:
   - Use `model_*` / `effort_*` and the `.size` scaling. Export the env vars for the dispatch.
   - The roster defaults are: test-author/implementer `sonnet`+`medium`, reviewer `opus`+`high`.
   - Print the resolved model and effort for each role in the banner.

## Flow per task

`test-author` (RED) → `implementer` (GREEN+REFACTOR+GATE) → `reviewer` (review). A task starts only when its `deps` are `done`. The lead takes ready tasks from the DAG and gives them to agents. Up to `max_parallel_agents` agents run at the same time.

## Serialization lanes (the lead enforces)

Some tasks must not run at the same time, also with worktrees:

- **`layer: migration`** — migrations are an ordered sequence (for example, the numbered files of golang-migrate). Run them one at a time, in sequence. Each migration task first **promotes** its staged `docs/features/<slug>/migrations/<NN>_*` file into the live tree (next free number, in ordinal order). Then it applies the file — see [`./inputs.md`](./inputs.md).
- **Overlapping `files_hint`** — two tasks that touch the same file go into the same lane (one after the other). Or the second task rebases on the first. Calculate the lanes from the `files_hint` intersections at the start.
- **Compile-coupled pair** — a shared-contract change and its implementers share the contract file in `files_hint`. Thus, the rule above puts them into one lane. Also:
  - The lead gives the pair a synthetic dep (contract → implementer).
  - The lead closes the pair with **one shared gate + one commit**. The commit has the `SDD-Task`/`SDD-AC` trailers of all the tasks ([`tdd-loop.md`](./tdd-loop.md) §COMMIT).
  - No task of the pair can have a separate green commit.

Tasks in different lanes with satisfied deps run in parallel. Tasks in the same lane wait in a queue.

## Commits

The lead **makes the commits one at a time, in dependency order**. The time when the work finished does not change this order. For each `done` task, the lead gets the changes from the agent worktree. Then the lead commits them on the feature branch with the `SDD-Task`/`SDD-AC` trailers ([`tdd-loop.md`](./tdd-loop.md)). The history is linear and bisectable, although the work occurred at the same time.

## Don't over-orchestrate

- **<4 tasks → no team.** The eligibility check already prevents it. If you get here with a very small DAG, downgrade to sequential. The coordination cost is larger than the gain.
- If a red in one lane stays after escalation, `stop_on_red` controls the result. Stop the full team, or drop that task, block its dependents automatically and let the other lanes finish ([`escalation.md`](./escalation.md)).
- Remove the team at the end. Remove the worktrees (they clean automatically if they did not change).
