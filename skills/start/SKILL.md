---
name: start
model: inherit
effort: low
agents: []
description: >
  Use to open the SDD visual dashboard. The dashboard is the local read-only browser UI. It shows
  the pipeline stage of each feature and renders its artifacts (markdown, mermaid C4/sequence/ER,
  OpenAPI as plain YAML). It drives the pipeline: it sends /sdd:<skill> commands back into this
  live session. Triggers on "start the dashboard", "open the SDD
  dashboard", "sdd dashboard", "/sdd:start", "show the pipeline UI", "open the dashboard",
  "launch the SDD panel". The sdd-dashboard MCP server starts automatically when the session opens
  (through .mcp.json). It resolves the project from CLAUDE_PROJECT_DIR and binds its loopback HTTP
  listener. It writes the dashboard URL (with a per-session capability token) to
  ~/.claude/sdd-dashboard/current.url. Thus the task of start is only to READ that file and print
  the URL. On the common path, there is no MCP tool call and no channel round-trip. Opt-in: it
  must have dashboard_enabled: true in .claude/sdd.local.md and Bun installed. If one of them is
  missing, it prints guidance and stops cleanly (pure-markdown skills are not affected).
---

# Skill: start

This skill opens the **SDD visual dashboard**. The dashboard is a local, loopback-only browser UI.
The `sdd-dashboard` MCP server (Bun + `Bun.serve()`) serves it. The server is in the same process
that holds the MCP channel of this session. The dashboard reads `docs/features/` from disk and
renders each artifact. Its main function: it **drives the pipeline back into this session**. A
click in the browser sends a validated `/sdd:<skill> <slug>` command through the channel. This
Claude runs the command, and the progress goes back to the browser live.

`start` does **not** mean "start the server". The server starts automatically when the session
opens (it is declared in `.mcp.json`). At boot, it resolves the project from `CLAUDE_PROJECT_DIR`
and binds the HTTP listener. Then it **writes the dashboard URL to `~/.claude/sdd-dashboard/current.url`**.
Thus, on the common path, `start` only **reads that file and prints the URL**. This is a plain
file read, with no MCP tool and no channel message.

English prose (artifacts, questions, reports, handoff) follows ASD-STE100 Simplified Technical English → [`../_shared/ste100.md`](../_shared/ste100.md).

## Owner

The developer who runs the session. This skill makes no artifact. It is a connection skill.

## Inputs

- `.claude/sdd.local.md` — read `dashboard_enabled` (it must be `true`). `specify`/`implement`
  create this file automatically with documented defaults → [`../implement/references/settings.md`](../implement/references/settings.md).
- `~/.claude/sdd-dashboard/current.url` — the server writes this file when it binds. Line 1 is the
  dashboard URL (with the capability token). Line 2 is the project dir that the server resolved.
  **This is the primary input.** It is present when the server bound HTTP at boot.
- (Fallback only) the `dashboard_handshake` tool of the `sdd-dashboard` MCP server. Use it **only**
  when the URL file is absent (the server could not resolve the project at boot, for example when
  `CLAUDE_PROJECT_DIR` is not set).

## Protocol

1. **Gate on opt-in.** Read `.claude/sdd.local.md`.
   - **Absent** → the dashboard is opt-in and it is off by default. Create the file automatically
     with the documented defaults per [`../implement/references/settings.md`](../implement/references/settings.md)
     (these include `dashboard_enabled: false` + `dashboard_port: 4178`). Then tell the user: «The dashboard is
     opt-in — set `dashboard_enabled: true` in `.claude/sdd.local.md` and re-run `/sdd:start`.» **Stop.**
   - **Present, `dashboard_enabled` not `true`** → print the same one-line enable instruction and **stop**.
     (Pure-markdown users are not affected.)
2. **Read the URL file (the common path, without the channel).** Read `~/.claude/sdd-dashboard/current.url`
   (for example `cat "$HOME/.claude/sdd-dashboard/current.url"`).
   - **Present** → line 1 is the live dashboard URL. **Print it and go to step 5. Do NOT call an MCP
     tool.** The server is already up and bound. Nothing more is necessary. (Optional: look at line 2,
     the project dir. If it is different from the current project, the server of a different session
     is bound. Tell the user. Do not guess.)
   - **Absent** → the server is connected but idle (it could not resolve the project at boot). Continue to step 3.
