<!-- Template for `plan-tests`. -->
<!-- M+: write to docs/features/<slug>/test-plan.md (this whole file). -->
<!-- XS/S: paste only the "## AC coverage" + "## Edge cases / error paths" blocks inline into -->
<!--       spec.md under a `## Test plan` heading. No frontmatter, no separate file. -->
<!-- Write the plan BEFORE tests exist. `implement` reads the AC→test map and writes the red -->
<!-- tests against it. Stay STACK-AGNOSTIC: name test LEVELS, never a runner / broker / load -->
<!-- tool. `implement` finds the real commands in the repo. Do not set them here. -->

---
status: Draft
owner: "<QA owner>"
reviewers: ["<implementing engineer>", "<Tech Lead>"]
updated_at: "<YYYY-MM-DD>"
feature_size: "<XS|S|M|L|XL>"
---

# Test plan — <feature>

<!-- In one line, say again what this feature must do. This gives a frame to the coverage below. -->

## Levels

<!-- These are the only permitted levels. They are generic, with no tool names. If a row does -->
<!-- not apply to this feature, drop it or mark it <!-- N/A: reason -->. Do not add filler text. -->
<!-- `implement` picks the actual runner/tool for each level from what the repo already uses. -->
<!-- The Component / Visual-regression / E2E-through-UI rows apply ONLY when sad.md frontmatter -->
<!-- target_surfaces declares a UI surface (web-frontend / mobile-app / desktop-app). They are the -->
<!-- "testing trophy" vocabulary (_shared/surfaces.md). For a backend-only feature, drop them. -->

| Level | Scope | Strategy (generic — no tool names) |
|---|---|---|
| Unit | Pure logic: a rule, a calculation, a validator. No I/O. | In-memory, no external dependency. |
| Integration | The module against a real dependency that it owns (store / cache / queue). | An ephemeral real dependency, e.g. a throwaway DB container that each suite starts. |
| Contract | A boundary between two participants: an API shape or event schema that the two sides agree on. | Validate the real shape against the agreed contract. Do not write stubs by hand. |
| E2E | One full flow from start to end (one for each critical user story). | The test runs the flow through its real entry point against ephemeral dependencies. |
| Load | NFR validation, only when an NFR has a number. | The load tool already in your repo, or e.g. k6 or Locust. |
| Component *(UI surface only)* | A UI component in isolation: props/state → rendered output + interactions. | Render it in a component harness. Assert the output + behavior. Do not start the full app. |
| Visual-regression *(web UI only)* | The test compares the rendered UI with an approved baseline image. | Snapshot the render. Fail on a visual diff that is not intended. Update the baseline only on purpose. |
| E2E-through-UI *(UI surface only)* | The test drives a user-story flow through the real UI, not only through the API. | The test runs the flow through the rendered UI against ephemeral dependencies. |

## AC coverage

<!-- THE CORE OF THIS PLAN: each acceptance criterion in spec.md §5 → at least one test row. -->
<!-- One AC can have several rows (a unit test for the rule + an e2e test for the flow). -->
<!-- Each AC must have a test. Name the test from the intent of the AC, not a framework convention. -->
<!-- Write the expected outcome in plain words. NO status numbers, NO error-code strings, NO SQL. -->

| AC (spec.md §5) | Test name (intent-based) | Level | Expected outcome |
|---|---|---|---|
| AC-01 <happy path> | <e.g. request within limit is served> | unit + e2e | <served normally> |
| AC-02 <error path> | <e.g. request over limit is rejected> | unit + e2e | <rejected, caller told the limit was hit> |
| AC-03 <authorization> | <e.g. caller without rights is refused> | integration | <refused, action not performed> |
| AC-04 <domain invariant> | <e.g. invariant holds after the operation> | integration | <invariant still true> |

## Edge cases / error paths

<!-- Give each error / authorization AC its OWN dedicated row. Never put it into a happy path. -->
<!-- Add the boundary & failure cases that the spec implies. Name the outcome in plain words. -->

- <missing required identifier> → expected: <named outcome>
- <malformed input> → expected: <named outcome>
- <dependency unavailable> → expected: <the spec's fallback behaviour, e.g. fail-open / fail-closed>

## Test data

<!-- Tell how the tests build and remove the test data. Seed = factories/fixtures for the entity -->
<!-- shape (if data-model.md is present, read it). The cleanup boundary is important: -->
<!-- no cleanup → flaky suite → CI block. -->

- Seed strategy: <factories / fixtures matching data-model.md entities>.
- Integration dependency: an ephemeral real dependency (throwaway container), NOT a mocked store.
- Cleanup boundary: <per-test | per-suite>. Reset the state, so that each run is independent.

## NFR validation (load)

<!-- Write one scenario for each NUMERIC NFR from spec.md §6. If no NFR has a number → N/A. Do NOT invent one. -->
<!-- The tool stays generic: the load tool already in your repo, or e.g. k6 / Locust. -->

- <NFR: p95 latency ≤ N ms> → scenario: <target rate> for <duration>, assert <metric> ≤ <threshold>.
- <NFR: throughput ≥ N req/s> → scenario: sustain <rate> for <duration>, assert no error-rate regression.

<!-- If spec.md §6 has no numeric NFR: -->
<!-- N/A: no numeric NFR to load-test. -->

## CI placement

<!-- This is advice, not pipeline config. `implement` and the CI of the repo own the real wiring. -->

- On every PR: <unit, contract — the fast suites>.
- On schedule / pre-release: <e2e, load — the heavier suites>.
