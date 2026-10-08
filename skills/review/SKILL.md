---
name: review
model: opus
effort: high
agents: [reviewer]
description: >
  Use to do an independent, clean-context code review of an implemented feature against its
  spec and acceptance criteria before you ship it. Triggers on "review {slug}", "code review the
  changes for {slug}", "review the diff for {slug}", "is {slug} ready to ship", "/sdd:review {slug}",
  "review changes for {slug}", "code review of feature {slug}", "review the diff". Dispatches the reviewer
  subagent over the full feature diff (stage 1 spec/AC compliance, stage 2 quality). Collects
  cited findings and resolves each finding with you. Hard-refuses if the feature is not implemented.
---

# Skill: review

This skill is the independent review gate. After `implement` writes, tests and commits the code, `review` examines the **full change at one time, with a clean context**. It answers two questions: does the change satisfy each acceptance criterion, and is the code good?

This gate is different from the per-task gate in `implement`. The per-task gate shows that each task is green. `review` is the cross-cutting, clean-context pass that a human reviewer does on the PR.

This skill uses the shared clean-context discipline ([`../_shared/critic.md`](../_shared/critic.md)) and the read-only [`reviewer`](../../agents/reviewer.md) subagent. For the question text, use [`../_shared/ask-style.md`](../_shared/ask-style.md).

The prose of the review record follows `artifact_language`. Give the language in the dispatch prompt of the reviewer. The verdict literals `PASS` / `CHANGES REQUESTED` / `REVIEW_CLEAN` and the cited identifiers stay English → [`../_shared/artifact-language.md`](../_shared/artifact-language.md).

English prose (artifacts, questions, reports, handoff) follows ASD-STE100 Simplified Technical English → [`../_shared/ste100.md`](../_shared/ste100.md).

## Owner

The Tech Lead, or a reviewer who did **not** write the code. Independence is the purpose of this gate.

## Inputs

- `<slug>` — the feature slug.
- **Gate (hard refuse):** an implemented change must exist. This is commits on the feature branch, or a working diff that is not empty. If there is nothing to review, say «run `implement <slug>` first».
- Read the review baseline. This is the **full AC chain**, so that you can examine the trace from end to end:
  - `docs/features/<slug>/spec.md` §5. This is the full AC set and the source of truth, not the trailers of the diff.
  - `sad.md` §6. These are the sequence flows and branches where each AC must occur.
  - `data-model.md` / `contracts/openapi.yaml` / Accepted `adr/`. These are the contracts that the code must obey.
  - `test-plan.md`, if it is a separate file. This is the AC→test map.
  - `tasks.json`. This shows which AC each task claimed.

## Protocol

1. **Find the scope of the diff.** Find the change under review: `git diff <base>..HEAD` on the feature branch (base = the branch point), or the named changed files. Record the `SDD-AC` trailers. These are the ACs that the implementation claims to satisfy.
2. **Dispatch the independent reviewer.** Run the [`reviewer`](../../agents/reviewer.md) agent with `subagent_type: "sdd:reviewer"`.
   - The reviewer is read-only and has a **clean context**. It reads the spec and the contracts again itself. Do not give it a paraphrase.
   - Use the **model from `judgment_model`. On L/XL, use effort `xhigh`** through `CLAUDE_CODE_EFFORT_LEVEL`, as [`../_shared/agent-roster.md`](../_shared/agent-roster.md) specifies.
   - In the dispatch prompt, tell the reviewer to write its report in ASD-STE100 → [`../_shared/ste100.md`](../_shared/ste100.md).
   - The reviewer examines the diff along the dimensions in [`./references/review-dimensions.md`](./references/review-dimensions.md):
     - **Stage 1:** each claimed AC is really satisfied. **Also, trace the full §4 user-story set and the full §5 AC set from end to end (spec → sequences §6 → data-model → api → tasks → implement).** Each §4 user story has ≥1 AC and a §6 flow. Each §5 AC gets to code+test. **The trace includes each surface that `sad.md` `target_surfaces` declares.** A UI AC traces to a component / e2e-through-UI test, not only to a backend test. **Flag each user story or AC that dropped out at a point in the chain, not only the ACs that the diff claims through its `SDD-AC` trailers.**
     - **Stage 2:** conventions, error/edge handling, security, boundary violations, test adequacy.
   - If the diff is large, dispatch one reviewer for each dimension and merge the results.
