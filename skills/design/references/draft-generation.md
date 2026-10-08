# Draft generation — per-section sourcing for design's in-memory draft

The `<!-- … -->` comment in [`../templates/sad.md`](../templates/sad.md) is the authoritative format for each section. This file connects the steps. It tells where each of the 12 Arc42 sections gets its content, and it gives the pre-Socratic hygiene checks. Keep the draft **in memory**. Do not change `sad.md` between the bootstrap copy and the per-section write (the shared disk-write discipline → [`../../_shared/socratic-loop.md`](../../_shared/socratic-loop.md)).

## Inputs in priority order

1. **`CONTEXT.md` `## Glossary`** — canonical for role names + domain terms. All text that contradicts it loses.
2. **`spec.md`** — §2 Goals, §3 Non-goals, §6 NFR (numeric targets + measurement), §6.1 Security/privacy + abuse cases, §7 KPIs, §8 Open questions, and all §1 ¶4 «Decision override» bullets.
3. **The brownfield scan** (the Step-4 Explore subagent) — gives these items:
   - the primary language + frameworks + versions;
   - the module layout;
   - the layering/ports conventions;
   - the data stores;
   - the communication style between modules;
   - all items in the repo that constrain this feature.

   On a greenfield, the scan is null. Write the note `<!-- brownfield: N/A — greenfield repo -->` in §3 and do not cite repo patterns.
4. **Decisions in memory from earlier sections:**
   - The §4 strategy constrains §5/§6/§7/§8.
   - The §5 boundaries constrain the §6 flows.
   - The §10 scenarios refer to the §1 quality goals.

   For later sections, read your own draft in memory. Do not read the file again.

## Per-section sources

The item-banks below are guidance, not a cap. Use the size class (`.size`) and the spec signal to select how many items to draft.

- **§1 Introduction & goals.**
  - Intent (1 ¶) from spec §2 Goals + §1 Context.
  - **Top-3 quality goals** (≥3, one line each) from spec §6 NFR, in order of criticality. The full scenarios are in §10.
  - The Stakeholders table comes from the spec §4 user-story roles + the CONTEXT glossary. Add a Tech Lead sign-off row.
- **§2 Constraints.**
  - **Technical** — language/framework/datastore + versions + the architecture convention from the brownfield scan. A version pin in a spec §6 NFR wins.
  - **Organisational** — the spec deadline + the effort budget if the spec gives them. Else, write `<TBD by PM>` and add a §11 row.
  - **Conventions** — link the convention file of the repo and all module-level patterns.
  - **Regulatory** — the spec §6.1 verdict + the abuse-case controls.
  - Never N/A.
- **§3 Context & scope.**
  - 2–3 sentences of business context from spec §1.
  - The external-systems table comes from the spec §6.1 cross-context entries + the communication/data-store rows of the scan.
  - **C4 Context (L1)** Mermaid block. The actors come from the CONTEXT roles + spec §4. The external systems come from the scan. Use 5–10 elements. Syntax → [`./c4-mermaid-syntax.md`](./c4-mermaid-syntax.md).
  - Never N/A.
- **§4 Solution strategy.**
  - **Top-3 strategic choices** (≥3). These are the ADR seeds. Give 2–3 sentences of rationale for each, and cite the related quality goals + constraints.
  - Decision-bank:
    - **Target surface(s) first** (`backend-service` / `web-frontend` / `mobile-app` / `desktop-app` / `cli` / `worker` / `library-sdk`). Derive it from spec §1 «for whom» + the §4 roles. Write it to the frontmatter `target_surfaces`. It gates §5 + each downstream stage → [`../../_shared/surfaces.md`](../../_shared/surfaces.md).
    - Then module-to-module integration (sync call / async events / shared transaction).
    - Persistence (single store / per-module store / read-write split).
    - **UI-architecture, one for each declared UI surface** (web → server-rendered / SPA / hybrid; mobile → native / cross-platform; + state-management + routing if necessary). This **replaces** the old single "read-side delivery" item, and makes it a decision for each surface.
    - Concurrency (optimistic / pessimistic / event-sourced).
    - Cache tier (none / in-process / shared).
  - The blast-radius gate almost always fires here. Plan ≥2 ADRs from §4.
- **§5 Building block view.**
  - 1 ¶ about the layering style and the reason for it.
  - Decision-bank: extend an existing module vs a new one; the layering style (default = the repo convention; ask only if the design is different); the internal sub-package layout.
  - **C4 Container (L2)** Mermaid block:
    - Draw **one `Container` for each declared `target_surface`**. A fullstack `[backend-service, web-frontend]` draws both the backend-API container and the web/SPA container. A `[backend-service, mobile-app]` draws the API + the mobile app.
    - Draw the other modules/services of the feature as `Container`, and the datastores as `ContainerDb`.
    - Syntax → [`./c4-mermaid-syntax.md`](./c4-mermaid-syntax.md).
