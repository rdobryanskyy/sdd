---
name: classify-size
model: haiku
effort: low
agents: []
description: >
  Use to classify a feature into XS/S/M/L/XL. It writes docs/features/{slug}/.size and the
  pipeline route docs/features/{slug}/.route (quick|standard|full). Later skills use them to know
  how much of each artifact to make and how handoffs resolve skips. Triggers on "classify size",
  "feature size", "is this XS or M for {slug}", "size {slug}", "change route", "/sdd:classify-size {slug}",
  "classify the size of {slug}", "what is the feature size", "XS or M". It asks four AskUserQuestion
  (PR count / time / new module-API-migration / breaking changes). It maps the answers to a size
  class through the shared size matrix and derives the default route (XS/S→quick, M→standard,
  L/XL→full). It confirms size + route in ONE question and writes the one-line .size and .route
  files. These files are the source of truth. At each (re)classification, it syncs the
  feature_size: frontmatter mirrors in spec.md and sad.md to them again.
---

# Skill: classify-size

This is an atomic skill. It classifies a feature into XS/S/M/L/XL and records the result in
`docs/features/<slug>/.size`. It also records the pipeline **route** (`quick` / `standard` / `full`)
in `docs/features/<slug>/.route`. This skill is the single source of the size and route behavior
for the remaining pipeline:

- Later skills read `.size` to decide the output depth (MVP vs Full).
- Their handoffs read `.route` to decide how the skip of an optional stage resolves (auto-skip /
  offered / never). See the Routes table in [`../_shared/size-matrix.md`](../_shared/size-matrix.md).

English prose (artifacts, questions, reports, handoff) follows ASD-STE100 Simplified Technical English → [`../_shared/ste100.md`](../_shared/ste100.md).

This skill is the **canonical owner of the size matrix** → [`../_shared/size-matrix.md`](../_shared/size-matrix.md). The classification rules, the MVP-vs-Full table and the one-sentence rule are all in that file. This skill only runs the dialogue and writes the file.

**`specify` calls this skill inline.** If `.size` is absent at the start of the backbone, step 1 of `specify` runs this protocol inline. It uses the same signals and the same file, in one bundled question. This skill stays the standalone utility to classify before the work starts, or to **classify again when the scope changes**. Never copy the protocol into a different file.

## Owner

The PM or the Tech Lead (the driver of the intake phase). If an architect sees a new subsystem, the architect can change S to M.

## Inputs

- `<slug>` — feature slug.
- (Optional) the idea or the intake note, as a rough start hint. The skill also works without it.

## Protocol

1. **Examine the existing files.** Run `test -f docs/features/<slug>/.size` (and the same for `.route`). If `.size` exists, read both values and ask «`.size` is currently `<X>` (route `<Y>`). Reclassify?». If the answer is «no», STOP. Recommend a manual edit. Do not overwrite silently. A new run only to change the route is a legal and usual case. It is a mid-flight override per the Routes table.
2. **Ask the four signals.** Use one `AskUserQuestion` for each signal. Write the questions per [`../_shared/ask-style.md`](../_shared/ask-style.md):
   - **PR count** — `1` / `2–5` / `5–15` / `15+`.
   - **Time to merge the main part** — `≤1 day` / `~1 week` / `1–2 sprints` / `>1 month`.
   - **New module / new API / DB migration** — `none` / `one of three` / `two of three` / `all three`.
   - **Breaking changes for consumers** — `no` / `internal only` / `public clients`.
