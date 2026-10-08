---
name: plan-tests
model: inherit
effort: medium
agents: []
description: >
  Use to turn the acceptance criteria of a feature into a test plan before a test exists. The
  plan is a table that maps each spec.md §5 acceptance criterion to at least one test. It names
  the test levels (unit / integration / e2e / contract / load) and does not bind to a language or
  framework. It also sets the integration and data strategy. Triggers on "plan tests for {slug}",
  "test plan for {slug}", "how do we test {slug}", "test strategy for {slug}",
  "/sdd:plan-tests {slug}", "test plan for {slug}", "how to test {slug}", "test plan".
  Output: docs/features/{slug}/test-plan.md (separate file for M+), or inline in spec.md for
  XS/S per the size matrix. Hard-refuse if spec.md is missing → run `specify {slug}` first.
---

# Skill: plan-tests

This skill turns a feature that has a spec into a **test plan**. The plan contains:

- A table that connects each acceptance criterion in `spec.md §5` to at least one named test.
- The levels of these tests (unit / integration / e2e / contract / load).
- The integration strategy (a real dependency that the suite starts and then discards).
- The approach for test data + cleanup.

The skill writes the plan *before* a test exists. The next stage, `implement`, reads this map and writes the red tests against it. It does not write them "however it seems". This file is the spine. The output scaffold is in `templates/test-plan.md`.

This skill keeps only its own machinery. The question phrasing is **shared** → [`../_shared/ask-style.md`](../_shared/ask-style.md). The depth (inline in the spec or a separate file) follows the **size matrix** → [`../_shared/size-matrix.md`](../_shared/size-matrix.md). The skill names test *levels*, never test *tools*. `implement` finds the concrete commands in the repo. They are not hard-coded here.

Plan prose follows `artifact_language`. The `## Test plan` heading (parsed downstream), the test names and the level tokens stay English → [`../_shared/artifact-language.md`](../_shared/artifact-language.md).

English prose (artifacts, questions, reports, handoff) follows ASD-STE100 Simplified Technical English → [`../_shared/ste100.md`](../_shared/ste100.md).

## Owner

QA + the engineer who will implement the feature (co-authors). The tasks of each person:

- QA controls the level breakdown and the edge/error cases.
- The implementing engineer makes sure that each acceptance criterion has a test that can run, and that the integration strategy is correct for the repo.
- The Tech Lead approves that each acceptance criterion has a test.

## Inputs

- `<slug>` — the same feature slug that each earlier stage used.
- **Gate (hard-refuse if missing):** `docs/features/<slug>/spec.md`. Its §5 acceptance criteria are the only reason for this plan. Each criterion must map to a test. If `spec.md` is absent, STOP and point: «run `specify <slug>` first — the test plan maps its §5 acceptance criteria to tests».
- (Optional) `docs/features/<slug>/data-model.md`. The entity shapes tell you which test data to build and which data to seed/clean for each suite. If it is present, read it.
- (Optional) `docs/features/<slug>/sad.md` §6 sequence diagrams. Each drawn flow is a possible e2e test. Each boundary between participants is a possible contract test.
- (Optional) `docs/features/<slug>/.size` — a hint for the depth. If it is absent, use M as the default (a separate `test-plan.md` file). **Say this clearly in the handoff:** «size M (default — no `.size`; run `/sdd:classify-size <slug>`)».

## Protocol

1. **Gate.** Run `test -f docs/features/<slug>/spec.md`. If it fails, refuse with the pointer above. Then read §5 (the acceptance criteria: the rows of the coverage table) and §6 (the NFRs: they control the load tests). If `data-model.md` / `sad.md` §6 are present, read them.
2. **Pick the output target.** Use the size matrix:
   - **XS/S → write the plan inline in `spec.md`** as a short `## Test plan` section. A coverage table is enough. Do not make a separate file.
   - **M+ → write a separate `docs/features/<slug>/test-plan.md`** from the template.

   If `.size` is absent, confirm the target with one `AskUserQuestion` (phrasing per [`../_shared/ask-style.md`](../_shared/ask-style.md)).