- **§6 Runtime view.**
  - Seed the **primary critical flow(s)** here:
    - Always a happy path.
    - A failure-mode flow if §4 selected async or has an external dependency.
    - An event-propagation flow if §4 selected events.
  - design **seeds** the flows. The `sequences` stage then covers **each §5 AC** (no cap — one flow for each critical user story, and branches for the others).
  - Use one `sequenceDiagram` for each flow, with actors + ≥2 participants + ≥3 arrows. Refer to the §5 containers by name (do not invent names).
  - The messages are semantic. Do not use HTTP verbs / paths / status codes (the `api` stage adds them).
  - Never N/A for M+. XS/S keeps ≥1 happy-path flow.
- **§7 Deployment view.**
  - The topology in 2–3 sentences (where it runs, replicas, scaling thresholds).
  - The monitoring rows (metrics / alerts / tracing) come from the observability conventions of the repo + the spec NFR latency targets.
  - Scaffold → [`../templates/deployment.md`](../templates/deployment.md).
  - For XS/S with no deployment change → `<!-- N/A: reuses existing deployment unit, no infra change -->`. Also write a one-sentence justification.
- **§8 Crosscutting concepts.**
  - Table rows: logging / auth / errors / ID strategy / i18n / observability / events / rate-limiting (where applicable).
  - **Default = use the conventions of the repo**. Put them together in one question («I'm assuming the repo's defaults. Override?» / `Keep defaults` / `Custom for §X`).
  - Use an override for the feature only if spec §6 NFR or §6.1 Security shows a signal for it.
- **§9 Architecture decisions.** The table fills automatically when the blast-radius gate starts ADRs in §4–§8. Do not draft here. The table starts empty and fills during the Socratic walk.
- **§10 Quality requirements.**
  - **≥3 scenarios** (one for each §1 quality goal) in When / Then / How-verify form.
  - Copy the numbers from spec §6 NFR **verbatim**. Do not invent or round numbers (that is a critic F6 hit).
  - Do not use «fast» / «scalable» / «highly available» without a number.
  - How-verify = a concrete test / chaos drill / load-test / metric, not «integration test».
- **§11 Risks & technical debt.**
  - Generate this section automatically at the end of the walk. Use the edits-log + spec §8 Open questions + the brownfield gotchas of the scan.
  - Decision-bank: outbox/queue lag during an outage; schema-versioning debt; brownfield drift; security debt accepted in v1; accepted-debt rows.
  - **Open-architectural-decision rows** come from Save-as-OQ resolutions (severity literal `Open question`).
  - Never N/A.
- **§12 Glossary.** Extract automatically the CONTEXT terms that occur in the body. Also add the domain terms from the walk that are not in CONTEXT, and flag them for a `glossary` follow-up. Never N/A.

## Pre-Socratic hygiene

Before you give the draft in memory to the Socratic walk, do a self-check. If one of these checks fails, generate the related section again (the critic is the second backstop):

- §1 Stakeholders + §3 actors use the CONTEXT glossary roles verbatim (do not invent `user`/`admin` when the glossary names specific roles).
- §2 Constraints agree with the scan (do not contradict the conventions of the repo without an Override note that points to §11).
- §3 + §5 Mermaid blocks declare each element before all `Rel` lines (no dangling references; no `Container_Bondary` typos).
- §10 numeric targets cite the spec §6 NFR row exactly (do not invent; do not round `≤250ms` to `≤300ms`).
- §6 sequence diagrams refer to the §5 Container participants by name.
- §11 has ≥1 row from the brownfield gotchas of the scan (or `<!-- N/A: greenfield -->`).

## Cadence (size-aware) — design's question budget

The 4-state machine, the mini-recap after each 5 questions, and the soft budget for each section all come from [`../../_shared/socratic-loop.md`](../../_shared/socratic-loop.md). The design targets for each section:

| Section | Typical Qs | Note |
|---|---|---|
| §1 Intro & goals | 0–1 | Usually from the spec. Ask if the top-3 quality goals are not clear. |
| §2 Constraints | 1–2 | One combined «any stack/version overrides?» |
| §3 Context | 0–1 | Mostly from the spec + the scan. |
| §4 Solution strategy | 2–4 | The densest section — strategic choices, expect ADRs. |
| §5 Building blocks | 1–3 | Module boundaries, layering style. |
| §6 Runtime | 1–2 | Which failure modes get a diagram. |
| §7 Deployment | 0–2 | Often `<!-- N/A -->` for a feature in an existing unit. |
| §8 Crosscutting | 1 bundled | «Repo defaults + overrides?» |
| §9 ADR index | 0 | Fills automatically. |
| §10 Quality reqs | 1–2 | Numbers from spec NFR + the verify method. |
| §11 Risks | 1–2 | «Top-3 risks?», then make them more precise. |
| §12 Glossary | 0 | Extracted automatically. |

**Total target: 8–20 questions for the full pass.** Above 25, the user gets tired. Then combine more strongly: ask one question for each *uncertainty*, not for each *parameter*. A single «keep the repo's logging/error/ID defaults?» is better than three separate questions. If the user replies with single words three times in sequence, go more slowly.
