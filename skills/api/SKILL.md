---
name: api
model: inherit
effort: medium
agents: []
description: >
  Use to derive the API contract for a feature: an OpenAPI 3.1 document at
  docs/features/{slug}/contracts/openapi.yaml and a drift/sync report (and an events doc if
  the feature has async flows). Triggers on "api for {slug}", "openapi for {slug}",
  "API contract for {slug}", "lock the interface for {slug}", "events for {slug}",
  "/sdd:api {slug}", "API contract for {slug}", "OpenAPI for {slug}", "describe the endpoints".
  Nobody writes the contract by hand. It is derived from data-model.md (typed fields +
  constraints), the sad.md §6 sequence diagrams (error branches, async actors) and the spec.md
  acceptance criteria. Runs an inline drift check (does the contract agree with the model and the
  sequences?) and a reconcile mode. Hard-refuse if data-model.md is missing AND the feature
  changes the schema → run `data-model {slug}` first. On a legal skip with no schema change, it
  derives from the existing schema.
---

# Skill: api

This skill puts the upstream artifacts into one **interface contract**. The default is an HTTP/OpenAPI contract. But this skill **knows the interface kind**. The kind comes from the surfaces that `design` declared in the `sad.md` frontmatter key `target_surfaces`. **Read it here. Do not derive it again** (→ [`../_shared/surfaces.md`](../_shared/surfaces.md)). For a project that is not HTTP, the skill makes the matching contract form (or it does nothing):

- **HTTP / REST** (default) → `contracts/openapi.yaml` (OpenAPI 3.1) + `api-sync-report.md`.
- **gRPC / RPC** → a `.proto` (or the IDL of the repo), with the same derive-and-drift discipline.
- **CLI** → `contracts/cli.md` — the commands, flags and exit codes, derived from the ACs.
- **Library / SDK** → `contracts/public-api.md` — the public signatures and types that the feature exposes.
- **Event-only / worker** → only `contracts/events.md` (no request/response surface).
- **No external interface** (only internal logic) → **skip**, with a one-line note in the report. Go directly to `tasks`.

In each form, the contract is **derived, never typed by hand**. The sources are:

- `data-model.md` — or, on a legal skip with no schema change, the existing schema;
- the sad.md §6 sequences;
- the ACs of the spec.

This skill exists to find a generated contract that does not agree with the model or the sequences. The rest of this file gives the details of the HTTP path (the usual case). The same loop (derive → drift check → reconcile) applies to the other forms, with the applicable artifact.

This skill keeps only its own machinery. The question phrasing is **shared** → [`../_shared/ask-style.md`](../_shared/ask-style.md). The **size matrix** sets the depth (the events doc only if async; one resource or the full surface) → [`../_shared/size-matrix.md`](../_shared/size-matrix.md). The drift-resolution dialog uses the shared 4-state actions again. Keep it short, and point to the machinery in `_shared`.

The `summary`/`description` prose of the contract follows `artifact_language`. Paths, `operationId`, status codes and schema names **never** change language → [`../_shared/artifact-language.md`](../_shared/artifact-language.md).

English prose (artifacts, questions, reports, handoff) follows ASD-STE100 Simplified Technical English → [`../_shared/ste100.md`](../_shared/ste100.md).

## Owner

The Backend Lead (controls the interface). The PM confirms that each endpoint maps to a real user story. A frontend or consumer engineer is the first reader. The contract is locked before this engineer starts the integration.

## Inputs

- `<slug>` — the same feature slug that each earlier stage used.
- **Gate (conditional — hard-refuse only if a schema change exists):** `docs/features/<slug>/data-model.md`.
  - If it is present, it is the source of the typed fields and the constraints.
  - If it is absent, examine the N/A condition of `data-model` (no schema change — [size-matrix fast lane](../_shared/size-matrix.md)) yourself. The condition is true when:
    - sad.md §5 declares no new building blocks or entities;
    - there is no staged `docs/features/<slug>/migrations/`;
    - the spec adds no new entity.
  - If the condition is true → **continue**. Get the types and the constraints from the **existing schema** (the live `migrations/` DDL + `architecture-map.md` §Migrations/§Conventions). Say this clearly in the handoff.
  - If it is absent **and** a schema change exists → STOP and point: «run `data-model <slug>` first — the contract is derived from its entities».