3. **Map to a class.** Use the table in [`../_shared/size-matrix.md`](../_shared/size-matrix.md). For an edge case, say the dominant signal («M because it adds a new API + 1–2 sprints, even though PR count is on the S/M border»). If all answers are at the maximum, ask explicitly «needs a separate roadmap?». If the answer is yes, the class is XL.
4. **Confirm size + route in ONE question.** Derive the default route from the size (**XS/S → `quick`, M → `standard`, L/XL → `full`**). See the Routes table in [`../_shared/size-matrix.md`](../_shared/size-matrix.md). Then ask one `AskUserQuestion`: «Classifying as `<size>` (<one-line rationale>) → route `<route>` (<one-line what the route does>). Lock both in?». The options are `Yes` / `Yes, but route <other>` / `No, I want size <X>` / `Reclassify`. Never ask a second question only for the route.
5. **Write `.size` + `.route`.** Each file has one line of plain text. `.size` contains only `XS`/`S`/`M`/`L`/`XL`. `.route` contains only `quick`/`standard`/`full`. Do not add comments or frontmatter. The files are `docs/features/<slug>/.size` and `docs/features/<slug>/.route`.
6. **Sync the frontmatter mirrors again (`.size` is the source of truth).** `feature_size:` can be in a maximum of three places: the `.size` file (canonical), and the `spec.md` and `sad.md` frontmatter (mirrors for humans). For each of the two files that exists, do this:
   - If the value is the same, it is OK.
   - If the value is different (a reclassification, or a mirror that a person edited), **change the frontmatter to the new `.size` value** and tell the user. Never keep a stale mirror.
   - If the field is missing, recommend that the user adds `feature_size: <size>`.

   If the user says that a mirror has the correct value, that is a reclassification. Go back to step 4, confirm again, then sync again.
7. **Structural self-check** — per [`../_shared/self-check.md`](../_shared/self-check.md). Read the written files again from disk and make sure of **3 items**:
   1. `.size` contains exactly one of {XS, S, M, L, XL} (one bare word, with no content after it).
   2. `.route` contains exactly one of {quick, standard, full}.
   3. The two frontmatter mirrors (`feature_size:` in `spec.md` and `sad.md`, for the files that exist) agree with `.size`.

   Correct and examine again, 2 cycles or fewer. Show each unresolved item to the user.
8. **Propose the commit and the handoff.** The commit message is `size: <slug> classified as <size> (route <route>)`. (If a wrapper called this skill, put this change into the intake commit.) Then **emit the stage-handoff block** per [`../_shared/handoff.md`](../_shared/handoff.md) (utility variant):
   - *What I did* (with «self-check: 3/3 pass»).
   - *Review* (`.size`, `.route`).
   - *Run next*: go back to your backbone stage (for example `/sdd:specify <slug>`). `/clear` is optional.

## Definition of Done

- `docs/features/<slug>/.size` contains exactly one of XS/S/M/L/XL. `docs/features/<slug>/.route` contains exactly one of quick/standard/full.
- The user confirmed the classification: size AND route in one question (never silent, never two questions).
- If `spec.md` / `sad.md` exist, their `feature_size:` mirrors agree with `.size` (no drift; `.size` is the source of truth).

## Anti-patterns

- **A self-classification without confirmation.** The skill proposes. The user locks it.
- **An optimistic «it's probably S».** Ask the four questions. If you skip the design, the problem will show one week later.
- **No module/API/migration question and no breaking-change question.** These questions separate S from M.
- **An overwrite of an existing `.size` / `.route` without a question.**
- **A `.size` / `.route` file with many lines or comments.** Wrappers grep these files quickly. Keep each file as one bare word.
- **A second question only for the route.** Confirm size + route together. The route option is in the same `AskUserQuestion`.

## Example invocation

> **User:** «classify size rate-limiting-per-user»
> **Skill:** `.size` absent → asks the four questions (`2–5 PR`, `~1 week`, `one of three — new API`, `internal only`) → maps to **S** → default route **quick** → confirms both in one question (rationale: one API endpoint + ~1 week + internal breaking) → writes `docs/features/rate-limiting-per-user/.size` = `S` and `.route` = `quick` → `spec.md` not yet written, skip sync → commit `size: rate-limiting-per-user classified as S (route quick)`.
