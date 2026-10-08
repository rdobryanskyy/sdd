# Fix triage — tracing a symptom to the spec

> The step-2 details for [`../SKILL.md`](../SKILL.md). The spine gives the three outcomes. This file
> gives the mechanics: how to find the owning feature, the decision table, the `added-by-fix`
> marker, no-spec mode, and the recurrence check.

## Finding the owning feature

1. Get the **domain nouns** from the reproduction statement («doing X, expected Y, got Z»). Use
   the entities and actions, not the technical symptoms (`discount`, `apply`, `order`; not
   `duplicate row`, `500`).
2. Grep `docs/features/*/spec.md` for these terms. Rank the candidate slugs by hit count. A hit
   in §4/§5 has more weight than a hit in the §1 prose.
3. If there is one clear winner, continue. In these cases, confirm with **one**
   `AskUserQuestion` that lists the candidates (phrasing per
   [`../../_shared/ask-style.md`](../../_shared/ask-style.md)):
   - There are several possible owners.
   - There are zero hits, but `docs/features/` is not empty.

   Never guess a slug silently.
4. **Recurrence check (before triage):** Grep the `_fixes/*.md` of the candidate slug for the same
   symptom terms. A match shows that this bug (or a related bug) had a fix before. Read that
   record first. The new record links to the old record. Usually, the correct action is to
   **make the old pinning test stronger** (it let the regression through). Do not write a
   parallel test.

## The decision table (ask in order)

| # | Question | Yes → | No → |
|---|---|---|---|
| 1 | Does a §5 AC describe the expected behavior that the reproduction names? | → 2 | **(c) Gap** |
| 2 | Does the observed behavior violate that AC **as written**? | → 3 | Examine the slug/AC again. The bug can belong to a different place, or it is not a bug |
| 3 | Can a reasonable implementer read the AC and still make the observed behavior (ambiguous wording, undefined edge, missing bound)? | **(b) Spec-bug** | **(a) Regression** |

Question 3 is the most important question. It separates two cases:

- «The code drifted from a clear contract» (regression). Fix only the code.
- «The contract permitted the bug» (spec-bug). Also fix the wording. If you do not, the next
  implementation can legally bring back the bug.

## What each branch changes

| Branch | Code | Spec | Record's «Spec patch» section |
|---|---|---|---|
| (a) Regression | RED → GREEN fix | nothing — AC verified again | «none — spec was right; AC-NN re-verified» |
| (b) Spec-bug | RED → GREEN fix (against the **corrected** reading) | AC wording patched; the user sees the wording before → after | the before/after wording |
| (c) Gap | RED → GREEN fix | new AC added at the end of §5, with the marker | the new AC text |
| No-spec | RED → GREEN fix | there is no spec to patch | «no spec to patch — brownfield; survey recommended» |

## The `added-by-fix` marker

Add a gap-branch AC at the end of spec §5 as a normal AC, with a comment next to it:

```md
- AC-09: a discount is applied to an order at most once, regardless of repeated
  apply requests. <!-- added-by-fix: 2026-06-12 -->
```

The marker is **a history record, not a status**. `clarify`, `sequences`, `plan-tests` and
`review` use the AC in the same way as all other ACs. Flows and tests must cover it on the next
pass. The marker only records that the AC came into the spec through a bug, not through
`specify`. This is useful when you examine why the original spec did not have it.

One more point: «the same as all other ACs» is the minimum, not a reduction. An added-by-fix AC
has a **higher risk by its origin**. It is evidence that the spec already did not see this case
one time. Thus the next `review` / `implement` pass verifies it at least as strictly as the
other ACs. The pinning test that found the bug is the minimum baseline, never the full proof.

## No-spec mode (brownfield soft gate)

There are two ways into this mode:

- `docs/features/` does not exist.
- `docs/features/` exists, but no spec can own the symptom (the bug is in pre-SDD code).

In the two cases:

- Run intake → RED → GREEN → gate → record as usual.
- The triage field of the record is `no-spec`, and its «Spec patch» section tells why.
- The handoff recommends `/sdd:survey` (map the codebase, so that future fixes have a spec to
  trace to). This is a recommendation, never a blocker.

Do not hard-refuse here. A hard refusal would stop the first user of this skill: a person with a
bug in a repo that never ran the backbone.