3. **(Fallback) examine Bun and the MCP server.** Run `bun --version`. If Bun is missing, print «The dashboard
   needs Bun — install from https://bun.sh, then re-run `/sdd:start`. The markdown skills work without it.»
   and **stop**. If the `dashboard_handshake` tool is not available, tell the user to examine `/mcp` and **stop**.
   (Possibly the `sdd-dashboard` server did not boot: Bun is missing, or the session did not load
   `.mcp.json`. Open the session again.)
4. **(Fallback) give the project to the server.** Find the absolute project root. Use
   `git rev-parse --show-toplevel` first. If that fails, use the cwd that contains `docs/` or `.git`.
   Call **`dashboard_handshake`** with `project_dir` set to that path. It binds HTTP, writes
   `current.url` and returns the URL. Use the returned URL.
5. **Print the URL and how the dashboard behaves.** Show the URL clearly
   (`http://127.0.0.1:<port>/?session=<id>&token=<cap>`) and offer to open it. Then state the
   **load-bearing UX facts**, thus the user is not surprised:
   - The dashboard is a **driver + observer**, not a synchronous remote control.
   - The session uses a click **only when it is idle at the prompt**. During a task, the click **queues**.
   - Runs from the dashboard use **`--depth=easy`** by default (the skill decides reversible calls
     itself and asks fewer questions). The reason: the browser cannot answer a blocking
     `AskUserQuestion`. If a stage really must have a decision, the question shows in **this
     terminal**. Answer it here.
6. **Handoff.** **Emit the stage-handoff block** per [`../_shared/handoff.md`](../_shared/handoff.md)
   (utility variant):
   - *What I did*: printed the dashboard URL.
   - *Review*: open the URL. The dashboard mirrors `docs/features/`, and the session activity pane
     shows the runs live.
   - *Run next*: open the dashboard and click **Run next stage** on a feature, or run a backbone
     command here, for example `/sdd:specify <slug>`.

   `/clear` is **optional** for this utility.

## Definition of Done

- `dashboard_enabled: true` is confirmed (or the skill printed guidance and stopped).
- The dashboard URL is printed. On the common path, it comes from `~/.claude/sdd-dashboard/current.url`.
  (Fallback only, when that file is absent: it comes from `dashboard_handshake` after a Bun check.)
- The skill stated the queued/busy/`--depth=easy` behavior. Thus the user knows that the dashboard is a driver, not a remote control.
- The stage-handoff block is emitted (utility variant).
- This skill writes no artifact. The DoD gates above (opt-in confirmed, URL only from `current.url`/handshake) are its **structural self-check** ([`../_shared/self-check.md`](../_shared/self-check.md)).

## Anti-patterns

- **A call to `dashboard_handshake` when `current.url` already exists.** The common path is a plain
  file read. The server is already bound. Use the tool only when the URL file is absent.
- **To treat `start` as "boot the server".** The server starts automatically through `.mcp.json`.
  `start` only prints the URL. Never try to spawn `bun` yourself.
- **To continue when `dashboard_enabled` is not `true`.** It is opt-in. Print the enable line and stop.
- **A fabricated URL.** The URL comes only from `current.url` (or the `dashboard_handshake` result).
  Never invent a port or a token.
- **A dashboard-triggered stage at `--depth=hard`.** Runs from the browser use `--depth=easy` by default.
  The browser cannot answer a Socratic prompt, thus such a prompt blocks the queue.

## References

- [`../implement/references/settings.md`](../implement/references/settings.md) — `.claude/sdd.local.md`,
  with the `dashboard_enabled` / `dashboard_port` keys that this skill gates on.
- [`../_shared/handoff.md`](../_shared/handoff.md) — the stage-handoff block (utility variant) that this skill emits.
- [`../_shared/tool-adapters.md`](../_shared/tool-adapters.md) — the Codex/Cursor mapping for the Claude-specific
  mechanisms. (The dashboard channel is Claude Code-only. Hosts that are not Claude use the markdown skills directly.)
