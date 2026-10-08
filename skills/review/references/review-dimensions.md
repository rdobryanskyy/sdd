# Review dimensions + dispatch

The independent review (step 2) examines the feature diff along these dimensions. For a small change, one [`reviewer`](../../../agents/reviewer.md) pass covers all of them. For a large diff, dispatch one reviewer for each dimension and merge the findings.

## Stage 1 — does it do what the spec says (the gate that can block ship)

- **AC compliance.** Examine each AC that the change claims (the `SDD-AC` trailers / `tasks.json` `acs`). Does the code really produce the business-observable outcome that the AC names? Is there a test that asserts *that outcome* (not a tautology)?
- **End-to-end use-case + AC trace (the backstop).** Take the **full** spec **§4 user-story set and §5 AC set**, **not only the ACs that the diff claims**. Trace both through the chain:
  - **Use-case level:** each §4 user story has ≥1 AC (the use-case floor of specify) and a §6 sequence flow (the use-case pass of sequences).
  - **AC level:** **spec §5 → `sad.md` §6 sequence (a flow or branch shows it) → `data-model.md` (the schema supports it) → `contracts/openapi.yaml` (an endpoint/event exposes it) → `tasks.json` (a task claims it) → implement (code + a test asserts it)**.
  - **The trace includes each surface that `sad.md` `target_surfaces` declares, not only the backend.** For a UI surface (`web-frontend` / `mobile-app` / `desktop-app`), a UI AC gets to a `ui`-layer task and a **component / e2e-through-UI** test. A UI-driven §6 flow (`<user>` → `<ui>` → `<service>`) shows it. If a UI AC has only a backend test, it is a gap.
  - The §5 set includes each AC that has an `<!-- added-by-fix -->` marker. Trace it as you trace each other AC: full chain coverage. The pinning test of the fix is its minimum, not its maximum.
  - Flag each item that **drops out at a point in the chain**: a user story with no AC or no flow, or an AC with no flow, task, test or code.
  - Each per-stage gate guards one link: the §5 5-type and use-case floors of specify, the use-case and AC→flow coverage of sequences, the AC→test map of plan-tests, and the AC→task map of tasks. `review` is the **end-to-end backstop**. It finds each item that fell *between* links and never got to the diff.
- **Contract fidelity.** Does the change obey `data-model.md`, `contracts/openapi.yaml` and the Accepted ADRs (for example, the audit-in-transaction decision)? Or does it silently diverge?

A stage-1 finding means that the feature does not yet satisfy its spec. It blocks ship until you fix it or explicitly remove it from the scope (a spec change, with the owner involved). A user story or AC that dropped out of the chain is a stage-1 finding, also when no line of the diff refers to it.

## Stage 2 — is it good code (quality, usually non-blocking)

- **Conventions.** The code agrees with the patterns of the repo for each layer (error handling, wiring, naming, module boundaries).
- **UI reuse (for a UI surface).** The code uses the existing design system / components / tokens / styling (`architecture-map.md` §Frontend). It does not make them again. Flag new UI that duplicates an existing primitive or adds a second styling system.
- **Error + edge handling.** Does the code handle the error / authorization / invariant criteria of the spec, not only the happy path? Examine concurrency and empty or oversized input. Examine idempotency where the contract requires it.
- **Security.** The identity comes from the session, not from the input. There is no new injection or leak surface. Secrets are not logged.
- **Boundary violations.** The code stays in the module(s) that the tasks named. No test is weakened. There is no DB construct that the migration rules of the repo forbid.
- **Test adequacy.** Do the tests exercise the real behavior, which includes the failure paths? Or do they exercise only the happy path?

## Dispatch shape

Use the clean-context discipline from [`../../_shared/critic.md`](../../_shared/critic.md). The reviewer has read-only tools. It reads `spec.md` / contracts / ADRs again itself, and it gives **cited** findings only:

```
- **[stage-N] <headline>** — file:line; AC: <id|n/a>; problem: <what>; suggested: <fix>.
```

In the dispatch prompt, tell the reviewer to write its report in ASD-STE100 → [`../../_shared/ste100.md`](../../_shared/ste100.md).

On an async host (background or teammate mode), add the report-delivery instruction ([`../../_shared/agent-roster.md`](../../_shared/agent-roster.md), shared-contract point 2) to the dispatch prompt. An idle signal without the report is not a verdict. Get the report through messaging before you merge the findings.

A clean review returns `REVIEW_CLEAN: <scope>`. Remove each finding that does not have a `file:line` and a concrete reason, because it is not actionable. Give priority to correctness and AC compliance, not to style. Judge against the artifacts, not against personal preference. For example, if the spec says hide-existence, a 404-style response is correct, not a bug.
