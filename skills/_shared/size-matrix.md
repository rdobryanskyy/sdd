# Size matrix — XS/S/M/L/XL classification + MVP-vs-Full artifact set

> **Reference-only.** Not a skill. `classify-size` is the canonical owner of this matrix.
> Each other skill reads it to decide how much of its artifact to write (MVP or Full).
> Each skill also reads it to decide the depth of its Socratic pass.

## How to classify size

There are four signals. `classify-size` asks one `AskUserQuestion` for each signal:

| Signal | XS | S | M | L | XL |
|---|---|---|---|---|---|
| **PR count** | 1 | 2–5 | 5–15 | 15+ | many, in stages |
| **Time to merge main part** | ≤1 day | ~1 week | 1–2 sprints | >1 month | own roadmap |
| **New module / new API / migration** | none | ≤1 of three | 1–2 of three | 2–3 of three | new subsystem |
| **Breaking changes for consumers** | no | internal only | internal or public | public | public + cross-team |

- **XS** — 1 PR, ≤1 day, no migration, no new API. (Typo, copy fix, small config change.)
- **S** — 2–5 PRs, ~1 week, possibly a small migration.
- **M** — separate epic, 1–2 sprints, new module / API / migration.
- **L** — cross-module, more than one team, breaking changes are possible.
- **XL** — new subsystem. It must have a separate roadmap.

For an edge case, name the dominant signal: «this is M because it adds a new API + 1–2 sprints, even though PR count is on the S/M border».

> **One-sentence rule.** If you cannot decide between MVP and Full, start with MVP. It costs less to fill empty sections later than to discard sections that you wrote too early.

## MVP-vs-Full artifact set

The artifact depth is proportional to the feature size. XS/S → minimal set. M+ → full set.

