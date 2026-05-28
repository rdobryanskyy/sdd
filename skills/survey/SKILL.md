---
name: survey
model: inherit
effort: medium
agents: [sdd-explorer]
description: >
  Use to study an existing codebase ONCE and persist a current-architecture map the rest of the
  pipeline reads — so specify/design/data-model/implement know the existing system instead of
  re-scanning it each time. Run it at the start (before specify) and refresh it when the repo has
  moved. Triggers on "survey the codebase", "map the architecture", "understand the existing
  system for {repo}", "architecture map", "/sdd-survey", "вивчи кодову базу", "карта архітектури",
  "що вже є в системі". Dispatches sdd-explorer to scan, synthesizes docs/architecture-map.md
  (module layout, layering, datastores, conventions, a C4 of what EXISTS), and records the git
  HEAD/date it reflects so staleness is detectable. Reads (never overwrites) an existing
  architecture doc if the repo has one.
---

# Skill: survey

The pipeline's eyes on the **existing** system. It scans the repo once and writes a persisted
**current-architecture map** at `docs/architecture-map.md` — the single source of "what's already
here" that `specify` (for constraints), `design` (to match against), `data-model`, and `implement`
all read instead of each re-scanning. Run it before you specify your first feature, and refresh it
when the repo has drifted. On a greenfield repo it records "greenfield — no architecture yet".

This is a repo-level utility, not a per-feature stage: one map serves every feature. The scan is delegated to [`sdd-explorer`](../../agents/sdd-explorer.md) (cheap, read-only); this skill synthesizes its findings into the map. Size depth → [`../_shared/size-matrix.md`](../_shared/size-matrix.md); question phrasing → [`../_shared/ask-style.md`](../_shared/ask-style.md).

## Owner

Architect / Tech Lead — they own the architecture, so they confirm the map reflects reality.

## Inputs

- (Optional) a path/scope hint — which repo or subtree to map (default: the repo root).
- (Read, never overwrite) an existing hand-maintained architecture doc if present (`docs/architecture.md`, `ARCHITECTURE.md`, C4 docs, root `CLAUDE.md`) — it is a strong input and authority; the generated map cites and aligns with it, it does not clobber it.

## Protocol

1. **Freshness check.** If `docs/architecture-map.md` exists, read its recorded `reflects_commit` / `updated_at`. If the repo HEAD hasn't moved much since (no new top-level modules, recent date) → ask «map is fresh (reflects `<commit>`). Reuse or refresh?» and STOP on reuse. Stale or absent → continue.
2. **Read existing docs first.** Look for a hand-maintained architecture doc / root `CLAUDE.md` / ADRs. If found, treat it as authoritative input — the map will reconcile with it and flag any drift, never overwrite it.
3. **Scan via sdd-explorer.** Dispatch [`sdd-explorer`](../../agents/sdd-explorer.md) (`model: haiku` + `effort: low`, clean-isolated per [`../_shared/agent-roster.md`](../_shared/agent-roster.md)): «Map this repo for a current-architecture document. Report: (a) primary language + frameworks + versions, (b) top-level module/package layout + per-module layer dirs, (c) layering / ports / wiring conventions (how a module registers), (d) datastores + how they're accessed, (e) inter-module communication (direct call / events / HTTP), (f) cross-cutting conventions (error handling, IDs, tests, migrations) with one cited example each, (g) the 2–3 most representative existing features as precedents.» For a large repo, fan out one explorer per subtree and merge. (Fallback to a `subagent_type: "Explore"` Agent if `sdd-explorer` is unavailable.)
4. **Synthesize the map** from [`./templates/architecture-map.md`](./templates/architecture-map.md): a C4 Context + Container of **what exists today**, a module inventory, the conventions catalog (cited), the datastore list, a "where things live / closest precedent" guide, and known constraints / tech-debt. Real names + `file:line` anchors from the scan — no placeholders.
5. **Stamp staleness markers.** Record `updated_at: <today>` and `reflects_commit: <git rev-parse --short HEAD>` in the frontmatter, so downstream skills can tell when the map is stale.
6. **Write + commit.** Write `docs/architecture-map.md`; propose `survey: architecture map (reflects <commit>)`. Next: `specify <slug>` — now architecture-aware. (Greenfield → write the map with a single "greenfield — no modules yet; conventions TBD" note so specify/design still have a defined input.)

## Definition of Done

- `docs/architecture-map.md` exists with: a C4 of the existing system, the module inventory, the cited conventions catalog, datastores, and the precedent guide — real names, no placeholders (or the explicit greenfield note).
- It records `updated_at` + `reflects_commit` so staleness is detectable.
- Any pre-existing hand-maintained architecture doc was read and reconciled, never overwritten.

## Anti-patterns

- **Re-scanning the repo in every downstream skill** instead of reading this map — the whole point is to scan once. design/data-model/implement read the map; they re-scan only the specific files they mutate (e.g. drift detection reads the actual domain layer).
- **Overwriting a hand-maintained `docs/architecture.md`.** survey writes its own `architecture-map.md` and reconciles; it never clobbers an authored doc.
- **A map with no staleness markers** — without `reflects_commit` nobody knows if it's current; the map silently rots.
- **Placeholders / guessed layout** — every claim is cited from the scan, or marked `UNKNOWN`. A fictional map is worse than none.
- **Treating it as per-feature** — it's repo-level; one map serves all features. Refresh it, don't fork it per slug.

## References & template

- [`./templates/architecture-map.md`](./templates/architecture-map.md) — output scaffold for the current-architecture map.
- [`../_shared/agent-roster.md`](../_shared/agent-roster.md) — the sdd-explorer contract (clean-isolated, cited, cheap).
