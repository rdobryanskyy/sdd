---
name: clarify
model: opus
effort: high
agents: [devils-advocate]
description: >
  Use to do an ambiguity sweep over a written spec.md. The sweep closes each under-specified
  point before planning or design starts. Thus, two engineers cannot build
  different things from the same spec. Triggers on "clarify {slug}", "find ambiguities in
  {slug}", "is the spec ready", "sharpen the spec", "/sdd:clarify {slug}",
  "clarify the specification", "find ambiguities in {slug}", "is the specification ready".
  It reads the spec again and dispatches a clean-context devil's-advocate subagent to list where the
  spec forks. For each ambiguity, it runs AskUserQuestion to RESOLVE it (tighten §1/§5/§6
  in place) or DEFER it (→ §8 Open questions with owner+due). Output: an updated
  docs/features/{slug}/spec.md. Each ambiguity is resolved or deferred, and none stays open.
  Hard-refuse if spec.md is missing.
---

# Skill: clarify

This skill does an ambiguity sweep over a written `spec.md`. It looks for under-specified points in the spec:

- vague terms,
- unmeasured NFRs,
- AC with no error, authz or edge behavior,
- unstated assumptions,
- conflicting requirements,
- undefined domain terms,
- missing actors,
- scope creep.

Then it dispatches a **clean-context devil's-advocate subagent**. This subagent reads the spec with fresh eyes and answers one question: *where can two engineers build different things from this spec?* The skill closes each ambiguity with the user in one of two ways:

- **resolved** — the skill tightens the spec in place.
- **deferred** — the skill adds a §8 Open-Questions row with owner + due.

The skill makes sure that `glossary` and `design` never start on an ambiguous spec.

This skill is a sweep, not a full authoring stage. It does **not** run the shared Socratic loop or the coherence critic. Its shared dependencies are:
→ [`../_shared/critic.md`](../_shared/critic.md) (only the clean-context **dispatch discipline**; the subagent here looks for AMBIGUITY, not coherence drift) · [`../_shared/ask-style.md`](../_shared/ask-style.md) (the phrasing of the resolve/defer question).

The depth sets how hard the sweep looks for ambiguities and the volume of questions for each finding → [`../_shared/interview-depth.md`](../_shared/interview-depth.md). At each level, each ambiguity that the sweep finds is still Resolved or Deferred. This is a floor, not a dial.

The spec tightenings follow `artifact_language`. But the **language of the current spec wins** over the setting. Never translate the spec again during the sweep. Headings and machine tokens stay in English → [`../_shared/artifact-language.md`](../_shared/artifact-language.md).

English prose (artifacts, questions, reports, handoff) follows ASD-STE100 Simplified Technical English → [`../_shared/ste100.md`](../_shared/ste100.md).

## Owner

PM + Tech Lead. The co-authors of the spec resolve their own ambiguities. The PM decides on vague-term, scope and missing-actor findings. The Tech Lead decides on unmeasured-NFR, under-specified-AC and conflicting-requirement findings.

## Inputs

- `<slug>` — the same feature slug that `specify` uses.
- **Gate (hard-refuse if missing):** `docs/features/<slug>/spec.md`. If it is absent, STOP and give this pointer: «run `specify <slug>` first — clarify sharpens an existing spec, it does not write one».
- (Optional) `CONTEXT.md` — two levels → [`../glossary/SKILL.md`](../glossary/SKILL.md).
  - Read **both** files: the repo-root file (project-wide) and `docs/features/<slug>/CONTEXT.md` (feature-scoped; it wins on conflict).
  - If the glossary is present, its `## Glossary` is canonical.
  - If a word is already in the glossary at one of the two levels, an "undefined-term" finding for it is a false positive. Drop it.
- **Fast lane (XS/S):** this applies when `specify` produced zero §8 open questions and flagged no ambiguous AC. Then **the handoff of `specify`** offers to skip this stage (→ the fast lane in [`../_shared/size-matrix.md`](../_shared/size-matrix.md)). The user accepts the skip there. clarify itself never skips automatically.

## Protocol