3. **Map levels — generic only.** Name the test levels from a fixed vocabulary. Never name a tool or a language:
   - **unit**: pure logic (a rule, a calculation, a validator), with no I/O.
   - **integration**: the module against a real dependency that it owns (DB, cache, queue).
   - **e2e**: a full flow from start to end. Use one for each critical user story.
   - **contract**: a boundary between two participants. This is an API shape or an event schema that the two sides agree on.
   - **load**: use it only when an NFR has a number (throughput, p95 latency).

   **If the `sad.md` frontmatter `target_surfaces` declares a UI surface** (`web-frontend` / `mobile-app` / `desktop-app`), add the frontend tiers:
   - **component**: a UI component that a test exercises in isolation.
   - **visual-regression** (web): the test compares the rendered UI with a baseline.
   - **e2e-through-UI**: the test drives the flow through the real UI, not only through the API.

   These tiers are the **"testing trophy"**. It is the dominant frontend testing vocabulary (web.dev / Kent C. Dodds). It is a vocabulary, not a mandate (→ [`../_shared/surfaces.md`](../_shared/surfaces.md)). Do not write tool names: no specific test runner, broker, visual-regression tool or load tool. `implement` finds what the repo already uses (e.g. Playwright / Storybook / a visual-diff tool).
4. **Core mapping (the contract of this skill) — the user chooses the level for each AC.** Build the AC→test table: **each acceptance criterion in §5 maps to ≥1 test.**
   - For each AC, **propose a default level** from this heuristic:
     - Pure logic/rule/validator → unit.
     - Behavior against a real dependency that the module owns → integration.
     - A full user-story flow → e2e.
     - An API/event shape between participants → contract.
     - If a UI surface is declared: a UI piece → component, and a user-facing flow → e2e-through-UI.
   - Then **confirm the level(s) with the user** through one `AskUserQuestion` (multiSelect). One AC can have tests at several levels, for example unit for the rule + e2e for the flow. Use the phrasing per [`../_shared/ask-style.md`](../_shared/ask-style.md).
   - The choice of the user is final. Record it in the Level column of the table. `implement` reads it to write the test at the correct level. `implement` does not decide again.
   - A criterion with zero tests is the most serious anti-pattern.
   - Give each test a descriptive name from the intent of the criterion (e.g. `over-quota request is rejected`), not from a framework convention.
5. **Edge cases & error paths.** Give each error/authorization acceptance criterion its own dedicated test row. Never put it into the happy path. List the boundary and failure cases that the spec implies, as explicit rows. Examples: missing identifier, malformed input, dependency unavailable → the fallback behavior of the spec. Name the expected outcome of each row in plain words (no status numbers, no error-code strings).
6. **Integration strategy — real, ephemeral dependency.** For integration tests, the default is **an ephemeral real dependency, e.g. a throwaway DB container**. The suite starts it and removes it after the run (testcontainers-style).
   - Do not mock the datastore. It is an anti-pattern. A mock that passes does not show that production passes.
   - Write the seed strategy (factories/fixtures for the data shape).
   - Write the cleanup boundary (per-test or per-suite). Without cleanup, the suite becomes flaky and blocks CI.
7. **NFR → load.** For each §6 NFR that has a number, write one concrete load scenario: the target rate, the duration, the metric and its threshold. Name the tool generically: **the load tool already in your repo, or e.g. k6 or Locust**. If no NFR has a number, mark the load section `<!-- N/A: no numeric NFR -->`. Do not invent a load test.
8. **CI placement.** Write which suites run where:
   - The fast suites (unit, contract) run on each PR.
   - The heavier suites (e2e, load) run on a schedule or before a release.

   This split is advice, not a pipeline config. `implement` and the CI of the repo own the actual wiring.
