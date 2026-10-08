---
name: fix
model: opus
effort: high
agents: [explorer]
description: >
  Use to fix a reported bug spec-first. Reproduce it, trace the symptom to the acceptance criteria
  of the owning feature, and pin it with a failing (RED) test. Apply the minimal GREEN fix through
  the same per-task gate that implement uses. Then patch the spec, so that the bug class cannot
  silently return. Triggers on "fix {bug}", "fix the bug in {slug}", "bug in {feature}", "/sdd:fix {slug}",
  "regression in {slug}", "fix the bug", "fix a bug", "regression in {slug}", "why did it break".
  Triage has three outcomes: AC exists and is violated (regression) / AC is ambiguous (spec-bug —
  patch the wording) / no AC covers it (gap — add one, marked added-by-fix). Works on a repo
  with no specs (soft mode — code-first, recommends survey after). Writes a fix record
  under docs/features/{slug}/_fixes/ and commits with an SDD-Fix trailer.
---

# Skill: fix

This skill is the **bugfix entry point**. It is the backbone in a small size, for «it's broken», not for «build a feature». The skill uses a bug as **evidence about the spec**, not only about the code. There are three possible causes:

- An acceptance criterion is violated (the code regressed).
- The AC was ambiguous, so it permitted the behavior (the spec is the root cause).
- No AC covers the behavior (a gap).

Thus the fix always goes into two places:

- The **code**: RED → GREEN through the same gate that `implement` runs.
- The **spec**: a small, exact AC patch.

A small fix record connects the two changes.

This skill keeps only its own machinery. Question phrasing → [`../_shared/ask-style.md`](../_shared/ask-style.md). RED-classification semantics → [`../implement/references/tdd-loop.md`](../implement/references/tdd-loop.md) (used again, never copied). Dispatch policy → [`../_shared/agent-roster.md`](../_shared/agent-roster.md).

Fix-record prose follows `artifact_language`. But a **spec patch uses the language of the existing spec** (the file wins over the setting). Code, tests and commits stay English → [`../_shared/artifact-language.md`](../_shared/artifact-language.md).

English prose (artifacts, questions, reports, handoff) follows ASD-STE100 Simplified Technical English → [`../_shared/ste100.md`](../_shared/ste100.md). This includes the fix commit message.

## Owner

The engineer who works on the bug (controls the work). Ask the PM / Tech Lead only when the triage result is «spec-bug» or «gap». A change to an AC is a product decision, not a code decision.

## Inputs

- `<slug>` — optional. If you know which feature owns the bug, give it. If not, step 2 finds it from the symptom.
- The bug report, in any form: a sentence, a stack trace, a failing request, a description of a screenshot.
- **Soft gate (never hard-refuse):** `docs/features/` with ≥1 `spec.md`. If it is absent (a brownfield repo that never ran the backbone), still run, in **no-spec mode**:
  - Do steps 1 → 3 → 4 → record.
  - Skip the spec patch.
  - Recommend `/sdd:survey` in the handoff.
- (Optional) `.claude/sdd.local.md` — overrides for the gate commands. If it is absent, find the commands with the cascade of `implement`.

This skill has no depth dial and no `.size`. A fix has one size, and the bug report is the interview.

## Protocol

1. **Intake — reproduce before you touch anything.** Use at most 1–2 `AskUserQuestion` (phrasing per [`../_shared/ask-style.md`](../_shared/ask-style.md)). Ask only for the data that the report does not give: expected vs actual, the steps, the scope (one user? all? since when?). The result is a one-line reproduction statement: «doing X, expected Y, got Z». If you cannot write the bug in this form, it is not ready for a fix.
2. **Trace to spec (triage).**
   - Grep `docs/features/*/spec.md` for the domain terms of the reproduction. Also grep the `_fixes/` of the candidate slug, to find a recurrence.
   - Find the owning slug and the nearest §5 AC.
   - At the same time, dispatch [`explorer`](../../agents/explorer.md) — `subagent_type: "sdd:explorer"` (fallback `Explore` / inline per [`../_shared/agent-roster.md`](../_shared/agent-roster.md)). It finds the code path. In the dispatch prompt, tell the subagent to write its report in ASD-STE100.

   There are three outcomes (decision table → [`./references/triage.md`](./references/triage.md)):
   - **(a) Regression** — an AC describes the expected behavior, and the code violates it. The spec is correct. Only the code changes.
   - **(b) Spec-bug** — the AC exists, but a reasonable implementer can read it and make the observed behavior. The wording is the root cause. Patch the AC (with the user, step 5).
   - **(c) Gap** — no AC covers the behavior. Add a new AC to §5, marked `<!-- added-by-fix: <date> -->`.
   - **No-spec mode** — there is no `docs/features/`, or no spec can own the symptom. Skip the spec patch. Say this in the record. Recommend `survey`.
3. **RED — pin the bug with a failing test.** Write the **minimal** test that reproduces the bug. Use the level that the behavior implies: unit for a rule, integration for the behavior of a dependency, e2e for a flow.
   - Run the test. Classify the first run per [`../implement/references/tdd-loop.md`](../implement/references/tdd-loop.md).
   - The run must be a **GOOD red**: it fails on the assertion that encodes the *expected* behavior.
   - Quote the failing line.
   - If no test can pin the bug, STOP and say so. A fix that you cannot verify is a guess.
