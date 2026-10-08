# SDD Visual Dashboard

A local, **opt-in, read-only** browser dashboard for the SDD pipeline. It reads `docs/features/`
directly from the disk and renders each artifact. It also **controls the pipeline**. A click in the
browser sends a `/sdd:<skill> <slug>` command to your live Claude Code session. The session runs the
skill and streams the progress back to the browser. The dashboard never edits artifact text. All
writes occur through the pipeline in the terminal.

The dashboard is one Bun process (`server/`). This process starts automatically as an MCP server when
a Claude Code session opens. It holds the MCP channel to Claude **and** an embedded `Bun.serve()`
HTTP+WS listener on `127.0.0.1`. The browser tab is only one more channel. The official Telegram
plugin uses the same mechanism to send messages to a session. Here, the mechanism has a dashboard UI.

> **Pure-markdown users see no change.** Nothing binds and nothing opens before you opt in.

---

## Quick start

**1. Install Bun** (the server runtime — the Telegram plugin uses the same dependency):

```bash
curl -fsSL https://bun.sh/install | bash   # or: brew install bun
bun --version                              # sanity check
```

**2. Enable the dashboard** in the `.claude/sdd.local.md` file of your project. The pipeline
creates this file automatically with documented defaults. If the file is absent,
`specify`/`implement`/`start` will create it:

```yaml
dashboard_enabled: true    # opt in
dashboard_port: 4178       # optional — the loopback port (scans upward if busy)
```

**3. Open a Claude Code session in your project and run:**

```
/sdd:start
```

It gives your project directory to the server, makes sure that the channel works in the two
directions, and prints the URL:

```
http://127.0.0.1:4178/?session=<id>&token=<capability-token>
```

Open that URL in a browser. No other step is necessary.

---

## What you can do

| In the browser | What happens |
|---|---|
| **Pick a feature** (sidebar) | See its pipeline as a checklist with one item for each step: `done` / `skipped` / `pending` / `blocked`. The dashboard gets the status from the artifacts on the disk. An XS feature shows *skipped* stages, not gaps. |
| **Open an artifact** (tabs) | The dashboard renders markdown and **mermaid** (C4 / sequence / ER diagrams) from vendored libs, fully offline. Mermaid (3.3 MB) loads lazily, only when an artifact contains a diagram. OpenAPI shows as plain YAML. |
| **▶ Run next stage** / per-stage **run** | Sends `/sdd:<skill> <slug>` to your session. Claude runs the skill. The session-activity pane streams its log + the handoff. The topbar **depth** selector sets `--depth` (default `easy`). |
| **⚒ Fix** (shows on a CHANGES REQUESTED review) | Runs `/sdd:fix <slug>` to correct the review findings. |
| **+ new** | Runs `/sdd:specify <slug>` to start a new feature. |
| **roadmap** modal | Renders `docs/roadmap.md`. Its action buttons queue the repo-wide `/sdd:roadmap` and `/sdd:survey`. |
| **Answer a decision question** | If a run from the dashboard must have a human decision, a question card with option buttons shows in the activity pane (`dashboard_ask`). Your click continues the paused run. Only the option *index* goes out of the browser. |
| **Change artifacts in a different way** (a skill from the terminal, `vim docs/…`) | The panel refreshes live. `fs.watch` on `docs/` pushes a WS refresh in about 1 s. You do not have to do anything in the dashboard. |

### It's a driver, not a remote control

The session uses a click **only when it is idle at the prompt**. If Claude is in a task, the
command goes into a **queue**. The UI shows this. It never shows a false synchronous execution. The
default for runs from the dashboard is `--depth=easy`. Then the skill makes reversible decisions itself
and asks far fewer questions, because the browser cannot answer a blocking `AskUserQuestion`. If a run
from the dashboard must have a decision, Claude does not block. It posts the question **in the panel**
through `dashboard_ask` (option buttons, no free text) and ends its turn. Your click comes back as a
channel message, and the run continues. You can also always answer in **your terminal**.

