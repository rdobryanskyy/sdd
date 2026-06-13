---
name: start
model: sonnet
effort: low
description: >
  Use to open the SDD visual dashboard — the local browser UI that shows every feature's
  pipeline stage, renders its artifacts (markdown, mermaid C4/sequence/ER, OpenAPI/swagger),
  lets you edit artifact text back to disk, and drives the pipeline by sending /sdd:<skill>
  commands back into this live session. Triggers on "start the dashboard", "open the SDD
  dashboard", "sdd dashboard", "/sdd:start", "show the pipeline UI", "відкрий дашборд",
  "запусти панель SDD". This is the HANDSHAKE skill: the MCP server auto-starts at session
  open (via .mcp.json) — start hands it the authoritative project directory, confirms the
  channel works in both directions, and prints the dashboard URL with its capability token.
  Opt-in: requires dashboard_enabled: true in .claude/sdd.local.md and Bun installed; if
  either is missing it prints guidance and exits cleanly (pure-markdown skills are unaffected).
---

# Skill: start

Opens the **SDD visual dashboard** — a local, loopback-only browser UI served by the
`sdd-dashboard` MCP server (Bun + `Bun.serve()`), embedded in the same process that holds this
session's MCP channel. The dashboard reads `docs/features/` straight off disk, renders every
artifact, and — the point of it — **drives the pipeline back into this session**: a click in the
browser sends a validated `/sdd:<skill> <slug>` command through the channel, this Claude runs it,
and progress streams back to the browser live.

`start` is **not** "start the server" — the server auto-starts when the session opens (declared in
`.mcp.json`, so the HTTP listener is up before any command). `start` is the **handshake**:
hand over the real project dir, ping the channel, print the URL.

## Owner

The developer running the session. No artifact is produced — this is a connection skill.

## Inputs

- `.claude/sdd.local.md` — read `dashboard_enabled` (must be `true`) and `dashboard_port` (optional).
  Auto-created with documented defaults by `specify`/`implement` → [`../implement/references/settings.md`](../implement/references/settings.md).
- The current **project root** (the session cwd — `start` runs in-session where cwd *is* the project,
  so it can hand the authoritative path to the server, covering hosts where `CLAUDE_PROJECT_DIR` is unset).
- The `sdd-dashboard` MCP server (auto-started). Its `dashboard_handshake` tool is the handover point.

## Protocol

1. **Gate on opt-in.** Read `.claude/sdd.local.md`.
   - **Absent** → the dashboard is opt-in and off by default. Auto-create the file with the documented
     defaults per [`../implement/references/settings.md`](../implement/references/settings.md) (which now
     include `dashboard_enabled: false` + `dashboard_port: 4178`), then tell the user: «The dashboard is
     opt-in — set `dashboard_enabled: true` in `.claude/sdd.local.md` and re-run `/sdd:start`.» **Stop.**
   - **Present, `dashboard_enabled` not `true`** → print the same one-line enable instruction and **stop**.
     (Pure-markdown users are unaffected — nothing else changes.)
2. **Check Bun.** Run `bun --version`. If Bun is missing, print: «The dashboard needs Bun —
   install from https://bun.sh, then re-run `/sdd:start`. The markdown skills work without it.» **Stop.**
3. **Confirm the MCP server is connected.** The `dashboard_handshake` tool should be available (the
   `sdd-dashboard` server auto-started). If it is not, tell the user to check `/mcp` — the server may
   have failed to boot (Bun missing, or `.mcp.json` not picked up; re-open the session). **Stop** if absent.
4. **Resolve the project root + hand it over.** Determine the absolute project root — prefer
   `git rev-parse --show-toplevel`; fall back to the cwd that contains `docs/` or `.git`. Call
   **`dashboard_handshake`** with `project_dir` set to that absolute path. This is the session↔project
   binding *and* the channel test (a successful tool result proves the outbound path; the server also
   fires one inbound handshake ping — see step 5).
   - If the tool returns the **"not enabled"** message (the server read a different settings state),
     surface it verbatim and stop.
5. **Acknowledge the inbound ping.** The handshake fires one `<channel source="sdd-dashboard"
   kind="handshake">` ping to confirm the inbound path end-to-end. Acknowledge it in one line — **run no
   skill**. (This is the round-trip proof: outbound = the tool result, inbound = the ping.)
6. **Print the URL + how it behaves.** Show the returned URL prominently (`http://127.0.0.1:<port>/?session=<id>&token=<cap>`)
   and offer to open it. Then state the **load-bearing UX truth** so the user isn't surprised:
   - The dashboard is a **driver + observer**, not a synchronous remote control.
   - A click is consumed **only while this session is idle at the prompt**; mid-task it **queues**.
   - Dashboard-driven runs default to **`--depth=easy`** (the skill self-decides reversible calls and
     asks far fewer questions) because the browser can't answer a blocking `AskUserQuestion`; if a stage
     genuinely needs a decision, it surfaces in **this terminal** — answer it here.
7. **Handoff.** **Emit the stage-handoff block** per [`../_shared/handoff.md`](../_shared/handoff.md)
   (utility variant) — *What I did* (dashboard handshake done; the URL + port + session) + *Review* (open
   the URL; the dashboard mirrors `docs/features/` and the session activity pane streams runs) + *Run next*
   (open the dashboard and click **Run next stage** on a feature, or run a backbone command here, e.g.
   `/sdd:specify <slug>`). `/clear` is **optional** for this utility.

## Definition of Done

- `dashboard_enabled: true` confirmed (or guidance printed + stopped) and Bun present (or guidance + stopped).
- `dashboard_handshake` called with the authoritative absolute project root; the returned URL printed.
- The inbound handshake ping acknowledged in one line; no skill auto-run from it.
- The queued/busy/depth=easy behaviour stated so the user knows the dashboard is a driver, not a remote control.
- The stage-handoff block emitted (utility variant).

## Anti-patterns

- **Treating `start` as "boot the server".** The server auto-starts via `.mcp.json`; `start` only hands
  over the project dir and prints the URL. Never try to spawn `bun` yourself.
- **Proceeding when `dashboard_enabled` is not `true`.** It is opt-in — print the enable line and stop.
- **Faking the URL.** The URL (with its per-session capability token) comes *only* from the
  `dashboard_handshake` tool result — never fabricate a port or token.
- **Acting on the handshake ping as if it were a command.** It is a connectivity probe — acknowledge, run nothing.
- **Running a dashboard-triggered stage at `--depth=hard`.** Browser-driven runs default to `--depth=easy`;
  a Socratic prompt the browser can't answer would block the queue.

## References

- [`../implement/references/settings.md`](../implement/references/settings.md) — `.claude/sdd.local.md`,
  including the `dashboard_enabled` / `dashboard_port` keys this skill gates on.
- [`../_shared/handoff.md`](../_shared/handoff.md) — the stage-handoff block (utility variant) this skill emits.
- [`../_shared/tool-adapters.md`](../_shared/tool-adapters.md) — Codex/Cursor mapping for the Claude-specific
  mechanisms (the dashboard channel is Claude Code-only; non-Claude hosts use the markdown skills directly).