1. **Gate and set the interview depth.**
   - Run `test -f docs/features/<slug>/spec.md`. If the file is missing, refuse with the pointer above.
   - Read the spec. If they are present, also read the `## Glossary` from the root `CONTEXT.md` and from `docs/features/<slug>/CONTEXT.md`. The per-feature glossary wins. This stops false "undefined-term" hits.
   - **Then set the interview depth (the first question).** Read `interview_depth` from `.claude/sdd.local.md` if the file is present. If not, use medium.
   - If the run did not get a `--depth=easy|medium|hard` argument, ask ONE depth-selection `AskUserQuestion`. Phrase it per [`../_shared/ask-style.md`](../_shared/ask-style.md). Put the saved value (or medium) as the first option, with «(Recommended)».
   - The level sets how adversarial the sweep and the subagent are, and the volume of questions for each finding → [`../_shared/interview-depth.md`](../_shared/interview-depth.md):
     - easy: only build divergence that changes behavior, with stated assumptions.
     - medium: balanced.
     - hard: adversarial; show each fork.
2. **First-pass self-sweep.**
   - Examine the spec against the eight ambiguity classes in [`./references/ambiguity-checks.md`](./references/ambiguity-checks.md): vague-term / unmeasured-NFR / under-specified-AC / unstated-assumption / conflicting-requirement / undefined-term / missing-actor / scope-creep.
   - Record the candidate findings, each with a `§ref`. Do not edit yet.
3. **Devil's-advocate subagent (the core mechanic).**
   - Dispatch the [`devils-advocate`](../../agents/devils-advocate.md) agent with `subagent_type: "sdd:devils-advocate"`. It has its own `model: opus` + `effort: high`. Its context is clean, because it never saw this conversation.
   - Give it only the slug and the spec path. Do not put content inline. It reads `spec.md` (and `CONTEXT.md`) itself.
   - In the dispatch prompt, tell the subagent to write its report in ASD-STE100 → [`../_shared/ste100.md`](../_shared/ste100.md).
   - It returns "two engineers would diverge here" findings.
   - The dispatch follows the contract in [`../_shared/agent-roster.md`](../_shared/agent-roster.md): clean, isolated context, cited findings, and `NO_AMBIGUITIES` if there are no findings.
   - If `devils-advocate` is not available at runtime, use a `general-purpose` Agent with the prompt body in [`./references/ambiguity-checks.md`](./references/ambiguity-checks.md) as the fallback.
4. **Merge and dedupe.**
   - Join the self-sweep findings (step 2) with the subagent findings (step 3).
   - Collapse duplicates (same `§ref` + same class).
   - Put the highest-impact findings first: conflicting-requirement > under-specified-AC > unmeasured-NFR > undefined-term > missing-actor > scope-creep > vague-term > unstated-assumption.
   - If the merged set is empty, report «spec is unambiguous». Do not stamp the spec. Recommend `glossary`/`design`.
5. **Resolve or defer each finding.**
   - For each finding, ask one `AskUserQuestion`, phrased per [`../_shared/ask-style.md`](../_shared/ask-style.md). Offer these options:
     - **Resolve now** — the user selects or dictates the tightening.
     - **Defer to §8** — an Open-Questions row. Get the owner and the due date in a follow-up question. If one of the two is missing, the finding stays unresolved. Ask again one time.
     - **Not an ambiguity** — a false positive, for example a term that is already in CONTEXT. Drop it.
   - Each finding ends as Resolved or Deferred. None stays open.
   - **The depth changes the volume of questions, not the floor.**
     - At `easy`, the skill resolves the clear, low-stakes findings itself with sensible tightenings. It lists them in a stated-assumptions ledger for a batch veto. It asks only about the behavioral or high-stakes forks.
     - At `hard`, the skill asks about each finding.
   - The «zero dangling» rule applies at each level.
6. **Write the resolutions back.**
   - Apply each Resolve edit in the native section of the spec:
     - Tighten the §5 AC into business-observable form.
     - Replace a §6 adjective with a numeric target + measurement.
     - Correct a §1 term.
     - Add a missing §4 actor/US.
     - Cut a §3 scope-creep line.
   - Add each Defer as a §8 checkbox row: `- [ ] <question>? Default now: <X>. — owner: <name/role>, due: <date or stage>`.
   - Keep a short edits-log, with one line for each finding: `class · §ref · resolved|deferred · before→after`.
   - **Undefined-term findings reconcile the glossary during the flow (a hard rule, at each depth).**
     - When the user resolves an `undefined-term` finding, immediately invoke `glossary <slug>` for that term.
     - Compare the term with `CONTEXT.md`. Add or update the definition **now**, not as a deferred note.
     - clarify never resolves a term with an invented meaning inline. The canonical definition goes into `CONTEXT.md`. Thus, `design` and the downstream stages read one source.
