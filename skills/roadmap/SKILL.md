---
name: roadmap
model: inherit
effort: medium
agents: []
description: >
  Use to keep the portfolio layer above each feature. This is one living docs/roadmap.md of
  outcomes, in the structure Now / Next / Later, that links to the specs of each feature and does not
  copy them. Triggers on "roadmap", "what's next", "prioritize the roadmap", "add to the roadmap",
  "show the roadmap", "/sdd:roadmap", "roadmap", "what is next", "priorities", "add to the roadmap".
  Records a candidate as an outcome/problem (it goes into Next/Later, with a RICE score). Promotes and
  demotes items between horizons, and renders the board. It stays at outcome altitude. It is NOT a
  feature list or a Gantt with dates. The solution is in the spec of the feature, not here. specify
  promotes an item to Now. ship moves it to Shipped. Thus, delivery keeps the roadmap in sync.
---

# Skill: roadmap

This skill is the **portfolio layer** above the per-feature pipeline. SDD builds one feature at a time under `docs/features/<slug>/`. `roadmap` is the one living view *across* features. It shows:

- what we do now,
- what comes next,
- what is directional for later.

The roadmap stays at **outcome altitude** (the "why", or the problem). Each item links to its feature folder. It does not repeat the spec.

A roadmap is **direction, not a promise**, and it is **not a release plan**. Roadmaps of features with dates are the largest source of waste. They show false certainty. They become stale fastest when they go far into the future. They select solutions before discovery. Thus, this roadmap shows *less certainty over time*, and it never has dates.

This skill is a repo-level utility (like `survey`). One file serves the full repo. For the question text → [`../_shared/ask-style.md`](../_shared/ask-style.md).

The prose of each item follows `artifact_language`. The `## Shipped` heading and the table structure stay English, because the dashboard parses them → [`../_shared/artifact-language.md`](../_shared/artifact-language.md).

English prose (artifacts, questions, reports, handoff) follows ASD-STE100 Simplified Technical English → [`../_shared/ste100.md`](../_shared/ste100.md).

## Owner

The person who owns the product direction (PM / lead / the solo maintainer). This person decides what is Now/Next/Later. The pipeline keeps the statuses in sync.

## Inputs

- (Optional) a candidate to record (an outcome/problem in one line), or an action: prioritize / promote / demote / render.
- `docs/features/*/` — use it to link items to existing feature folders and to read their status.

## Protocol

1. **Lazy-create.** If `docs/roadmap.md` does not exist, copy [`./templates/roadmap.md`](./templates/roadmap.md) there. The template has the non-commitment disclaimer and the Now / Next / Later / Shipped sections. **Render each section as a table**, with one row for each item. Keep one file, in `docs/` at the repo root.
2. **The three horizons — each horizon has a different content type.** This is the most important rule. Do not put features in all horizons.
   - **Now** — committed work. Its `docs/features/<slug>/` spec exists, and the team builds it now. Item = a one-line outcome + a link to the feature folder + a status (designing / implementing / review). Promote an item here only after `specify` (it has a spec and a commitment).
   - **Next** — problems/opportunities that are intentionally **NOT spec'd yet**. Item = a one-line outcome/problem + a RICE score. There is no feature folder yet. This is the prioritized pool of candidates.
   - **Later** — outcomes/themes, directional only. No features, no scores.
3. **Record a candidate.** Add it to **Next** (or Later) as an outcome/problem, with a RICE score. **Never** write a solution or a feature spec here. That is the work of `specify` when the item goes into Now.
4. **Prioritize (RICE).** For each Next candidate, calculate `RICE = (Reach × Impact × Confidence) ÷ Effort`:
   - Impact is 3/2/1/0.5/0.25.
   - Confidence is 100/80/50%.
   - Effort is in person-weeks.

   The result is one number that you can sort. Sort Next by this number, largest first. RICE is a guide, not a gate. The owner can override it. → [`./templates/roadmap.md`](./templates/roadmap.md) shows the columns.
5. **Promote / demote.** Move items between horizons when the certainty changes. Promote Next→Now only when the item will go into `specify` soon (committed). You can demote at any time. Items far in the future stay coarse.
6. **Render / write.** Update `docs/roadmap.md`. Set `updated_at`.
7. **Structural self-check** — as [`../_shared/self-check.md`](../_shared/self-check.md) specifies. Read `docs/roadmap.md` again from disk and make sure of **4 items**:
   1. Each Now/Shipped row links to an **existing** `docs/features/<slug>/` folder (`test -d` for each).
   2. Each Next row has a RICE score, and Next is sorted by it, largest first.
   3. There are **zero dates** outside the shipped-date column of Shipped. Use a regex to find `\b20\d\d-` style dates. The no-dates rule defines this type of document.
   4. `updated_at` = today.

   Fix and check again for a maximum of 2 cycles. Show each item that is not resolved.
8. **Commit + handoff.** Propose the commit `roadmap: <what changed>`. Then **emit the stage-handoff block** as [`../_shared/handoff.md`](../_shared/handoff.md) specifies (utility variant). It contains *What I did* (with «self-check: 4/4 pass»), *Review* (`docs/roadmap.md`) and *Run next*: go back to your backbone stage. `/clear` is optional.

## Sync hooks (delivery keeps it current — anti-drift)

- **`specify`** registers its feature on the roadmap and promotes the item to **Now** (a one-line outcome + a link to the new `docs/features/<slug>/` + a status). If a new feature has no candidate before it, `specify` adds it directly to Now.
- **`ship`** moves the item to **Shipped** (the date + a link to the PR/changelog) and removes it from Now.
- **`fix`** (optional — the decision of the user): a **wide** fix on a shipped feature (>5 files / cross-module)
  can add a note to the **Shipped** row of that feature. The note has the date and a link to the
  `docs/features/<slug>/_fixes/` record. Small fixes do not change the roadmap.

The pipeline stages themselves update the roadmap. Thus, it stays current without separate maintenance. The public roadmap of GitHub uses the same mechanism (ship → mark shipped → close).

## Definition of Done

- `docs/roadmap.md` exists with the disclaimer and Now / Next / Later (+ Shipped). The items are at **outcome altitude**. Each Now/Shipped item **links** to its `docs/features/<slug>/` (no copy of the spec).
- Next is in RICE order. There are no dates. Later has no feature-level detail.
- `updated_at` shows the change.

## Anti-patterns

- **A roadmap of features with dates, or a Gantt.** Items are outcomes/problems. There are no dates. The solution is in the spec. The research names this error as the largest source of waste.
- **You copy the spec** into the roadmap. Link to `docs/features/<slug>/`. The roadmap holds the *why*, not the *how*.
- **Too much detail in Later.** Items far in the future are directional one-line items. Detail for them is fiction that becomes stale.
- **The roadmap as a promise.** Keep the disclaimer. Near-term items are firm. Far-term items will change.
- **You promote to Now before `specify`.** Now = committed + spec'd. Work without a spec stays in Next.
- **You let the roadmap become stale.** The `specify`/`ship` hooks keep it current. Do not replace them with a stale list that you maintain by hand.

## References & template

- [`./templates/roadmap.md`](./templates/roadmap.md) — the scaffold for the living roadmap (disclaimer + Now/Next/Later/Shipped + RICE columns).
- [`../_shared/ask-style.md`](../_shared/ask-style.md) — the text style for capture/prioritize questions.