3. **Collect cited findings.** Each finding cites `file:line` and the AC or contract that it touches. Remove uncited findings (as the critic discipline specifies). A clean review returns `REVIEW_CLEAN`. If the reviewer ran asynchronously and sent only an idle or completion signal with no report, **get the full report through the messaging channel of the host**. Never accept a verdict without its text (→ [`../_shared/agent-roster.md`](../_shared/agent-roster.md), shared-contract point 2).
4. **Resolve each finding with the user** through `AskUserQuestion`. The options are:
   - **Fix now.** Give the actionable finding back to `implement` or to the author as a follow-up task. Enter the TDD loop again for it.
   - **Defer.** Record it in spec §8 Open questions with an owner and a due date.
   - **Not an issue.** The reviewer read it incorrectly. Record the reason.

   Never ship a stage-1 (AC) finding that is not resolved.
5. **Write the review record.** Write `docs/features/<slug>/_review/review-<date>.md`. It contains the scope (diff stat), the findings with their verdicts, and the gate result (`PASS` / `CHANGES REQUESTED`).
6. **Give the verdict and the next step.** Then **emit the stage-handoff block** as [`../_shared/handoff.md`](../_shared/handoff.md) specifies. It contains *What I did*, *Review* (`_review/review-<date>.md`) and *Run next*:
   - `PASS` → (`/clear`, then `/sdd:ship <slug>`).
   - `CHANGES REQUESTED` → `/sdd:implement <slug>` for the fixes. Do **not use `/clear`**. Stay in the context to iterate. Then review the changed surface again.

## Definition of Done

- The independent reviewer examined the full feature diff (not only each task).
- Each claimed AC was examined for real satisfaction. **The full §4 user-story set and the full §5 AC set were traced from end to end (spec → sequences → data-model → api → tasks → implement).** Each §4 US has ≥1 AC and a §6 flow. Each §5 AC gets to code+test. Each item that dropped out at a point in the chain was flagged, not only the ACs that the diff claims. Each in-scope user story / AC is covered, or is explicitly deferred with an owner and a due date.
- Each finding is resolved (fixed / deferred / dismissed with a reason). No open stage-1 finding stays.
- A review record exists with a `PASS` / `CHANGES REQUESTED` verdict.
- The clean-context reviewer pass is the **structural self-check** of this skill ([`../_shared/self-check.md`](../_shared/self-check.md)), because the full skill is a verifier. The verdict is its report.

## Anti-patterns

- **You review your own code in the same context that wrote it.** The reviewer must have a clean context and, if possible, must not be the author. This finds the blind spots.
- **Uncited findings.** «This feels off» is not actionable. Cite `file:line` and the AC or contract, or remove the finding.
- **You ship with an open AC finding.** A stage-1 gap means that the feature does not do what the spec says. Fix it, or explicitly remove it from the scope (a spec change). Never let it pass without a fix.
- **You examine `added-by-fix` ACs less carefully.** An AC that came into §5 through a bug is proof that the spec missed that case one time before. Trace it as strictly as the other ACs, or more strictly. The pinning test of the fix is its minimum, not proof of full coverage.
- **You trust the `SDD-AC` trailers of the diff as the full AC set.** The trailers show only what the diff *claims*. Review traces the **full** §5 set from end to end. An AC that never got to the diff (no task wrote it, no test asserts it) is the most dangerous gap, because the trailers cannot show it.
- **You argue again about a style that the repo already decided.** Judge against the conventions and the contracts, not against personal preference.
- **You use the per-task gate as the review.** Green tests prove each task. They do not prove that the change is coherent, or that the ACs are really satisfied from end to end.

## References & template

- [`./references/review-dimensions.md`](./references/review-dimensions.md) — the review dimensions and the shape of the reviewer dispatch.
- [`../_shared/critic.md`](../_shared/critic.md) — the clean-context dispatch discipline that this skill uses.