7. **Stamp and commit.**
   - Set `updated_at: <today>` in the frontmatter.
   - When you tighten the spec, obey the invariants of `specify` again:
     - The §5 AC contain no HTTP, status, error-code or SQL tokens.
     - The §6 numbers have a measurement.
     - The §4 roles come only from the glossary.
   - Propose `clarify: <slug> — N resolved, M deferred`.
   - Then **emit the stage-handoff block** per [`../_shared/handoff.md`](../_shared/handoff.md):
     - *What I did* — include the terms that the in-flow `glossary` calls of step 6 already reconciled into `CONTEXT.md`. Thus, the user learns here that the glossary changed, not later.
     - *Review* — the tightened `spec.md`, + `CONTEXT.md` when the skill added terms.
     - *Run next*.
   - **Resolve the next stage per `.route`** (Routes in [`../_shared/size-matrix.md`](../_shared/size-matrix.md)):
     - The forward stage is `/sdd:glossary <slug>` ↳ or `/sdd:design <slug>` to skip the glossary step.
     - On `quick`: the terms are already reconciled during the flow. Thus, resolve automatically to `/sdd:design <slug>`, unless terms without a glossary entry stay.
     - On `full`: keep the two options. Do not resolve automatically.

## Definition of Done

- Each ambiguity from the self-sweep and the subagent is **Resolved** or **Deferred**. Zero ambiguities stay open.
  - Resolved: the spec is tightened in its native section.
  - Deferred: a §8 row with an owner AND a due date.
- The Resolve edits keep the contracts of `specify`:
  - The §5 AC contain no HTTP, status, error-code or SQL tokens.
  - The §6 NFR rows have a numeric target + measurement (no adjectives).
  - The §4 roles agree with the CONTEXT glossary.
- The devil's-advocate subagent really ran (clean context, it read the spec itself). It was not skipped, and the main thread did not paraphrase it.
- `updated_at` shows today. The skill kept the edits-log and proposed the commit.
- The devil's-advocate sweep and the zero-dangling resolution rule are the **structural self-check** of this skill ([`../_shared/self-check.md`](../_shared/self-check.md)). The handoff gives the result.

## Anti-patterns

- **Do not skip the subagent** and sweep only in the thread. The clean-context fork-finder is the core mechanic. The conversation that wrote the spec also shapes the self-sweep, so the self-sweep does not see its own blind spots.
- **Do not resolve an ambiguity alone** (without `AskUserQuestion`). clarify proposes and the author decides. This is the same user-in-the-loop contract as in each SDD stage.
- **Do not defer without owner+due.** A §8 row without one of the two is not a real defer. Ask again one time. If there is no answer, the finding stays unresolved.
- **Do not run the coherence critic again here.** The F1–F6 cross-section drift check belongs to `specify`/`design`. The subagent of clarify looks for *ambiguity* (build divergence). This is a different target.
- **Do not put implementation detail into a Resolve edit**, for example a status code, an endpoint or an SQL detail in a §5 AC. Stay business-observable. The technical mapping is in `api` / `data-model`.
- **Do not invent answers to close findings.** If a point is really open, defer it with an owner. Do not guess it. An honest §8 row is better than an invented AC.
- **Do not author new scope.** clarify sharpens what the spec already says. A completely new requirement goes back through `specify`. Do not add it as a "clarification".

## References & template

- [`./references/ambiguity-checks.md`](./references/ambiguity-checks.md) — the eight ambiguity classes (how to find and how to resolve each one) + the prompt body of the clean-context devil's-advocate subagent.
- [`../_shared/ask-style.md`](../_shared/ask-style.md) — the phrasing of the resolve/defer/false-positive question.
- [`../_shared/critic.md`](../_shared/critic.md) — the clean-context dispatch discipline that step 3 uses again (it reads upstream files itself, gives cited findings, and returns a `NO_*` sentinel when empty).
- [`../_shared/interview-depth.md`](../_shared/interview-depth.md) — the easy/medium/hard dial that step 1 sets (how hard the sweep looks + the volume of questions for each finding).