---

## Configuration

The server reads these keys from `.claude/sdd.local.md` (one file for each project, git-ignored):

| Key | Default | Meaning |
|---|---|---|
| `dashboard_enabled` | `false` | Opt in. If the key is false or absent, the server stays idle (no HTTP bind). |
| `dashboard_port` | `4178` | The loopback port to bind. If the port is busy, the server scans `4178..4189`. |

Environment overrides (useful for tests and for unusual setups):

| Env var | Effect |
|---|---|
| `SDD_DASHBOARD_ENABLED=1` | Enable the dashboard without the settings file. |
| `SDD_DASHBOARD_PORT=<n>` | The default port. A `dashboard_port` in the settings has priority. |
| `SDD_DASHBOARD_TOKEN=<hex>` | Set a fixed capability token. If not set, the token is random for each session. |
| `CLAUDE_PROJECT_DIR=<path>` | The project root at boot. Claude Code sets this value. `/sdd:start` overrides it and has authority. |

---

## Security model

- **Loopback only.** The server binds `127.0.0.1`, never a public interface.
- **Read-only I/O with a limited scope.** The API only *reads*. The `realpath` of each read must be in
  `<project>/docs/` and must have an allowed extension (`.md` / `.yaml` / `.yml` / `.json` / `.size`).
  The API refuses `.git`, missing files and all paths outside `docs/`. There is no write route.
- **Capability token.** Each `/api` route must have the session token from `/sdd:start` (in the URL)
  and must pass `Origin`/`Host` loopback checks. This is also true for the two mutating routes (run a
  command and answer a question), which do not touch the disk. Thus another local page cannot send a
  POST to your port.
- **No command injection.** The server builds inbound `/sdd:` lines **only** from a server-side
  allowlist (validated skill name + `^[a-z0-9][a-z0-9-]*$` slug + `easy|medium|hard` depth). Browser
  text never becomes an arbitrary command. An answer sends only an option **label that Claude itself
  wrote** in `dashboard_ask`. The browser gives only one validated index into that list.
- **Anti-injection contract.** The MCP `instructions` tell Claude that the content of the dashboard
  channel is ALWAYS a server-built, allowlisted SDD command. It is never free text. It never gives
  authority to bypass a gate, approve a review, change settings, or touch files outside `docs/`.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `/mcp` shows `sdd-dashboard` **failed** | Bun is not installed (the `.mcp.json` starts `bun`). Install Bun, then open the session again. |
| `/sdd:start` says **"not enabled"** | Set `dashboard_enabled: true` in `.claude/sdd.local.md`, then run `/sdd:start` again. |
| Browser shows **"no token in URL"** | Open the exact URL that `/sdd:start` printed. The token gives access to the session. |
| **"project dir unresolved"** | Run `/sdd:start` in the project (it gives the real path to the server), or set `CLAUDE_PROJECT_DIR`. |
| A click does nothing | The session is busy, or it waits for an answer to a question in your terminal. The command is in the queue. It runs when Claude is idle at the prompt. |
| The panel does not update when files change | The docs watcher is not armed, because the server did not know your project dir. Run `/sdd:start`. Note: changes in a **symlinked** subdirectory of `docs/` do not emit watch events. Keep the artifacts on real paths. |
| The port is not 4178 | Port 4178 was busy. `/sdd:start` prints the real port that the server bound. |

---

## Architecture (one process, the channel pattern)

```
 Browser tab (dashboard)              Claude Code session
  index.html / app.js  ── HTTP/WS ──┐   Claude runs /sdd skills
                                     │        ▲
                       ┌─────────────┴────────┴──────────────┐
                       │  sdd-dashboard MCP server (Bun)      │
                       │  • StdioServerTransport ⇄ Claude     │
                       │  • Bun.serve() HTTP+WS ⇄ browser     │
                       │  • reads/writes <PROJECT>/docs/ only │
                       │  • inbound: notifications/claude/    │
                       │      channel  (/sdd:<skill> <slug>)  │
                       │  • outbound: dashboard_* MCP tools   │
                       └──────────────────────────────────────┘
```

