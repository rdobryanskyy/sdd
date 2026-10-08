# Tool adapters — running SDD under Codex CLI / Cursor (the cross-tool mapping)

> **Reference-only.** Not a skill. The skills use the mechanisms of Claude Code
> (`/sdd:<name>` invocation, `AskUserQuestion`, named subagents, `TeamCreate` / `Workflow`,
> `/clear`). SKILL.md is the open Agent Skills format. Thus Codex CLI and Cursor run the **same
> files without changes**. `install.sh` copies the repo subtree verbatim. Each Claude-specific
> mechanism maps to the equivalent in the host tool, per the table below. At install time, each
> skill name gets an `sdd-` prefix, because the bare `review` / `design` / `api` names can collide
> with generic names. Thus the Claude form `/sdd:specify` keeps its mapping: `sdd-specify`.

## The mapping

| Mechanism (as written in the skills) | Claude Code | Codex CLI | Cursor |
|---|---|---|---|
| Invoke a stage | `/sdd:specify <slug>` | `$sdd-specify <slug>` | type `/`, select `sdd-specify` |
| Ask the user (`AskUserQuestion`) | the native tool | numbered questions in plain text. **Stop and wait** for the answer. Never assume an answer | same as Codex |
| Spawn a subagent (`subagent_type: "sdd:researcher"`) | the named plugin agent | custom agent `sdd-researcher`, installed into `.codex/agents/` (dispatch through `/agent`). Or run the instructions of the agent file inline | subagent `sdd-researcher`, installed into `.cursor/agents/`. Or inline |
| `TeamCreate` / `Workflow` (the `implement` engine modes) | native | sequential single-agent TDD. This is already the documented fallback floor | same as Codex |
| Fresh context between stages | `/clear` | `/new` | start a new chat |
| `model:` / `effort:` frontmatter | honored | advisory. The installer changes the `model:` of the generated agents to `inherit`. The frontmatter in the verbatim skill/agent copies stays as documentation | same as Codex |
| Shared artifacts (`.size`, `.route`, `spec.md` + the other `docs/features/<slug>/…` files, `.claude/sdd.local.md`) | repo-relative files that the **model itself** reads and writes with its file tools | identical. The host does not touch them, thus they work without changes. Here, `.claude/` is only a directory in the repo, not a host config directory | same as Codex |

The roster mentions some `CLAUDE_CODE_*` env vars (`CLAUDE_CODE_SUBAGENT_MODEL`,
`CLAUDE_CODE_EFFORT_LEVEL`, `CLAUDE_CODE_FORK_SUBAGENT`). These are **Claude Code-only**. Codex CLI
and Cursor ignore them. Use the model settings of the host instead.

## The rule

If a mechanism is not available in the host tool, **use the inline sequential equivalent.
Never block the stage** because a host feature is missing. Each run still prints the full
stage-handoff block ([`handoff.md`](./handoff.md)). Only use the invocation form and the
fresh-context form of the host from the table above.
