# Agent roster — model / effort policy + the shared agent contract

> **Reference-only.** Not a skill. Skills and the implement engine read this file for three items:
> the model/effort matrix, the override precedence, and the contract that each spawned agent obeys.
> The canonical agent definitions are in `agents/*.md`. This file is the policy that connects them.

## The roster (model + effort by role)

The **type of work** sets the model, not personal preference. Judgment gets the strongest model. Execution gets a balanced model. Search and scan get the model with the lowest cost. Effort is the reasoning depth that the role must have.

| Agent | Kind of work | `model` | `effort` | Tools |
|---|---|---|---|---|
| `explorer` | brownfield scan / search (read-only) | `haiku` | `low` | Read, Grep, Glob, Bash |
| `test-author` | write the failing test (execution) | `sonnet` | `medium` → `high` on escalation | + Write, Edit |
| `implementer` | green + refactor + gate (execution) | `sonnet` | `medium` → `high` on escalation | + Write, Edit |
| `reviewer` | independent review (judgment) | `opus` | `high` | Read, Grep, Glob, Bash |
| `critic` | coherence critique (judgment) | `opus` | `high` | Read, Grep, Glob |
| `devils-advocate` | ambiguity hunt (judgment) | `opus` | `high` | Read, Grep, Glob |
| `researcher` | competitive / adjacent-solution research (ideation) | `sonnet` | `medium` | Read, Grep, Glob, WebSearch, WebFetch |
| `strategist` | generate the 3 strategic approaches (judgment) | `opus` | `high` | Read, Grep, Glob |
| `analyst` | multi-perspective review of approaches (judgment) | `opus` | `high` | Read, Grep, Glob |

Rationale:

- A stronger model gives the most value for judgment quality: review, critique, ambiguity, strategy and multi-perspective synthesis.
- A balanced model is good for execution (write code and tests to a clear spec). Execution escalates only when it cannot continue.
- A read-only scan has a low cost.
- The **ideation trio** (`specify` step 3, controlled by the depth dial) uses the same logic. `researcher` collects and cites information, so it gets a balanced model and web tools. `strategist` and `analyst` do judgment (they generate real alternatives and make a synthesis across lenses), so they get the strongest model.
- Use model-by-role as a sound principle. The claim from multi-agent papers that "stronger orchestrator + cheaper workers wins by X%" failed verification. Thus we use role fit, not a fixed ratio.

## Dispatching (`subagent_type`)

These agents are **plugin-namespaced**. Spawn each agent with `subagent_type: "sdd:<name>"`. This is the id that Claude Code registers and shows in the list of available agents. Do **not** use the bare name, and do **not** use an `sdd-…` prefix:

`sdd:explorer` · `sdd:test-author` · `sdd:implementer` · `sdd:reviewer` · `sdd:critic` · `sdd:devils-advocate` · `sdd:researcher` · `sdd:strategist` · `sdd:analyst`

Thus, when a skill says «dispatch the `explorer` agent», the call is `subagent_type: "sdd:explorer"`.

- If the namespaced agent is not available at runtime, use the general-purpose (or `Explore`) agent that the skill names. Give it the same prompt.
- A fallback agent never reads `agents/*.md`. It gets all necessary information from the prompt only. When the host runs the agent in background/teammate mode, this includes **the instruction for async report delivery** (point 2 of the shared contract below).
- Each dispatch prompt tells the subagent to write its report in ASD-STE100 → [`ste100.md`](./ste100.md).

### Cross-tool dispatch

The `subagent_type: "sdd:<name>"` form is **only for Claude Code**. It is the id that the plugin loader
registers. Under **Codex CLI / Cursor**, the installer generates a custom agent with the name `sdd-<name>`
(in `.codex/agents/` / `.cursor/agents/`). Dispatch that agent. If the host has no agent mechanism
that you can use, run the instructions of the agent file **inline** in the current context. The
same rule applies: degrade, do not block. The full mapping table is in [`tool-adapters.md`](./tool-adapters.md).

## Override precedence (highest wins)

```
env var  >  per-invocation (the Agent call)  >  model_<role>  >  judgment_model  >  frontmatter  >  session
```