- (Expected) The `sad.md` frontmatter key `target_surfaces`. It selects the contract form (step 1).
  - **If it is absent or empty, warn** («surfaces undeclared — re-run `design`, or proceeding as `backend-service`») **and use `[backend-service]`**. Then derive from the architecture map (→ [`../_shared/surfaces.md`](../_shared/surfaces.md)).
- (Expected) `docs/features/<slug>/sad.md` §6 — the Mermaid `sequenceDiagram` blocks.
  - Their `alt`/`else` branches become the error `responses`.
  - An async participant (`<message-bus>` / `<external-system>`) on a flow that changes data has two results. Its endpoint must have an `Idempotency-Key`, and the participant starts `events.md`.
  - If §6 is absent, write a note about the gap. The error branches then come only from `spec.md` §5, so authorization branches are probably missing. Still make the contract.
- (Expected) `docs/features/<slug>/spec.md`.
  - The §4 user stories give the endpoint list.
  - The §5 acceptance criteria give the shape of each happy outcome and each error outcome.
  - The spec deliberately has **no** HTTP, status, error-code or SQL details. This skill does that mapping.
- (Optional) `docs/features/<slug>/.size` — a depth hint.
  - If it is absent, use M (full surface) **and say this clearly in the handoff** — «size M (default — no `.size`; run `/sdd:classify-size <slug>`)».
- (Optional) `docs/features/<slug>/adr/*.md` — if an ADR mandates a value, it overrides the defaults (versioning, error format, auth scheme).
- (Optional) `CONTEXT.md`. Read the file at the repo root and the file in `docs/features/<slug>/`. The file of the feature wins → [`../glossary/SKILL.md`](../glossary/SKILL.md). Glossary terms become schema names verbatim.
- (Optional) An existing `contracts/openapi.yaml` → make a diff and update it in place. Never overwrite the full file.

## Protocol

1. **Gate, interface kind, read.**
   - Run `test -f docs/features/<slug>/data-model.md`. This gate has three results, not two:
     - **present** → derive from it (the default path below, not changed);
     - **absent + no schema change** → **CONTINUE**. Examine the N/A condition of `data-model` yourself: sad.md §5 names no new building blocks or entities, there is no staged `docs/features/<slug>/migrations/`, and the spec adds no new entity. This is the legal fast-lane skip.
       - Get the types and constraints from the **existing schema** (live `migrations/` DDL + `architecture-map.md` §Migrations/§Conventions).
       - Record the origin of each field as `existing schema — <migration/DDL anchor>`, with the same confidence scale.
       - Write this clearly in the handoff: «data-model.md absent — legal fast-lane skip (no schema change); fields derived from the existing schema».
     - **absent + a schema change exists** → refuse with the pointer above.
   - **Find the interface kind. Read the `sad.md` frontmatter key `target_surfaces` FIRST.** `design` already declared it. The surface selects the contract form ([`../_shared/surfaces.md`](../_shared/surfaces.md)):
     - `backend-service` → OpenAPI / gRPC / events, from its sub-kind;
     - `cli` → `contracts/cli.md`;
     - `worker` → `contracts/events.md`;
     - `library-sdk` → `contracts/public-api.md`;
     - a UI surface (`web-frontend` / `mobile-app` / `desktop-app`) *uses* the backend contract. It does not write one.
   - **Derive the kind** from `docs/architecture-map.md` and the capabilities of the spec **only if the SAD or the field is absent** (a greenfield run with no `design` stage).
     - HTTP/REST → the OpenAPI path below (the default, with details here).
     - gRPC/CLI/library/event-only → make the matching contract form (see the intro). Use the same loop derive→drift→reconcile.
     - **No external interface** (only internal logic) → skip to `tasks`, with a one-line note in the report. This self-skip is the N/A condition of `api` in the [size-matrix fast lane](../_shared/size-matrix.md).
   - Then read these inputs:
     - `data-model.md` (entities, fields, types, constraints) — or, on a legal skip, the existing schema sources above;
     - `sad.md` §6 (flows, `alt` branches, async actors);
     - `spec.md` §4/§5.
   - Show a one-line "found / missing" note for sad.md and spec.md. Never refuse if they are absent. Only make the derivation smaller and record the gap.