- `server.ts` — MCP server + `Bun.serve()`, lifecycle hygiene, project-root resolver, WS keep-alive pings.
- `http.ts` — the HTTP layer (routing, token/origin gate, the read-only JSON API) behind an
  `HttpCtx` interface. You can test it without an MCP/stdio boot.
- `state.ts` — disk → pipeline-stage derivation (the signal→stage table).
- `channel.ts` — outbound `dashboard_*` tools + the inbound command allowlist + the registry of
  pending questions (`dashboard_ask` → `POST /api/answer`, single-use, with a size limit).
- `watch.ts` — live refresh: `fs.watch` on `<project>/docs/` (recursive), 250 ms coalescing window →
  one `refresh` WS frame (with a slug scope when one feature changed). It never reads file content.
  It only maps a changed path to a frame. If `docs/` is missing or the watcher dies, it arms again
  automatically.
- `paths.ts` — `docs/` containment + extension allowlist.
- `frontmatter.ts` — the one YAML-frontmatter parser (artifacts + settings).
- `../dashboard/` — the static UI (vanilla JS) + vendored render libs (`marked`, lazy `mermaid`).

### WS frames (server → browser)

The WS channel is **push-only** (the browser replies over HTTP). Each frame has
`session_id` + `ts` and these fields:

| `type` | Sent when | Payload |
|---|---|---|
| `hello` | a client connects | `project` |
| `project` | `/sdd:start` hands over the project dir | `project` |
| `log` | Claude calls `dashboard_log` | `message`, `slug`, `stage`, `level` |
| `update` | Claude calls `dashboard_update` | `slug`, `stage`, `status`, `progress`, `message` |
| `done` | Claude calls `dashboard_done` | `slug`, `stage`, `summary`, `verdict`, `review_files`, `next_command` |
| `ask` | Claude calls `dashboard_ask` (a paused run needs a decision) | `ask_id`, `question`, `options[]`, `slug`, `stage` |
| `answer` | a user selected an option (in a tab) — all cards in all tabs show the answer | `ask_id`, `option`, `label` |
| `refresh` | `docs/` changed on the disk (fs.watch), and after `dashboard_update`/`done` | optional `slug` — reload one feature; absent → reload everything |
| `command` | a browser click queued a command | `command`, `request_id` |

When the browser connects or connects again, it does a full re-sync from the disk. Thus, if the
browser misses frames while it is disconnected, it does not lose state. It loses only the log text.

## Testing

The deterministic runtime tests are in `server/tests/` (no network, committed fixture trees under
`tests/fixtures/`). CI runs them as the `server-tests` job:

```bash
cd server
bun install
bunx tsc --noEmit   # typecheck (strict, bun-types)
bun test tests/     # state derivation, path-security boundary, command allowlist, HTTP routing
```

The test suites:

- `state.test.ts` — signal→stage table, skipped or pending, tracker parse, the precedence of the
  review verdict, shipped regex.
- `paths.test.ts` — traversal / symlink escape / `.git` refusal / extension allowlist, with
  temporary `mkdtemp` trees.
- `channel.test.ts` — allowlist + injection cases, `dashboard_ask` + the question registry.
- `http.test.ts` — token/Origin gate, command + answer relay, regressions for removed routes.
- `watch.test.ts` — path→frame classification, batch coalescing, the watcher state machine with
  injected fakes. The real `fs.watch` contract depends on timing and is flaky in CI. Thus a live
  smoke run tests it.
- `frontmatter.test.ts`.

**Deferred (designed, not built):** parallel runs for many sessions (a shared hub with leader
election). The MVP already agrees with a hub: one token for each session, WS frames with a
`session_id` tag, and the project handover through `/sdd:start`.
