# Tool adapters — running SDD under Codex CLI / Cursor (the cross-tool mapping)

> **Reference-only.** Not a skill. The skills are written against Claude Code's mechanisms
> (`/sdd:<name>` invocation, `AskUserQuestion`, named subagents, `TeamCreate` / `Workflow`,
> `/clear`). SKILL.md is the open Agent Skills format, so Codex CLI and Cursor run the **same
> files unchanged** — `install.sh` copies the repo subtree verbatim and each Claude-specific
> mechanism maps to the host tool's equivalent per the table below. At install time every skill
> name gets an `sdd-` prefix (the bare `review` / `design` / `api` would collide with generic
> names), so the Claude form `/sdd:specify` keeps its mapping: `sdd-specify`.

## The mapping

| Mechanism (as written in the skills) | Claude Code | Codex CLI | Cursor |
|---|---|---|---|
| Invoke a stage | `/sdd:specify <slug>` | `$sdd-specify <slug>` | type `/`, pick `sdd-specify` |
| Ask the user (`AskUserQuestion`) | the native tool | numbered questions in plain text — **stop and wait** for the answer, never assume one | same as Codex |
| Spawn a subagent (`subagent_type: "sdd:researcher"`) | the named plugin agent | custom agent `sdd-researcher` installed into `.codex/agents/` (dispatch via `/agent`), or run the agent file's instructions inline | subagent `sdd-researcher` installed into `.cursor/agents/`, or inline |
| `TeamCreate` / `Workflow` (the `implement` engine modes) | native | sequential single-agent TDD — already the documented fallback floor | same as Codex |
| Fresh context between stages | `/clear` | `/new` | start a new chat |
| `model:` / `effort:` frontmatter | honored | advisory — the host ignores it | advisory — the host ignores it |

## The rule

When a mechanism is unavailable in the host tool, **degrade to the inline sequential
equivalent — never block the stage** on a missing host feature. The stage-handoff block
([`handoff.md`](./handoff.md)) is still printed in full every run; only substitute the host's
invocation + fresh-context forms from the table above.