2. **Copy the template.** Copy [`./templates/openapi.yaml`](./templates/openapi.yaml) → `docs/features/<slug>/contracts/openapi.yaml`. If async flows exist, also copy [`./templates/events.md`](./templates/events.md) → `contracts/events.md`. Fill `info.description` from `spec.md` §1 (why this API exists).
3. **Derive the endpoints and the schemas.**
   - Write one endpoint (or more) for each §4 user story.
   - Each request field and response field comes from a column of a `data-model.md` entity. On a legal skip, it comes from a column of the existing schema (the DDL of a live migration).
   - Copy its constraints (`maxLength`/`pattern`/`enum` from the bounded types of the model).
   - **Never make up a field that has no origin in an input.** Ask the user where it comes from.
   - Use `$ref` for each shared schema. Do not copy schemas inline.
   - Lists use cursor pagination (`?after=&before=&limit=`), in the wrapper `{items, has_next, has_prev, next_cursor}`.
4. **Derive the error responses from the sequences.**
   - For each endpoint that a §6 flow covers, change each `alt … else … end` branch into a `responses` entry.
   - The error body is the unified envelope **`{code, message, details?}`**.
   - `code` follows the **neutral** convention `module.error_name` (snake_case, for example `lesson.not_owned`, `lesson.invalid_state`). This is a naming rule, not a language artifact.
   - Map the status by class (4xx client / 5xx server).
   - This step closes a usual gap in the spec. §5 lists the happy path and some errors. The sequences list the authorization branches and the concurrent-state branches that the spec does not have.
5. **Async and idempotency.**
   - A mutating endpoint must have an `Idempotency-Key` if its §6 flow shows a retry note or an async actor. Give the TTL.
   - For each async message, fill an `events.md` entry: the event name `module.action.vN`, the payload schema, the producer, the consumers, the retry / dead-letter behavior.
6. **Examples and placeholder data.** Each operation has a request example, a success example and an error example. Use only placeholder values (`<...>@example.test`, `+380 00 000 00 00`, `Test User`). Never use real PII.
7. **Inline DRIFT CHECK (in two directions) and the report.**
   - Compare the generated contract with the artifacts that you read. Write `docs/features/<slug>/contracts/api-sync-report.md` — see [`./references/drift-check.md`](./references/drift-check.md).
   - The report has a field-origins table (one row for each `operation.field`: `path | origin | confidence`) and a checklist.
   - The check goes in **two directions**:
     - **forward** (the contract is derived correctly): endpoint↔model, error-code↔repo, validation↔constraint, OpenAPI↔sequence.
     - **back-feed (coverage cross-check)**:
       - each `spec.md` §5 AC maps to ≥1 operation or response;
       - each operation maps to a §4 user story and ≥1 AC;
       - each `alt` branch in `sad.md` §6 has a response;
       - if the contract needs an error or authorization response that no §6 flow shows, this is a **sequence gap**.
     - A gap here is not an api bug. It is a gap upstream. Show it, and resolve it as **Save-as-OQ with the upstream stage as owner**.
       - The OQ row names the stage that makes the source as the owner: `specify` for a missing AC, `sequences` for a missing branch.
       - The due date is «before the contract is finalized».
       - Thus, the team fixes the source through the standard 4-state machine, not a fifth action.
   - If a **core** finding fails (or there are ≥3 flags in total), pause the run. Resolve each finding with the shared 4-state actions ([`../_shared/ask-style.md`](../_shared/ask-style.md)): Accept / Fix (the contract) / Save-as-OQ / Drop.
   - If the fix is upstream (the AC of the spec, the sequence), use the **Save-as-OQ variant with the upstream stage as owner** (see the back-feed of step 7). Never use a fifth action.
   - Never change the sources silently. Show the difference, and let the person select the correct artifact (the contract, the AC of the spec, or the sequence).
8. **Lint, write, commit.**
   1. Recommend `spectral lint contracts/openapi.yaml`. If the check target of the project does not have it, add it.
   2. If the check is clean, write the files. Propose the commit `api: <slug> contract`.
   3. **Emit the stage-handoff block**. Obey [`../_shared/handoff.md`](../_shared/handoff.md). Write *What I did*, *Review* (`contracts/openapi.yaml`, `api-sync-report.md`, + `events.md` if async) and *Run next* (`/clear`, then `/sdd:tasks <slug>`).

