# Target surfaces — what's being built (the C4-container surface taxonomy)

> **Reference-only.** Not a skill. `design` is the canonical owner of the **selection**. It selects
> the surface(s) and writes them to `sad.md`. `api` / `sequences` / `tasks` / `plan-tests` / `review`
> **read** the declaration and gate their own output with it. Each of these skills keeps a one-line
> pointer to this file and its own delta. The taxonomy and the gating table are **only** in this
> file. Never copy them into a skill.

## TL;DR (short English introduction)

A “target surface” is **what we build** for a feature: a backend service, a web frontend, a
mobile app, a CLI, and other different things. Before, the plugin implicitly assumed one slice
(a service and its HTTP contract). It treated the frontend as an external consumer. Now
`design` **explicitly selects** the surfaces during the architecture work. It records them in
the `sad.md` frontmatter as `target_surfaces: [...]`. Each later stage **reads** that selection
and does not derive it again. This selection turns on the artifacts for each surface: UI
architecture ADRs, the `ui` task layer, frontend test levels, UI flow diagrams, and the correct
form of the `api` contract.

A surface is tied to C4: **a surface is a C4 container that the feature introduces or owns**. This
is not a new concept. The plugin already uses C4 in SAD §5. This file only makes the container
choice **explicit and typed**.

---

## The model — a surface is a C4 container the feature owns

