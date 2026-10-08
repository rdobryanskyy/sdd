---
name: decide-adr
model: opus
effort: high
agents: []
description: >
  Use to record a post-hoc or asynchronous architecture decision as a MADR ADR when the
  synchronous design pass did NOT record it. Examples: a choice made in code, in a chat,
  on a whiteboard, or one that a tasks/review gate flagged as missing. Triggers on "ADR for
  {decision}", "adr for {slug}", "document the decision on {topic}", "lock in the decision
  about {X}", "MADR for {topic}", "/sdd:decide-adr {slug} {title}", "create an ADR for the decision",
  "document the decision", "ADR for {topic}". Uses the blast-radius gate to confirm that the
  decision needs an ADR. Gets the next 4-digit number, copies the MADR template of design, and
  fills context / drivers / considered options / outcome / honest consequences. Supports a
  Proposed → Accepted review flow. Output: docs/features/{slug}/adr/NNNN-{title}.md.
  For decisions made live with the user, use `design`. It spawns ADRs inline (Accepted).
---

# Skill: decide-adr

This skill is the **post-hoc / asynchronous ADR path** (pipeline stage 8a). It records a decision that the `design` pass *missed*.

- `design` spawns ADRs synchronously, as `Accepted`, while you go through it Socratically.
- `decide-adr` records a decision that is already in code, agreed in a chat or drawn on a whiteboard. It also records a contract that a `tasks`/review gate flagged because it has no ADR.
- It can also run a `Proposed → Accepted` review flow when a reviewer must still approve the decision.
- One file contains one decision. The skill uses the MADR template of design again. Thus, there is **no second ADR format here**.

This skill is a recording utility, not a Socratic design stage. It does **not** run the shared Socratic loop or the critic. It has two shared dependencies, the question phrasing and the worthiness gate:
→ [`../_shared/ask-style.md`](../_shared/ask-style.md) · [`../design/references/blast-radius.md`](../design/references/blast-radius.md)

The ADR prose (context / drivers / consequences) follows `artifact_language`. The MADR headings and the `Status:` values (`Proposed` / `Accepted` / …) stay English → [`../_shared/artifact-language.md`](../_shared/artifact-language.md).

English prose (artifacts, questions, reports, handoff) follows ASD-STE100 Simplified Technical English → [`../_shared/ste100.md`](../_shared/ste100.md).

## Owner

The decision author (usually the Architect or the Tech Lead). A reviewer (the Tech Lead, and Security when applicable) approves the `Proposed → Accepted` transition.

## Inputs

- `<slug>` — the feature slug, the same as in all earlier stages.
- `<title>` — kebab-case. It describes the **decision**, not the problem (`time-sortable-ids`, not `id-strategy`).
- The decision and its alternatives. Get them from `sad.md` §4 Solution strategy / §9 ADR index / §11 Risks, or from the user.
- **Input gate (soft).** The skill expects `docs/features/<slug>/` to exist, ideally with `sad.md`. decide-adr reads its §4/§9/§11 for context and drivers.
  - A decision can be really standalone, with no feature folder yet. In that case, permit it. Do not refuse.
  - Then **write in the Context section of the ADR that the design context is missing**, and warn the user.

## Protocol

1. **Find the feature.** Run `test -d docs/features/<slug>`.
   - If the folder is missing, ask whether to continue standalone (`AskUserQuestion`, phrasing from [`../_shared/ask-style.md`](../_shared/ask-style.md)).
   - If the answer is «yes», create `docs/features/<slug>/adr/` and flag that the design context is absent.
   - If `sad.md` exists, read its §4 (strategy), §9 (existing ADR index) and §11 (risks).
   - If `sad.md` is absent, record this and get the context from the user.
2. **Worthiness check.** Score the decision against the **blast-radius gate** → [`../design/references/blast-radius.md`](../design/references/blast-radius.md). The criteria are: irreversible / multi-module / has legitimate alternatives.
   - If 2 of 3 criteria are true, continue.
   - If the score is below this level, tell the user that the decision is probably inline material for `sad.md`, not an ADR. Get a confirmation before you write an ADR.
3. **Dedup.** Run `ls docs/features/<slug>/adr/*.md 2>/dev/null`. If an Accepted ADR on the same topic exists, do not make a duplicate. Propose one of these two options:
   - Edit the existing ADR.
   - Write a new ADR that marks the old one `Superseded by NNNN`. Also update the `status` and `updated_at` of the old ADR.
4. **Get the number.** `NNNN` = (the count of existing `adr/*.md`) + 1, with zeros to 4 digits (`0001`, `0002`, …). Never use a number again.
5. **Copy the template.** Copy [`../design/templates/adr.md`](../design/templates/adr.md) → `docs/features/<slug>/adr/NNNN-<title>.md`.
   - This is the canonical MADR shape. `design` owns it, and this skill refers to it. Do not make a variant.
   - Patch the frontmatter: `owner`, `updated_at: <today>`, `feature_size` (from `.size` if it exists), `ticket`.
6. **Context.** Write 2–4 sentences. Tell what caused this decision (an NFR, an incident, a constraint). If `sad.md` is absent, write an explicit note: there is no design document, so the context comes from the author.
7. **Decision drivers.** Write bullets for the quality goals and constraints that caused the choice. Each driver must come from a real source: a spec §6 NFR, sad.md §2 Constraints or a §1 top-3 quality goal. Do not invent drivers. Real drivers stop personal-preference decisions.
8. **Considered options.** List **all** serious options (≥2). One option is a declaration, not a decision. Write one line for each option, with its trade-off. Do not add a strawman (an option that an existing constraint already rules out).
9. **Decision outcome.** Write «Chosen: <option>» and 1–2 sentences about why it won. Refer to the drivers above.
10. **Consequences.** Write Positive **and** Negative **and** Neutral consequences.
    - Include the negative consequences. Without them, the ADR is a justification, not a record.
    - Name what changes in the codebase, ops, monitoring and onboarding.
    - Use `<!-- TBD -->` only where a number really needs a spike.
