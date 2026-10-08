# Draft generation — per-section contract for specify step 6

The `<!-- instruction -->` comment in [`../templates/spec.md`](../templates/spec.md) is the authoritative format for each section. This file connects the steps. It tells where the content comes from and what is forbidden.

## Inputs in priority order

1. **`CONTEXT.md` `## Glossary`** — canonical for role names and domain terms. If an input contradicts the glossary, the glossary wins.
2. **The interview** (step 2 capture + deep-dive) — the problem, the trigger, the success criteria, the constraints.
3. **Ideation output** (step 3, when the depth dial runs it — medium/hard) — the selected approach and its rationale → §1 ¶3.
4. **Channel outputs** (step 5) — reference-module patterns, doc/MCP/KB quotes → only for the traceability of §1 ¶4.

## §5 acceptance-criteria contract

An AC describes a **business-observable outcome from the point of view of the actor**, in Given/When/Then.

- There is **no upper limit**. Propose as many AC as necessary, so that **each §4 user story has ≥1 AC** and all five coverage types are present.
- A `Drop` or a `Save as Open Question` during the Socratic pass can leave a coverage type empty **or a retained §4 user story with no AC**. If this occurs, generate a replacement AC and run a mini-batch on it. These are the two coverage floors, see [`socratic.md`](./socratic.md).
- The «every US has ≥1 AC» rule is a **floor that the skill checks again**, not only a target at draft time. The skill checks it after each §5 resolution. Thus, `sequences` and `review` downstream can be sure that each use case has a testable criterion.

Five coverage types, ≥1 of each:

1. **happy** — the actor does the main flow → the system records the outcome and confirms it.
2. **error** — the actor submits invalid input → the system blocks it and explains the reason. Use this phrase: «system shows the actor that <field> must be <constraint>».
3. **authorization** — the actor does not have permission (cross-tenant / cross-role / not-owner) → the system denies access or hides that the object exists. Give the rationale in business terms.
4. **domain invariant** — the actor violates a named invariant → the system blocks the action and names the invariant in plain language.
5. **cross-context** — the action of the actor depends on state in a different bounded context → the system enforces the cross-context rule.

## Forbidden tokens in §5 AC (stack-agnostic, zero tolerance)

The F6 check of the critic and the pre-write regex scan look for these tokens:

- **HTTP verbs**: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- **URL paths**: all text that starts with `/` and then a lowercase identifier (`/orders`, `/items/{id}`, `/api/v1/...`).
- **status-code numerics** in the AC body: `200`, `201`, `400`, `401`, `403`, `404`, `409`, `5xx`, `500`, `503`.
- **error-code strings** that match `[a-z_]+\.[a-z_]+` (for example `order.not_owner`, `validation.title_too_long`).
- **JSON fragments / payload bodies**: `{title, description}`, `{id, status: "draft"}`.
- **SQL / DB constructs**: `UNIQUE(...)`, `FK`, raw `INSERT`/`SELECT`/`UPDATE`, constraint names. Also each **error type that is specific to a driver or an ORM**. This is the stack-agnostic version of the old Go-only `pq.*` rule.

The technical mapping for all these tokens is in `api` (HTTP method/path/status, error-code strings, payload schemas) and in `data-model` / `decide-adr` (DB constructs). The AC of the spec tells WHAT a user can see, not HOW the system encodes it.

## Stack-agnostic hygiene for §1–§3

The product-level sections must not name a **concrete technology**: a specific datastore, message broker, framework or library. These are `design` decisions. The old SDLC skill used a hard-coded Go/Postgres regex (`Postgres|Redis|Kafka|JSONB`…). The stack-agnostic rule is: flag each proper-noun product or library name in the WHAT/WHY sections, and move it to the design stage.

## Pre-write hygiene (before Socratic)

- The §4 US roles use the CONTEXT glossary terms verbatim.
- Each §3 Non-goal has a reason (do not invent).
- §1 ¶3 gives the committed approach and keeps its direction.
- §5 has ≥1 AC of each coverage type and 0 forbidden tokens (a self-scan; the critic and the regex are the backstop).