**`judgment_model`** (`.claude/sdd.local.md`; `opus | fable`, default `opus`) is the one switch for
the model tier of the **judgment agents**: `reviewer` / `critic` / `devils-advocate` / `strategist` /
`analyst`.

- If you set it to `fable`, all five agents use the Mythos-tier model. You do not change
  `agents/*.md` (their frontmatter keeps the tier-alias default).
- A `model_<role>` key for one role still wins for that role.
- It never applies to the execution roles (`test-author` / `implementer`) or to the
  roles that collect information (`explorer` / `researcher`).

See the settings doc: [`../implement/references/settings.md`](../implement/references/settings.md).

- **`model`** env: `CLAUDE_CODE_SUBAGENT_MODEL`. Values: `haiku|sonnet|opus|inherit|<full-model-id>`.
- **`effort`** env: `CLAUDE_CODE_EFFORT_LEVEL`. Values: `low|medium|high|xhigh|max|<number>` (`xhigh`/`max` only on Opus 4.8 / 4.7).
- The `CLAUDE_CODE_*` env vars are controls **only for Claude Code**. Codex CLI / Cursor ignore them. On those hosts, select the model in the settings of the host.
- Overrides for one project are in `.claude/sdd.local.md` as `model_<role>` / `effort_<role>` keys (see the implement settings).

> **Caveat (verify on your build).** Some Claude Code builds have reported that the `effort:`
> *frontmatter* has no visible effect at runtime (GitHub claude-code#43083). The field has
> documentation and we set it. But use the **env path** (`CLAUDE_CODE_EFFORT_LEVEL`) as the reliable
> control. The `effort_*` settings keys for each role map to it. If a run does not reason deeply enough, set the env var.

## Scale with feature size

The default effort and model change with the feature `.size` (see [`size-matrix.md`](./size-matrix.md)):

- **XS/S** → keep the roster defaults (low cost; the work is small).
- **M** → roster defaults. Escalation handles the difficult tasks.
- **L/XL** → increase the execution effort to `high`. **The critical verifications go to `xhigh`**:
  - The `reviewer` (dispatched by `review`) and the `critic` (dispatched by `design` / `specify`) run at
    `effort: xhigh` through `CLAUDE_CODE_EFFORT_LEVEL` (the reliable control; see the caveat above).
  - The other judgment agents stay at `high`.
  - Reasoning depth gives value in a cross-module change. It gives the most value in the final review and critique.

A skill or engine that knows the size applies this before the dispatch and says so in its banner.

## The shared agent contract (every spawned agent)

1. **Clean, isolated context by default.** A spawned agent does **not** see the parent conversation, the tool results, the system prompt, the skills that ran, or the files that were read. **The Agent prompt string is the only channel.**
   - Thus the skill that dispatches the agent must put the paths, the draft/diff and the decisions in the prompt explicitly.
   - The agent reads the upstream artifacts again itself.
   - Only the final message of the agent comes back.
   - This isolation *is* the "fork" for an independent review or critique. The value is a new, independent view.
   - **Fork mode** (`CLAUDE_CODE_FORK_SUBAGENT`, experimental) gets the full conversation and shares the prompt cache. Use it **only** for a live side task that really must have the current context. Never use it for `reviewer` / `critic` / `devils-advocate`, because their value is independence.
2. **The report must get to the dispatcher.** The final message IS the deliverable. When the host runs subagents asynchronously (background/teammate mode), the dispatching skill adds this text to the prompt: «also send your full final report as a message to your dispatcher (main)». An idle or completion signal without content is NOT a verdict. Before the dispatcher continues, it gets the report through the messaging channel of the host.
3. **Worker preamble.** When an orchestrator (the implement team/workflow) delegates a task, it puts this text around the task: «execute directly, do not spawn sub-agents, use tools directly, report results with absolute file paths». A subagent cannot spawn subagents, so the lead controls the fan-out.
4. **Verify before claiming done.** Before you say "done / fixed / passing", do these steps: IDENTIFY the command that proves it → RUN it → READ the output → only then make the claim, with the evidence. Words such as "should / probably / seems" are a red flag: they show that the verification did not run.
5. **Cite or drop.** Read-only judgment agents (reviewer/critic/devil's-advocate) give only findings with citations (`file:line` + the artifact/AC clause). If a finding has no citation, drop it. Do not ship it.
