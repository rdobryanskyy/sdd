# Decision tree — picking the execution mode (step 5)

The engine has three modes:

- **Sequential single-agent TDD.** All other modes fall back to this mode.
- **Agent team** (TeamCreate).
- **Dynamic Workflow.**

The selection is deterministic. There is no judgment call at runtime.

## Inputs to the decision

These inputs come from step 4 (DAG) and step 2 (settings):

- `task_count` — the number of tasks.
- `parallel_width` — the maximum number of tasks that can run at the same time (the widest Kahn layer).
- `longest_chain` — the length of the critical path. This value is only for information. The banner shows it.
- `size` — the `.size` of the feature (XS/S/M/L/XL), or M if it is absent.
- The settings: `team_mode`, `workflow_mode`, `isolation`, `max_parallel_agents`.
- Runtime: is the `Workflow` tool available? Is `TeamCreate` available?

## Eligibility

```
parallel_eligible :=
      isolation == "worktree"
  AND max_parallel_agents > 1
  AND parallel_width >= 2
  AND (size in {M, L, XL} OR task_count >= 4)
```

Rationale: parallel work gives a gain only when all these conditions are true:

- There is real concurrent work (`parallel_width >= 2`).
- The feature is not trivial (`M+` or `>=4` tasks).
- The agents cannot collide (`worktree`).
- More than one agent is permitted.

## Selection

```
if team_mode AND parallel_eligible AND TeamCreate-available:
    → AGENT TEAM over the DAG            (see team-exec.md)
elif workflow_mode == "auto" AND parallel_eligible AND Workflow-available:
    → DYNAMIC WORKFLOW                    (see workflow-exec.md)
else:
    → SEQUENTIAL single-agent TDD (topo order)
```

If `team_mode` and `workflow_mode` can both apply, `team_mode` has priority. The team is the richer mode: it has a human-shaped structure and a reviewer. The workflow is the unattended mode.

## Guards (apply before dispatch — they can only make the engine safer)

| Condition | Action |
|---|---|
| `team_mode: true` but `parallel_eligible` is false | Warn («team needs ≥2 parallel tasks and M+/≥4 tasks; this feature has <…>»). Then **downgrade** to the next applicable mode: workflow if eligible, else sequential. |
| `max_parallel_agents > 1` and `isolation: inplace` | Set parallel work to 1. Two agents must never edit one working tree. The result is sequential mode. |
| `workflow_mode: off` | Never generate a Workflow, also when the feature is eligible. |
| `Workflow` tool not available at runtime | Skip the workflow branch. Go to team (if eligible) or sequential. This is a safe fallback. Never give an error. |
| `TeamCreate` not available at runtime | Skip the team branch. Go to workflow or sequential. |
| `tdd: false` | Skip the RED step in all modes. Give a strong warning, because you lose the safety net. |
| `require_integration: always` and Docker unreachable | **BLOCK** before dispatch. Do not start work that cannot pass its own gate. |
| `require_integration: auto` and Docker unreachable | Continue. Mark the integration tier NON-red for each task. It is not a pass and not a fail. |
| `require_integration: never` | Skip the integration tier with no message. Still run unit, lint and vet. |

## Banner (step 7)

After the tree and the guards give a result, print what will occur. Example:

```
SDD implement — feature: notification-preferences
  mode          = AGENT TEAM (3 agents)        [team_mode=true, parallel_width=3, size=M]
  tdd           = on
  isolation     = worktree
  integration   = auto (docker: reachable)
  commit        = per_task  (branch: proof/sdd-notification-preferences)
  tasks         = 6   phases = 4   longest_chain = 4
```

The banner is mandatory. The user must see the mode and the settings that caused it before the engine writes code.
