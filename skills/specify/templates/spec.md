---
status: Draft
owner: "<feature owner>"
reviewers: ["Tech Lead", "Security Lead"]
updated_at: "<today YYYY-MM-DD>"
feature_size: "<from classify-size: XS/S/M/L/XL>"
---

# Spec — <slug>

<!-- instruction: give one-line links to the inputs that you used.
> **Glossary:** [CONTEXT](./CONTEXT.md) (if present)
> **Reference module / docs / channels used:** name the specific paths/queries that you read in step 5, or «None — only the interview + CONTEXT».
Do not write about competitive research or ideation scratch work here. These give data to §1. They are not inputs to cite. -->

## 1. Context

<!-- instruction: 3–4 paragraphs.
¶1 What we solve: the concrete problem from the interview, and for whom (cite a user segment).
¶2 Why now: the trigger (incident, contract, deadline, strategic shift).
¶3 The committed approach, in 1–2 sentences. For M+/L, this is the recommendation from the ideation pass. For XS/S, this is the clear direction from the deep-dive.
¶4 (optional) Traceability context: reference-module patterns or quoted sources. This is also the slot where critic `Override` resolutions emit «Decision override: <headline> — rationale: <reason>» bullets.
This section is WHAT + WHY, not HOW. Do NOT name a concrete datastore / broker / framework / library here. That belongs to design. -->

## 2. Goals

<!-- instruction: give 2–3 measurable strategic outcomes as a bullet list. Each outcome shows the committed approach (§1 ¶3). Do not put raw numbers here. Numbers go in §7 KPIs. -->

## 3. Non-goals

<!-- instruction: give 3–4 explicit non-goals. Write each one as one sentence + a reason. This keeps the scope honest. -->

## 4. User stories

<!-- instruction: give ≥5 user stories, with no upper limit. Give enough stories to cover each role in the CONTEXT glossary + each goal in §2. Format:

### US-NN: <3–6 word action title>
**As a** <role from CONTEXT glossary>
**I want** <action>
**So that** <observable benefit>

Use roles ONLY from the glossary (no invented `user`/`admin`). ≥1 AC in §5 covers each US. -->

### US-01: <title>

**As a** <role>
**I want** <action>
**So that** <benefit>

## 5. Acceptance criteria

<!-- instruction: give ≥1 AC of EACH of the 5 coverage types, with no upper limit. Format:

### AC-NN (US-XX) — <coverage type>
**Given** <business preconditions: actor role, state of their domain objects, prior events>
**When** <business action from the actor's perspective>
**Then** <observable business outcome: actor sees X / system blocks Y and explains Z / system records W>

AC = a business-observable outcome from the point of view of the actor. NOT how the system does it.

FORBIDDEN in AC text (zero tolerance; critic F6 + pre-write regex):
- HTTP verbs (GET/POST/PUT/PATCH/DELETE)
- URL paths (/things, /things/{id}, /api/v1/...)
- status-code numerics in the body (200/201/400/401/403/404/409/5xx)
- error-code strings matching `[a-z_]+\.[a-z_]+` (e.g. order.not_owner)
- JSON fragments / payload bodies ({field: "value"})
- SQL / DB constructs (UNIQUE, FK, raw INSERT/SELECT/UPDATE, constraint names)
The technical mapping for these tokens is in `api` + `decide-adr`. Here, write only what the actor sees.

Permitted: glossary roles, domain-invariant NAMES as natural-language phrases («no published lessons», «unique sequence per course»), glossary domain objects.

The 5 mandatory coverage types (≥1 of each):
1. happy — the actor does the main flow → the system records the outcome and confirms it.
2. error — the actor submits invalid input → the system blocks it and explains the reason in plain language.
3. authorization — the actor does not have permission → the system denies access OR hides that the object exists (rationale in business terms).
4. domain invariant — the actor violates a named invariant → the system blocks the action and names the invariant in plain language.
5. cross-context — the action of the actor depends on state in a different bounded context → the system enforces the cross-context rule.

Tag each AC with its US-NN. For a concurrent edge case, add it as AC-NNb, also in business language. -->

### AC-01 (US-01) — happy path

**Given** an authorized <role> owns a draft <domain-object>
**When** the <role> tries to publish the <domain-object>
**Then** the system records it as published and confirms to the <role>

### AC-02 (US-01) — domain invariant violation

**Given** an authorized <role> owns a draft <domain-object> with no child <sub-objects>
**When** the <role> tries to publish it
**Then** the system blocks the publication and tells the <role> that at least one <sub-object> is required first

## 6. Non-functional requirements

<!-- instruction: give a table. The rows below are a recommended floor, not a limit. Targets are NUMERIC (≤250ms, ≥30 req/s, 99.9%). Do not use adjectives («fast», «high»). Measurement = a concrete production metric. If a number is unknown, write TBD with owner+due in §8. Never write «fast». -->

| Aspect | Target | Measurement |
|---|---|---|
| Latency p95 <write operation> | ≤ <N ms> | <metric source> |
| Latency p95 <read/list operation> | ≤ <N ms> | <metric source> |
| Throughput | ≥ <N req/s> per instance | smoke test in CI |
| Availability | 99.X% | monthly SLO window |
| <Concurrency / Accuracy> | <safety guarantee> | <how enforced> |

## 6.1 Security / privacy

<!-- instruction:
- Data classification: public / internal / confidential / regulated (one word + a rationale of 1 sentence).
- Personal data touched: none, OR list the new fields with type + sensitivity.
- AuthZ/AuthN impact: tell which capabilities / permission checks the feature adds, and which checks run (for example «repo always filters by the caller's org»). Stay surface-neutral: do not use endpoint/route language here. `design` derives the surfaces, and `api` derives the endpoints.
- Abuse cases (3–5): cross-tenant access, draft/data leak, injection through URL/text fields, spam-create with a rate limit, optional token misuse. Give each one with the business response (deny vs hide-existence; a rationale, not status codes).
- Security review verdict: Required (M+ / new authz boundary / new PII) or N/A with a concrete reason. -->

- **Data classification:** <...>
- **Personal data touched:** <...>
- **AuthZ/AuthN impact:** <...>
- **Abuse cases:**
  - <cross-tenant>: <business response>
  - <data-leak>: <how hidden>
  - <spam>: rate limit <N per minute per user>
- **Security review:** <Required / N/A with reason>

## 7. Metrics / KPIs

<!-- instruction: give ≥3 KPIs, with no upper limit. Give each one as baseline → target with a timeframe. baseline=0 is OK for a new feature. If baseline=TBD, an inline measurement plan is necessary. -->

- **<metric 1>** — baseline: <...>, target: <... within ... days>.
- **<metric 2>** — baseline: <...>, target: <...>.
- **<metric 3>** — baseline: <...>, target: <...>.

## 8. Open questions

<!-- instruction: give 2–4 open questions. Format: `- [ ] <question>? Default now: <X>. — owner: <name/role>, due: <date or stage trigger like "before sdd:tasks">`. Each question has an owner + due. A lone «TBD» is an anti-pattern. -->

- [ ] <question>? Default now: <...>. — owner: <name/role>, due: <date or stage>
- [ ] <question>? — owner: <name/role>, due: <date or stage>