«Surface» is our own term. We connect it to words that the plugin already uses. C4 calls the unit a
**container**: *a separately runnable/deployable thing: an application or a data store*
([c4model.com/abstractions/container](https://c4model.com/abstractions/container)). The C4
container diagram is exactly where you declare the surfaces **and their technology** together.
C4 already divides one feature into **one container for each surface**:

- a server-rendered web app is one container;
- a significant SPA is two containers: the backend API and the SPA;
- the worked example on c4model.com has five: Backend API + SPA + server-side web app + mobile app + database.

Thus: **a target surface = a C4 container the feature introduces or owns.** When you select the
surfaces, you *decide* which §5 containers the feature draws. Data stores are **not** surfaces.
A data store is a `ContainerDb`, and `data-model` owns it. A surface is a thing that *runs
behavior*, not a thing that *holds state*.

## The taxonomy (C4-grounded, fixed-but-extensible)

There are seven surfaces. Each one is a C4 container type from the list on c4model.com
(server-side web app, client-side SPA, desktop app, mobile app, console/CLI app, serverless
function/worker, + data stores):

| Surface | What it is (the C4 container) | Typical owner |
|---|---|---|
| `backend-service` | A server-side application with an interface (HTTP/REST, gRPC, or events). The default. | Backend Lead |
| `web-frontend` | A UI that a browser shows: **server-rendered (SSR)** *or* a **client-side SPA** (the sub-kind is a UI-architecture decision). | Frontend Lead |
| `mobile-app` | A native or cross-platform app on a phone or tablet. | Mobile Lead |
| `desktop-app` | A native or cross-platform desktop application. | Desktop Lead |
| `cli` | A console / command-line application: commands, flags, exit codes. | Backend Lead |
| `worker` | An event consumer, a scheduled job or a serverless function. It has no request/response surface. | Backend Lead |
| `library-sdk` | A library or SDK. The public signatures and types that it exposes are the contract. | Lib owner |

The list is **fixed but extensible**. A really new surface (for example a voice/IVR or an
embedded firmware target) extends the table here, in one place, not in a consuming skill.
Most features select **one or two** surfaces: `[backend-service]`, or
`[backend-service, web-frontend]` for a fullstack feature. A feature with many surfaces is
**larger**, because each surface adds its own layer and test tiers (see
[`./size-matrix.md`](./size-matrix.md)). A selection of many surfaces is usually also a
blast-radius decision (irreversible / multi-module → an ADR).

## The contract — declared once at design, read (never re-derived) downstream

This rule is load-bearing, and it is new. No tool that we surveyed uses the surface to gate
*which design artifacts it generates*. (spec-kit gates file paths. Kiro gates Feature-vs-Bug.)
Artifact selection that the surface gates is our own mechanism. It uses the same
"declare → conditionally include" pattern, on the artifact axis:

1. **`design` declares.** The Target-surface decision is the **first** §4 Solution-Strategy
   decision. `design` derives it from spec §1 «for whom» and the §4 roles. (The spec stays
   product-level. It never names a surface.) The blast-radius gate applies to this decision
   (many surfaces ⇒ usually an ADR). The §5 C4 Container view shows the decision, with one
   container for each surface.
2. **`design` writes it to the SAD frontmatter**: `target_surfaces: [backend-service, web-frontend]`.
   This value is machine-readable, the same as `feature_size`.
3. **Downstream skills read it and never derive it again.** `api` / `sequences` / `tasks` /
   `plan-tests` / `review` read `target_surfaces` from the `sad.md` frontmatter. They gate their
   output with the table below. They do **not** infer the surface again from the architecture
   map at each run. `design` already decided it, one time.

This **moves the interface-kind awareness of `api` up one level**. Before, `api` silently
derived the contract kind (HTTP / gRPC / CLI / events) again at each run. Now `design` declares
the surface(s) one time, and `api` (and the other skills) read it. The derive-from-architecture-map
path stays only as the **fallback**, when the SAD or the field is absent (a greenfield run
where `design` was skipped).

## The gating table (what each surface turns on)

Each consuming skill reads `target_surfaces`. It includes only the rows that its declared surfaces select:

| Surface | `api` contract form | `sequences` flows | `tasks` layers | `plan-tests` tiers added |
|---|---|---|---|---|
| `backend-service` | OpenAPI / gRPC / events (per the sub-kind) | service + async flows | domain · infra · app · ports | (existing) unit · integration · contract |
| `web-frontend` | *consumes* the backend contract (does not write it) | UI-driven (`<user>` → `<ui>` → `<service>` → `<data-store>`) | **`ui`** | **component · visual-regression · e2e-through-UI** |
| `mobile-app` | consumes the contract | UI-driven | **`ui`** | component · e2e-through-UI |
| `desktop-app` | consumes the contract | UI-driven | **`ui`** | component · e2e-through-UI |
| `cli` | `contracts/cli.md` (commands/flags/exit-codes) | command flows | app · ports | unit · e2e (command) |
| `worker` | `contracts/events.md` (no request/response) | async flows | domain · infra | unit · integration |
| `library-sdk` | `contracts/public-api.md` (public signatures) | usage flows | domain · app | unit · contract |

An example: a feature with `[backend-service, web-frontend]` makes these outputs:

- the backend contract;
- a `ui` task layer;
- UI-driven sequence flows, together with the service flows;
- the component / visual-regression / e2e-through-UI test tiers, on top of the
  unit/integration/contract tiers of the backend.

## The UI-architecture decision (per UI surface — kept light, Option B)

For each declared **UI surface** (`web-frontend` / `mobile-app` / `desktop-app`), `design` does a
second **UI-architecture decision**. This changes the old §4 item "read-side delivery (SSR / SPA /
API-only)" into a choice for each surface:

- **web** → server-rendered (SSR) / SPA / hybrid;
- **mobile** → native / cross-platform;
- also **state-management** and **routing**, *but only if* the complexity of the feature makes them necessary.

The gate is the same as for each §4 strategic decision. If the decision crosses the blast-radius
gate, it becomes an ADR in §9. Keep this decision **light**. It is the **only** UI artifact that
the plugin generates. Deliberately, there is **no** component-tree, no design-token doc, and no
screen or wireframe artifact. (These need a separate, deep UI-design pipeline, which is out of
scope.) The full frontend footprint is these four items: the `ui` task layer, the
UI-architecture ADR, the frontend test tiers and the UI sequence flows.

## Reuse the existing UI foundation (don't reinvent)

A `ui`-surface feature **uses and extends the design system that the repo already has**. It does not make new styles, tokens or primitives by hand that copy existing ones. `survey` makes a list of that foundation in `architecture-map.md` **§Frontend / UI foundation**: the component library / design system, the design tokens, the styling approach, the shared primitives and the nearest UI precedent. `design` / `tasks` / `implement` / `review` **read it and use it again**:

- Build a new screen from the **existing components, tokens and styling approach**. Use the nearest existing screen (the UI precedent) as the model.
- Make a **new** component only when no existing primitive fits. Build it in the styling approach of the repo, not in a second approach.
- Get the design tokens (colors / spacing / typography) from the token source of the repo. Never declare them again inline.

This is the frontend version of the backend rule «match the repo's conventions + copy the closest precedent». It is the same reuse discipline, applied to the UI. This section exists to stop one anti-pattern: a `ui` task that makes an existing Button/Card/modal again, or adds a second styling system.

## The frontend test tiers (testing-trophy provenance)

For a UI surface, `plan-tests` adds the component / visual-regression / e2e-through-UI tiers.
These tiers come from the **"testing trophy"**, the dominant frontend testing vocabulary
(web.dev testing strategies; Kent C. Dodds). Its levels are: static → unit → integration (with
**component** and API tests) → UI (with **E2E** and **visual / visual-regression**)
([web.dev/articles/ta-strategies](https://web.dev/articles/ta-strategies)).
It is the **dominant vocabulary, not a mandate**. Here it is also **stack-agnostic**: `plan-tests`
names the *tier*, never the tool. `implement` finds the real runner (Playwright / Storybook / a
visual-regression tool / etc.) in the repo. It does this the same way as for the backend tiers.

## Discipline

- **The taxonomy and the gating table are only in this file.** If a consuming skill copies the
  table, the source of truth has a duplicate. The skill keeps a one-line pointer and its own delta instead.
- **Only `design` writes `target_surfaces`.** Downstream skills read it. This file stops one
  anti-pattern: a skill that derives the surface again when the SAD already declared it. (It is
  the same problem as when `api` derived the interface kind two times.)
- **The spec stays product-level.** `design` derives the surfaces from spec §1/§4. The spec never
  names a surface, a stack or an endpoint group.
- **Option B boundary.** Add frontend awareness through the existing stages. Do **not** make a
  parallel UI-design pipeline. Do not make a component-tree, token or screen artifact. If a run
  starts to make one, the run is outside the scope that this file sets.
- **Data stores are not surfaces.** A `ContainerDb` is the work of `data-model`. A surface runs behavior.
- **Use the UI foundation again.** `ui`-layer work uses the existing design system, components, tokens and styling of the repo (from `architecture-map.md` §Frontend). It never makes them again. A new primitive must have a justification that no existing primitive fits.

## Where each skill reads this

- **`design`** — owns the **selection**. The Target-surface decision is the first decision of §4.
  The UI-architecture decision comes after it, for each UI surface. Both decisions go through the
  ADR gate. `design` writes `target_surfaces` to the `sad.md` frontmatter. It draws one §5 C4
  container for each surface.
- **`api`** — reads `target_surfaces` first to select the contract form (the table). Only if the
  SAD or the field is absent, it uses the derive-from-architecture-map fallback.
- **`sequences`** — for a declared UI surface, draws UI-driven flows (`<user>` → `<ui>` → `<service>`
  → `<data-store>`). It adds `<ui>` to the generic participant vocabulary.
- **`tasks`** — gates the layer set with `target_surfaces`. A UI surface adds the `ui` layer. This
  layer is not auto-serialized: UI tasks can run in parallel.
- **`plan-tests`** — if a UI surface is declared, adds the component / visual-regression /
  e2e-through-UI tiers.
- **`review`** — the end-to-end AC trace includes the UI surfaces, not only the backend. (A UI AC
  traces to a component test or an e2e-through-UI test.)