### Reconcile mode

`/sdd:api <slug> --reconcile` derives the contract again after an upstream artifact changed. Usually, `data-model.md` arrived or became stricter after a first pass with less data. The mode does these steps:

- It reads the inputs again.
- If the model now has a constraint, it makes the loose types stricter.
- It updates the confidence column of the field-origins table.
- The most important step: it shows each field that **had** an inferred origin but **now does not agree** with the model. That difference is real drift, not old incompleteness.

`info.version` never increases silently. The user increases it with a CHANGELOG line.

## Definition of Done

- `docs/features/<slug>/contracts/openapi.yaml` is written:
  - OpenAPI 3.1;
  - `BearerAuth` global, and public endpoints declare explicit `security: []`;
  - each error response uses the `{code, message, details?}` envelope;
  - each operation has examples;
  - all shared types use `$ref`.
- `api-sync-report.md` is written next to it: the field-origins table and the 4-point drift checklist. Each core finding is ✓ or explicitly resolved with the user.
- Each endpoint maps to a §4 user story. Each field comes from a `data-model.md` column (or, on a legal fast-lane skip, from a column of the existing schema that the field-origins table names). Each error `code` exists in the error definitions of the repo (checked in the form that the repo uses).
- `contracts/events.md` is present only if the feature has async flows. Each event has a payload schema, a producer, consumers and a retry / DLQ note.
- The step-7 drift check (two directions) and `api-sync-report.md` are the **structural self-check** of this skill ([`../_shared/self-check.md`](../_shared/self-check.md)). The handoff gives its result.

## Anti-patterns

- **A contract written by hand**, and then the model or the sequences changed to agree with it. The direction is one way only: model (or the existing schema on a legal skip) + sequences + spec → contract.
- **No drift check** because "it was just generated, of course it matches". A generated contract can agree with the spec as read, but not with the model or the sequences. These are different files from different authors. A clean 4/4 ✓ costs little. A silent ✗ in production costs much.
- **Error responses only from the spec.** §5 lists the happy path and some errors. The §6 sequences have the authorization branches and the concurrent-state branches. If you skip them, gaps stay.
- **A field that you make up** with no origin in an input. Or a field that left `data-model.md` and that you **remove silently**. Keep it with a `# stale` note and show it. The person decides.
- **A hard refuse when the skip was legal.** Do not send a feature with no schema change back to `data-model` only to make an empty document. The gate is conditional (step 1). Refuse only if a schema change really exists. If not, derive from the existing schema and say so.
- **Schema names or error names that are specific to a stack.** Schemas use the domain language from `data-model.md`. Error codes use the neutral `module.error_name` convention. They are not a Go/TS/Python idiom, and they are not related to the error type of a driver.
- **Free-text errors** (`{"error": "failed"}`), `?v=2` query versioning, `nullable: true` (3.0 style — use `type: [string, null]`), offset pagination or real PII in examples.
- **A new derivation of the interface kind when `design` already declared it.** `target_surfaces` in `sad.md` is the primary signal. Read it. The derivation from the architecture map is **only the fallback** when the SAD or the field is absent (greenfield). Do not infer HTTP or events silently on each run. The surface awareness of this skill removes this double derivation.

## References & template

- [`../_shared/ask-style.md`](../_shared/ask-style.md) — the canonical phrasing of questions and options for the drift-resolution dialog (step 7).
- [`../_shared/size-matrix.md`](../_shared/size-matrix.md) — MVP depth (one resource, events only if async) or Full surface depth.
- [`../_shared/surfaces.md`](../_shared/surfaces.md) — the declared `target_surfaces` (read from `sad.md`) select the contract form. This skill reads them and never derives them again.
- [`./references/drift-check.md`](./references/drift-check.md) — the field-origins table, the 4-point drift checklist, the reconcile semantics and the conflict table.
- [`./templates/openapi.yaml`](./templates/openapi.yaml) — the OpenAPI 3.1 scaffold: `BearerAuth`, cursor page wrapper, `{code, message, details?}` Error schema.
- [`./templates/events.md`](./templates/events.md) — the scaffold for async event contracts (producer / consumers / payload / retry / DLQ).