| Artifact (skill) | MVP (XS/S) | Full (M+) |
|---|---|---|
| spec — `specify` | yes | yes |
| clarify pass — `clarify` | light (always run it; `specify`'s handoff offers the skip, per the fast lane below) | yes |
| CONTEXT.md glossary — `glossary` | yes | yes |
| SAD (Arc42 12 §) + C4 L1/L2 — `design` | walk all 12 sections; more `<!-- N/A -->` are permitted | fill all 12 |
| ADRs (in `adr/`) — `design` / `decide-adr` | usually 2–4 | usually 5–12 |
| sequence diagrams — `sequences` | cover each AC; collapse the detail | as many flows as the user stories and ACs need — there is no maximum; XS/S can collapse detail but must cover each AC |
| deployment view — `design` §7 | `<!-- N/A -->` if there is no infra change | yes |
| data-model + migrations — `data-model` | if the change touches the DB | yes |
| API contract (OpenAPI) — `api` | yes | yes |
| events — `api` | if async | yes |
| task breakdown + tasks.json — `tasks` | yes | yes |
| test-plan — `plan-tests` | inline in spec | separate file |
| implementation — `implement` | yes | yes |

## Routes — quick / standard / full (the auto-router)

The **route** sets how each handoff handles the optional stages (`clarify`, `sequences`,
`data-model`, `api`, `plan-tests`). The route is in **`docs/features/<slug>/.route`**. This file
has one line of plain text: exactly one of `quick` / `standard` / `full`. It has the same
rules as `.size`: no comments and no frontmatter, so that wrappers can grep it quickly.

- `classify-size` (the canonical owner) writes the file. `specify` step 1 also writes it when it classifies inline.
- The default route comes **from the size**: **XS/S → `quick`, M → `standard`, L/XL → `full`**.
- The user confirms the route and the size in the **same single `AskUserQuestion`**.
- The user can select a route that is different from the default. A `quick` L is permitted, but the skill must say it clearly.

| Route | Handoff behaviour at an optional stage |
|---|---|
| `quick` | The stage that writes the artifact **examines the N/A condition itself** (table below). If the condition is true, the stage **auto-skips** the next stage and gives the reason in the handoff («auto-skipped `clarify`: zero §8 OQ»). The `↳ or` alternative then **inverts**: it offers the *skipped* stage («run the full path»). If the condition is **not** true, the stage does not skip, and the handoff is a normal forward handoff. |
| `standard` | The behavior before routes existed. The handoff names the next stage. When the N/A condition is true, it **offers** the skip as the `↳ or` alternative. The **user** selects. |
| `full` | No skip alternatives. Each optional stage runs. The handoff never prints an `↳ or` skip line. |

**Quick-route changes** (in addition to the auto-skip):

- `design` recommends `--depth=easy` in the question that sets its depth dial.
- `plan-tests` always collapses to the inline `## Test plan` in `spec.md`.
- `clarify` auto-skips when the spec has zero §8 open questions.

**Missing `.route`** → use the `standard` behavior (the default before routes existed). Say so in
the handoff: «route standard (default — no `.route`; run `/sdd:classify-size <slug>`)». This is
fully back-compatible.

**Mid-flight override.** The route controls **handoffs only. It never makes a stage refuse.** To
change the route, do one of these steps:

- Run `/sdd:classify-size <slug>` again. This writes `.route` again.
- Start a skipped stage directly. It runs normally, whatever the route is.

### The N/A conditions (the fast-lane table)

Each condition is a **«skip when N/A»** condition, never «skip always». For example, an XS feature
*with* a schema change still runs `data-model`, on all routes.

| Stage | Skip when (the N/A condition) | Who evaluates/offers it |
|---|---|---|
| `clarify` | The spec has **zero §8 open questions**, and specify flagged no AC as ambiguous. | `specify`'s handoff |
| `sequences` | **One actor and no multi-step runtime flow**: a single request/response or only a rule change. An `alt`-branch diagram would show nothing new. | `design`'s handoff |
| `data-model` | **No schema change**: no new entity, column, index or migration. | `sequences`' handoff |
| `api` | **No contract change**: no new or changed endpoint, event, CLI command or public signature. (The skill also skips itself when there is «no external interface».) `api` **accepts a `data-model` that was skipped legally** (no schema change). It then derives the contract from the existing schema. Its hard gate stops the run only when a schema change exists. | `data-model`'s handoff |
| `plan-tests` | Never fully skipped. It **collapses to the inline `## Test plan`** in `spec.md` (low cost; always inline on `quick`). Skip it fully only when the DoD of each task already names its test. | `tasks`' handoff |

**Never skippable — on any route:**

- `specify` (the spec is the trace anchor).
- `design` (it declares `target_surfaces` and runs the ADR gate).
- `tasks` (`implement` reads `tasks.json`).
- `implement`, `review`, `ship`.

Thus the shortest legal route is
`specify → design → tasks → implement → review → ship`. A `quick` XS feature can close in one session.

Sometimes more than one stage in sequence is N/A. In this case, at each handoff, examine the
conditions in sequence. Go to the first stage whose condition is **not** true. For example, if
`sequences` is skipped, its `data-model` skip question moves into the handoff of `design`.

- On `quick`, the stage examines the conditions itself.
- On `standard`, the stage offers each step as the `↳ or` alternative.

## Surface count is a second scaling axis

Size (XS–XL) is the *depth* dial. The number of **target surfaces** is a second, *breadth* axis on the artifact set. A feature declares its surfaces in `design`, and `design` writes them to `sad.md` frontmatter `target_surfaces` → [`./surfaces.md`](./surfaces.md).

Each surface adds its own work:

- A UI surface (`web-frontend` / `mobile-app` / `desktop-app`) adds the `ui` task layer, UI-driven §6 flows, and the test tiers for component, visual regression and e2e through the UI.
- A `cli` / `worker` / `library-sdk` surface adds its own contract form and flows.

Thus a feature with more than one surface (`[backend-service, web-frontend]`) is really **larger** than a feature with one surface in the same XS/S/M class. This table has no new column for it. But for each extra surface, expect more tasks, more flows and more test rows.

## SAD size behaviour

For XS/S too, `design` walks all 12 Arc42 sections. A consistent structure is more important than a show of completeness. A section that does not apply gets `<!-- N/A: <one-line reason> -->`. These are usual N/A patterns for XS/S:

- §7 Deployment — `<!-- N/A: reuses existing deployment unit, no infra change -->`
- §6 Runtime — collapses to the **smallest number of flows that cover each §5 AC**. Often this is one flow with the error branches inline as `alt`, not separate flows for each failure mode. The detail collapses, but the AC coverage does not. At XS/S too, `sequences` maps each AC to a flow, a branch or an explicit N/A.
- §11 Risks — one row for accepted debt, and no medium or high risks.

The skill and the template are the same. Only the content is smaller.

## Wrappers / gates

A skill that reads `.size` skips the large sub-artifacts for XS/S (separate test-plan, deployment view, full ADR sweep). `specify` **sets `.size` at the start of the backbone**: if the file is absent, `specify` classifies the feature and writes it. Thus later stages usually read a real size. Sometimes a stage still finds no size (for example, `design` runs standalone before `specify`). Then the stage uses **M** as the default, because M writes more and is safe. The stage **says so in its handoff**. It never makes a silent assumption.