11. **Status.** Use `Proposed` while a reviewer must still approve. Use `Accepted` when the decision is final.
    - If a review is necessary, run the review flow: write `Proposed` and fill `reviewers`. After the approval, change the status to `Accepted` and update `updated_at`.
    - A reader six months later must be able to know a live plan from a settled fact.
12. **Close the loop.** Add a row to the `sad.md` §9 ADR index. If the ADR scopes a specific task, also add a link from `tasks/_epic.md`. The `## Links` of the ADR must point up to the spec and the applicable `sad.md` §N. There must be no orphans.
13. **Structural self-check** — from [`../_shared/self-check.md`](../_shared/self-check.md). Read the written ADR from disk again and examine **6 items**:
    1. `NNNN` = the count of earlier `adr/*.md` + 1, and it is unique in the folder.
    2. There are ≥2 options under Considered options.
    3. Consequences has at least one **Negative**.
    4. `status` ∈ {Proposed, Accepted}.
    5. A row for this ADR exists in `sad.md` §9 (when `sad.md` exists).
    6. `## Links` is not empty.

    Fix and examine again, for ≤2 cycles. Report all items that are not solved.
14. **Propose commit + handoff.** Propose the commit `adr: <slug> NNNN <title>`. Then **emit the stage-handoff block** as [`../_shared/handoff.md`](../_shared/handoff.md) tells (utility variant):
    - *What I did*, with «self-check: 6/6 pass».
    - *Review*: `adr/NNNN-<title>.md`.
    - *Run next*: go back to the gate that needed the ADR (`/sdd:tasks <slug>` or `/sdd:plan-tests <slug>`). `/clear` is optional.

## Definition of Done

- `docs/features/<slug>/adr/NNNN-<title>.md` exists in the MADR format of design (frontmatter + Context + Decision drivers + Considered options + Decision outcome + Consequences + Links).
- `NNNN` is correct (existing count + 1, 4 digits). The title is in **decision-form** (`0007-time-sortable-ids.md` ✓ vs `0007-id-strategy.md` ✗).
- `status` is explicit: `Accepted` (final) or `Proposed` (reviewer pending, `reviewers` filled).
- There are ≥2 considered options and no strawman. Consequences contain real Negatives, not only Positives.
- The links go in two directions: a row in `sad.md` §9 (when `sad.md` exists), and the `## Links` of the ADR point up to the spec and sad §N. A really standalone ADR writes that the design context is missing.
- Dedup ran. An earlier decision on the same topic is `Superseded by NNNN`. It is never duplicated with no notice.

## Anti-patterns

- **This skill for a live decision.** A choice that you make *now* with the user belongs in `design` (spawned inline, `Accepted`). `decide-adr` is for decisions that the design pass missed.
- **ADR without options.** «We chose X» with no alternatives is a declaration. List ≥2 serious options, with no strawman.
- **ADR as a changelog.** «Tried it, didn't work» is a news feed, not a decision record.
- **ADR as a spec.** Acceptance criteria and NFRs are not part of an ADR. An ADR contains trade-offs and reasons. That detail is in `spec.md` / `data-model` / `api`.
- **No status.** A reader six months later cannot know a current plan from an old decision.
- **Problem-form title** (`0007-id-strategy.md`). In the §9 index, it is not clear which decision exists. Use the decision (`0007-time-sortable-ids.md`).
- **Only positive consequences.** An honest ADR also names its Negatives and Neutrals.
- **A new template.** Use [`../design/templates/adr.md`](../design/templates/adr.md) again. A second ADR format splits the document type.
- **Orphan ADR.** The ADR is written, but it is not in §9 and has no `## Links` up to spec/sad. Six months later, nobody can find it.

## References & template

- [`../design/templates/adr.md`](../design/templates/adr.md) — the canonical MADR scaffold that this skill copies and fills. `design` owns it. **Do not** duplicate it here.
- [`../design/references/blast-radius.md`](../design/references/blast-radius.md) — the 3-criteria worthiness gate (irreversible / multi-module / legitimate alternatives). `design` runs the same gate. This skill uses it to confirm that the decision needs an ADR.
- [`../_shared/ask-style.md`](../_shared/ask-style.md) — the phrasing for these questions: the standalone confirmation, the borderline worthiness and the Superseded question.

## Example invocation

> **User:** «ADR for time-sortable-ids on checkout-discounts — `tasks` flagged a missing ADR for the id-generation choice»
> **Skill:** `docs/features/checkout-discounts/` exists with `sad.md` → reads §4/§9/§11. Blast-radius: the id strategy is irreversible (a later change needs a backfill across each row) and multi-module (other modules read the ids) → 2 of 3, continue. `ls adr/` → `0001`, `0002` exist → `NNNN = 0003`. Title `0003-time-sortable-ids.md` (decision-form). Copies `../design/templates/adr.md`. Context: the §11 risk on hot-row contention caused an explicit id choice. Drivers: spec §6 NFR (predictable ordering) and the existing capability in the stack. Options: (a) time-sortable ids generated in the app; (b) database auto-increment; (c) random ids. Outcome: «Chosen: (a)» — it keeps the natural order without a central sequence; (b) couples to one writer, (c) loses the order. Consequences: + ordered without coordination; − ids are a little larger than auto-increment ids; neutral: a later change needs a backfill. Status `Accepted`. Adds a §9 row and fills `## Links`. Commit `adr: checkout-discounts 0003 time-sortable-ids`.