4. **GREEN + GATE — minimal fix.** Make the RED test pass with the smallest change.
   - Do **no drive-by refactors**. Put each problem that the fix shows into the follow-ups of the record.
   - Then run the same per-task gate that `implement` runs: unit + lint + vet (+ integration when available). Use the detected commands (detection cascade → [`../implement/references/command-detection.md`](../implement/references/command-detection.md)).
   - If the gate is red, fix it. Never commit around it.
5. **Spec patch + fix record.** Apply the branch from step 2:
   - (a) There is nothing to patch. Verify the AC again.
   - (b) Patch the AC wording.
   - (c) Add the new AC with the marker.

   **Confirm each spec change with the user** in one `AskUserQuestion` (show the wording before and after). Then write `docs/features/<slug>/_fixes/<date>-<short-slug>.md` from [`./templates/fix-record.md`](./templates/fix-record.md): symptom → root cause → the pinning test → the spec patch (or why there is no patch).
6. **Commit + handoff.**
   - Propose the commit `fix: <slug> <short summary>` with the trailers `SDD-Fix: <date>-<short-slug>` and `SDD-AC: <id>` (when you traced an AC).
   - Write the commit message in English that follows ASD-STE100. Keep the trailer format verbatim.
   - Then **emit the stage-handoff block** per [`../_shared/handoff.md`](../_shared/handoff.md) (utility variant — `/clear` optional): *What I did* + *Review* (the diff, `_fixes/<date>-<short-slug>.md`, the spec patch if any) + *Run next*.
   - In *Run next*, tell the user to continue the previous work.
   - **If the fix touched >5 files or went across a module boundary, recommend `/sdd:review <slug>`.** This is a recommendation, not a gate.

## Definition of Done

- A test reproduces the bug. The test **failed before the fix and passes after it**. The GOOD red is proven, and the failing line is quoted.
- The gate is clean: unit + lint + vet (+ integration where available).
- The triage outcome is explicit (regression / spec-bug / gap / no-spec). The matching spec patch is applied, or the record tells why there is no patch.
- `docs/features/<slug>/_fixes/<date>-<short-slug>.md` exists: symptom, root cause, the test, the spec patch, follow-ups.
- The commit has the `SDD-Fix:` trailer (+ `SDD-AC:` when traced). The user confirmed each spec change.
- The RED-pin (failing test first) + the per-task GATE are the **structural self-check** of this skill ([`../_shared/self-check.md`](../_shared/self-check.md)). Report its result in the handoff.

## Anti-patterns

- **A fix without a pinning test.** «It works now» without RED proof is a guess. The bug can silently break again. This skill exists to stop this failure mode.
- **A code patch when the spec was the bug.** If the AC permitted the behavior, the wording is the root cause. If you do not patch it, the next implementation can legally bring back the bug.
- **Silent spec edits.** Confirm each AC patch/addition with the user. The spec is a contract, not a scratchpad.
- **Drive-by refactoring.** The fix commit is minimal. Put the refactors that the fix shows into the follow-ups of the record, not into the same diff.
- **No gate because the change is «one line».** A one-line fix can also break a suite.
- **A hard refusal on a repo without specs.** A brownfield bug is the front door of this skill. Change to no-spec mode and recommend `survey`. Never block.
- **A parallel test when `_fixes/` shows an earlier fix of the same symptom.** This is a recurrence. Read the old record and **make its test stronger** instead.

## References & template

- [`./references/triage.md`](./references/triage.md) — the symptom→spec trace: the grep strategy, the regression / spec-bug / gap decision table, the `added-by-fix` marker, no-spec mode, the recurrence check.
- [`./templates/fix-record.md`](./templates/fix-record.md) — the fix-record scaffold (symptom → root cause → pinning test → spec patch → follow-ups).
- [`../implement/references/tdd-loop.md`](../implement/references/tdd-loop.md) — RED classification (GOOD red / BAD red / false-pass). Step 3 uses these semantics.
- [`../implement/references/command-detection.md`](../implement/references/command-detection.md) — how the skill finds the step-4 gate commands (settings override → Makefile → package scripts → language manifests).
- [`../_shared/ask-style.md`](../_shared/ask-style.md) · [`../_shared/agent-roster.md`](../_shared/agent-roster.md) · [`../_shared/handoff.md`](../_shared/handoff.md).

## Example invocation

> **User:** «/sdd:fix — discounts are applied twice when the user clicks pay twice fast»
> **Skill:** Intake confirms: expected one discount for each order, got two on a double-click (all users, since the checkout-discounts release). Trace: `docs/features/checkout-discounts/spec.md` AC-04 says «a discount is applied to an order at most once» → the code violates it → **regression**. `explorer` finds the apply-discount handler (no idempotency check). RED: an integration test sends the same apply two times and asserts one discount row. It fails with `got 2, want 1` (GOOD red). GREEN: add a guard on the existing uniqueness key; the gate is clean. Spec: nothing to patch (AC-04 was correct). Record `_fixes/2026-06-12-double-discount.md`; commit `fix: checkout-discounts double-applied discount` + `SDD-Fix:` / `SDD-AC: AC-04` trailers. Handoff: 2 files touched → no review recommendation; continue the previous work.