9. **Socratic walk + write.** Go through the coverage table and the strategy choices with the 4-state actions from [`../_shared/ask-style.md`](../_shared/ask-style.md) (Accept / Fix / Save-as-OQ / Drop). On Fix, make that one row again (one round; the second answer is final). Keep the edits-log per [`../_shared/socratic-loop.md`](../_shared/socratic-loop.md). On pass, write the plan to its target (a separate file for M+, an inline `## Test plan` for XS/S).
10. **Structural self-check** — per [`../_shared/self-check.md`](../_shared/self-check.md). Read the written plan again from disk and make sure of these **6 items**:
    1. Each `spec.md` §5 AC id is in the coverage table.
    2. Each error/authorization AC has its **own dedicated row** (not put into a happy path).
    3. Each Level value ∈ the fixed vocabulary {unit, integration, e2e, contract, load, component, visual-regression, e2e-through-UI}.
    4. The plan has **zero tool names**. No runner / broker / visual-diff / load-tool name is permitted, except the single "e.g. k6 / Locust" allowance.
    5. The load section has numbers (rate + duration + metric + threshold) or the literal `<!-- N/A: no numeric NFR -->`.
    6. The plan is at the correct target for its size: an inline `## Test plan` for XS/S or route `quick`, a separate `test-plan.md` for M+.

    Fix + check again, ≤2 cycles. Show each problem that stays open.
11. **Propose commit + handoff.** Propose the commit `test-plan: <slug>`. Then **emit the stage-handoff block** per [`../_shared/handoff.md`](../_shared/handoff.md):
    - *What I did* (incl. «self-check: 6/6 pass»).
    - *Review* (`test-plan.md`, or `spec.md` `## Test plan` for XS/S).
    - *Run next* (`/clear`, then `/sdd:implement <slug>`). `implement` uses this map to write the red tests.

## Definition of Done

- The plan is at the correct target for its size: a separate `docs/features/<slug>/test-plan.md` for M+, or an inline `## Test plan` section in `spec.md` for XS/S.
- **Each acceptance criterion in spec.md §5 maps to ≥1 named test.** No criterion is without a test.
- Each error / authorization criterion has its own dedicated test row. It is not put into a happy path.
- The test levels are generic (unit / integration / e2e / contract / load; + component / visual-regression / e2e-through-UI when `target_surfaces` declares a UI surface).
  - **No test-runner, broker, visual-regression or load-tool name is hard-coded.**
  - The load tool is named only as "the one in your repo, or e.g. k6 / Locust".
  - `implement` finds the UI tools.
- Integration tests use an ephemeral real dependency (a throwaway container). The seed and the cleanup boundary are written. No datastore is mocked.
- Each numeric §6 NFR has a load scenario (rate + duration + metric + threshold), or the load section is explicitly `<!-- N/A -->`.

## Anti-patterns

- **An acceptance criterion with no test.** The purpose of the map is to make §5 verifiable. A criterion without a test is not verifiable.
- **A name of a concrete tool or language**, for example a specific runner, broker or load tool. The legacy plan hard-coded **k6**. Here, load is "the tool already in your repo, or e.g. k6 / Locust", and the other levels stay generic. `implement` finds the real commands.
- **A mocked datastore.** A mock that passes does not show that production passes. For integration, use a throwaway real dependency.
- **e2e without a cleanup boundary.** Old state makes the suite flaky, and each flaky run blocks CI.
- **"100 % coverage" as the goal.** The target is the critical paths + the happy + error paths, mapped to acceptance criteria. It is not a line-count number.
- **A wishlist plan** ("would be nice to add"). A test plan is a commitment that the next stage does. It is not a backlog.
- **An invented load test without a numeric NFR.** If there is no number, write `<!-- N/A -->`. Do not invent a throughput target.

## References & template

- [`../_shared/ask-style.md`](../_shared/ask-style.md) — the canonical question/option phrasing for steps 2 and 9.
- [`../_shared/self-check.md`](../_shared/self-check.md) — the structural self-check contract that step 10 runs.
- [`../_shared/size-matrix.md`](../_shared/size-matrix.md) — the depth: inline in the spec (XS/S) or a separate file (M+).
- [`../_shared/surfaces.md`](../_shared/surfaces.md) — a declared UI surface adds the component / visual-regression / e2e-through-UI tiers (testing-trophy vocabulary). Read it from `sad.md` `target_surfaces`.
- [`./templates/test-plan.md`](./templates/test-plan.md) — the output scaffold: the AC→test mapping table, the generic test levels, the integration strategy with an ephemeral dependency, and a load section that does not depend on the stack. Its `<!-- … -->` comments are the contract for each section.
