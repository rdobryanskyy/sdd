---
name: design
model: opus
effort: high
agents: [explorer, critic]
description: >
  Use to write a Software Architecture Document for a feature after spec.md exists. The SAD has
  the Arc42 12 sections, C4 L1/L2 inline, and ADRs that a blast-radius gate starts. Triggers on
  "design {slug}", "architecture for {slug}", "SAD for {slug}", "arc42 for {slug}",
  "C4 context+container for {slug}", "/sdd:design {slug}", "design the architecture for {slug}",
  "SAD for {slug}", "architecture document for {slug}". Drafts §1–§12 in memory and validates
  each section Socratically as a batch (4-state machine). Writes an ADR only when a decision
  crosses the blast-radius threshold (irreversible / multi-module / has legitimate alternatives).
  Writes each resolved section and its ADRs atomically. Then runs a clean-context critic before
  it finalizes. Brownfield: dispatches an Explore subagent to map the repo first. Hard-refuse if
  spec.md is missing. CONTEXT.md is optional (if it exists, its Glossary is canonical).
---

# Skill: design

This skill makes the **Software Architecture Document** (`docs/features/<slug>/sad.md`) and its supporting ADRs (`docs/features/<slug>/adr/NNNN-*.md`). The SAD has the Arc42 12 sections, with C4 Context inline in §3 and C4 Container inline in §5. The skill does these steps:

- It drafts all 12 sections in memory.
- It walks the sections Socratically, one section at a time.
- It writes an ADR only when the *blast radius* of a decision crosses the gate. The blast radius is how difficult it is to reverse the decision later.
- It writes each resolved section and its ADRs as one atomic commit. On route `quick` + depth `easy`, each section goes to the disk immediately, but the commits batch (step 6).
- It runs a clean-context critic on the finished SAD.

The document itself is the state, so a resume after an interrupt costs nothing. L3 Component and L4 Code are out of scope. This file is the spine. The details are in `references/`.

The Socratic machine, the critic, and the size matrix are **shared**. This skill keeps only its deltas:
→ [`../_shared/socratic-loop.md`](../_shared/socratic-loop.md) · [`../_shared/critic.md`](../_shared/critic.md) · [`../_shared/size-matrix.md`](../_shared/size-matrix.md) · [`../_shared/ask-style.md`](../_shared/ask-style.md)

The prose of `sad.md` and of the ADRs follows `artifact_language`. The Arc42 section headings, the frontmatter, the C4/Mermaid keywords and the ADR `Status` values stay English → [`../_shared/artifact-language.md`](../_shared/artifact-language.md).

English prose (artifacts, questions, reports, handoff) follows ASD-STE100 Simplified Technical English → [`../_shared/ste100.md`](../_shared/ste100.md).

Depth controls the question volume for each section and the autonomy → [`../_shared/interview-depth.md`](../_shared/interview-depth.md). Confirm C4 diagrams in prose, never as raw source → [`../_shared/diagram-presentation.md`](../_shared/diagram-presentation.md). design also selects the **target surface(s)** of the feature. This is the first §4 decision. design writes it to the `sad.md` frontmatter `target_surfaces`. Each downstream stage reads this value and never derives it again → [`../_shared/surfaces.md`](../_shared/surfaces.md).

## Owner

Architect / Tech Lead (controls all steps). Ask the PM only about §10 Quality goals and §11 Risk severities.

## Inputs

- `<slug>` — the same feature slug that each earlier stage used.
- **Gate (hard-refuse if missing):** `docs/features/<slug>/spec.md`. If it is absent, STOP and give this pointer: «run `specify <slug>` first — design reads the spec's goals/NFRs as canonical».
- (Optional) `CONTEXT.md` — at the repo root and/or in `docs/features/<slug>/` → [`../glossary/SKILL.md`](../glossary/SKILL.md).
  - If it exists, its `## Glossary` is canonical for roles and domain terms. If the two files conflict, the per-feature file wins over the root file.
  - If it is absent, the §4 roles of the spec are canonical. The handoff then recommends `/sdd:glossary <slug>` before the terms drift.
- (Optional) `docs/features/<slug>/.size` — the depth hint (MVP vs Full, and the expected ADR count from the size matrix). If it is absent, use M (full set) as the default. **Say this clearly in the handoff**: «size M (default — no `.size`; run `/sdd:classify-size <slug>`)».
- A git repo, so that the Step-3 Explore subagent can read code on a brownfield.
- If `sad.md` already has all 12 sections filled AND `adr/` has ≥1 file, skip this skill and suggest review.

## Protocol

1. **Gate + size + set interview depth.**
   - Run `test -f docs/features/<slug>/spec.md`. If the file is missing, refuse with the pointer above.
   - If `.size` exists, read it. It sets the ADR count and the §6 flow count (see the size matrix). If `.route` exists, read it.
   - **Then set the interview depth (the opening question).** If `.claude/sdd.local.md` exists, read `interview_depth` from it. Else, use medium as the default.
   - If no `--depth=easy|medium|hard` arg was given, ask ONE depth-selection `AskUserQuestion`. Write it per [`../_shared/ask-style.md`](../_shared/ask-style.md). Put the saved value (or medium) as the «(Recommended)» first option.
   - **Exception: on route `quick`, `easy` is the «(Recommended)» first option.** This is the quick-route softening from the Routes table in [`../_shared/size-matrix.md`](../_shared/size-matrix.md).
   - The level controls the step-6 question volume for each section and the C4 diagram confirmation → [`../_shared/interview-depth.md`](../_shared/interview-depth.md):
     - easy: decide the convention defaults yourself and record them in the ledger. Ask only about blast-radius decisions.
     - medium: walk each real decision.
     - hard: walk each decision and show each trade-off clearly.
   - The blast-radius → ADR gate and the §11 owner+due rule are floors. Apply them at each depth.
2. **Read upstream.**
   - Read `spec.md`: §2 Goals, §3 Non-goals, §6 NFR with numeric targets + measurement, §6.1 Security/privacy + abuse cases, §7 KPIs, §8 Open questions, and all §1 ¶4 «Decision override» bullets.
   - If `CONTEXT.md` `## Glossary` exists, read **both** files: the repo-root file (project-wide) and `docs/features/<slug>/CONTEXT.md` (feature-scoped). If they conflict, the per-feature file wins. The canonical roles and domain terms win over all text that contradicts them.
   - If neither file exists, the §4 roles of the spec are canonical. Recommend `/sdd:glossary <slug>` in the handoff.
3. **Current architecture — read the map, do not scan again.**
   - Use `docs/architecture-map.md` (from `survey`) first. If it exists and is fresh (its `reflects_commit` ≈ the current HEAD), read it. That map IS the brownfield context: module layout, layering, datastores, conventions, and the C4 of the current system.
   - Scan again only if the map is **absent or stale**. Then dispatch the [`explorer`](../../agents/explorer.md) agent — `subagent_type: "sdd:explorer"` (`model: haiku` + `effort: low`, clean-isolated per [`../_shared/agent-roster.md`](../_shared/agent-roster.md)).
   - Ask the explorer for «module layout, layering/ports conventions, datastores, inter-module comms, anything that constrains `<slug>`». Tell the explorer to write its report in ASD-STE100 ([`../_shared/ste100.md`](../_shared/ste100.md)).
   - Suggest that the user runs `survey` to keep the map.
   - On a greenfield (no source + no map), write the note `<!-- brownfield: N/A — greenfield repo -->` in §3.
   - If `explorer` is not available, use a `subagent_type: "Explore"` Agent as the fallback.
4. **Bootstrap + read template.**
   - Copy [`./templates/sad.md`](./templates/sad.md) → `docs/features/<slug>/sad.md`.
   - Patch the frontmatter: `updated_at`, and `feature_size` from `.size`. Leave `target_surfaces: []` empty. Step 6 fills it when the §4 Target-surface decision resolves.
   - Commit `design: <slug> bootstrap sad.md`.
   - Read the `<!-- … -->` comments of the template (the contract for each section) and [`./templates/adr.md`](./templates/adr.md) (MADR shape).
   - This is the only file write between Step 4 and Step 6. Step 5 drafts in memory.
5. **Per-section draft (in memory).**
   - For each section §1 → §12, draft the proposed content and the decisions in it.
   - Put trivial convention defaults together into one question.
   - The sources for each section, the item-banks, the question budget, and the pre-Socratic hygiene → [`./references/draft-generation.md`](./references/draft-generation.md).
   - Do NOT write `sad.md` in this step.
6. **Socratic walk + blast-radius gate, per-section write.** For each section §1 → §12:
   - Show the full section and its numbered decisions (the big picture).
   - Walk one `AskUserQuestion` for each decision with the shared 4-state machine. The question volume for each section changes with the depth dial. At easy, decide the convention defaults yourself and put them in the assumptions ledger. Ask only about blast-radius decisions.
   - Apply the transitions in memory.
   - Run the blast-radius gate on each **Approved** decision. If a decision gets 2-of-3, write an ADR.
   - Write the resolved section and its new ADRs. Then commit `design: <slug> sad §N — <summary>`.
   - Never go back to a written section.
   - **Commit cadence:**
     - The default is one commit for each section (medium/hard, any route).
     - On **route `quick` + depth `easy`**, write each section to the disk immediately after it resolves. Write-after-resolve and never-return stay in effect, so an interrupt loses nothing.
     - On that route, commits **batch — at most 3 for the pass** (for example §1–§5, §6–§12, finalization). If the pass ran without an interrupt, use a single `design: <slug> sad (quick)` commit. 14 doc commits on an S-feature only add noise. They do not add safety.
   - **The first §4 decision is the Target-surface selection** — *what the team builds*:
     - The values are `backend-service` / `web-frontend` / `mobile-app` / `desktop-app` / `cli` / `worker` / `library-sdk`.
     - Derive the value from spec §1 «for whom» and the §4 roles. The spec itself names no surface.
     - The blast-radius gate applies. Multi-surface is multi-module + irreversible ⇒ usually an ADR.
     - When it resolves, **write `target_surfaces: [...]` to the `sad.md` frontmatter**. This value gives one §5 C4 container for each surface. `api` / `sequences` / `tasks` / `plan-tests` / `review` read it and never derive it again.
   - For each declared **UI surface**, walk the next **UI-architecture decision**: web → SSR/SPA/hybrid; mobile → native/cross-platform; + state/routing if necessary. The ADR gate applies as for each §4 strategic choice → [`../_shared/surfaces.md`](../_shared/surfaces.md).
   - **For the §3 C4Context and §5 C4Container sections, confirm the diagram per [`../_shared/diagram-presentation.md`](../_shared/diagram-presentation.md):**
     - Write the block into `sad.md` and validate it.
     - Then **describe the context / containers in prose**: who talks to what, and which systems it depends on. Confirm by prose.
     - **Never paste the raw C4 source as the question.**
     - At `easy`, write the block, give a one-line summary, and continue (no question for each diagram).
   - The design delta → [`./references/socratic.md`](./references/socratic.md) (section list, decision-types, the gate). Gate scores → [`./references/blast-radius.md`](./references/blast-radius.md). C4 syntax for §3/§5 → [`./references/c4-mermaid-syntax.md`](./references/c4-mermaid-syntax.md). Question shapes for design → [`./references/ask-examples.md`](./references/ask-examples.md).
   - Keep the edits-log and an adjacent ADR-spawns log.
7. **Critic + finalize.**
   - Dispatch the [`critic`](../../agents/critic.md) agent — `subagent_type: "sdd:critic"`. It has `model: opus` + `effort: high` and is clean-isolated per [`../_shared/agent-roster.md`](../_shared/agent-roster.md). **Set the model per `judgment_model`. Set effort `xhigh` on L/XL** via `CLAUDE_CODE_EFFORT_LEVEL`. If it is not available, use `general-purpose` as the fallback.
   - Give the critic the design delta in [`./references/critic.md`](./references/critic.md) (on top of [`../_shared/critic.md`](../_shared/critic.md)). Give it the final `sad.md`, the edits-log and the ADR-spawns log. Tell the critic to write its report in ASD-STE100 ([`../_shared/ste100.md`](../_shared/ste100.md)).
   - Resolve each finding with `AskUserQuestion` (Accept revert / Accept amendment / Override-with-rationale → §1 ¶4 bullet).
   - Run the pre-write backstop scans:
     - **Validate each Mermaid block in `sad.md` per [`../_shared/mermaid-check.md`](../_shared/mermaid-check.md).** If `mmdc` is available, use it to render-parse. Else, use the structural lint. Fix each block that does not parse. Never commit a broken diagram.
     - Each ADR title is in decision-form kebab-case, and each Status is `Accepted`.
     - §9 is closed against `adr/`.
     - There are no `<placeholder>` stubs.
   - If the scans pass, write all amendments and commit `design: <slug> finalization (critic pass)`.
   - Then **emit the stage-handoff block** per [`../_shared/handoff.md`](../_shared/handoff.md): *What I did* + *Review* (`sad.md`, `adr/`) + *Run next*.
   - **Resolve the next stage per `.route`** (the Routes table in [`../_shared/size-matrix.md`](../_shared/size-matrix.md)):
     - The forward stage is `/sdd:sequences <slug>`, which writes flows into §6.
     - The N/A condition of `sequences` is **one actor and no multi-step runtime flow**. The skip target is `/sdd:data-model <slug>`.
     - On `quick`, skip automatically with the reason and an inverted `↳ or`. On `standard`, offer the `↳ or`. On `full`, write no skip line.
     - When you skip, carry the next condition forward: if there is also no schema change → `/sdd:api <slug>` directly.

## Definition of Done

- `docs/features/<slug>/sad.md` exists, and each of the 12 Arc42 sections is filled OR marked `<!-- N/A: <reason> -->`.
- §3 has a real `C4Context` block and §5 has a real `C4Container` block. They use real names from the glossary/spec + the scan, with no `<placeholder>` stubs and no `Container_Bondary` typos. §6 has ≥1 `sequenceDiagram` (the `sequences` stage then covers each critical flow / §5 AC — no cap).
- The frontmatter `target_surfaces: [...]` is not empty (the Target-surface decision was made in §4). §5 draws **one C4 container for each declared surface**. Each declared UI surface (`web-frontend` / `mobile-app` / `desktop-app`) has a UI-architecture decision: an ADR, or an inline §4 note if it did not cross the gate. → [`../_shared/surfaces.md`](../_shared/surfaces.md).
- The §9 ADR table is closed against `adr/` (each file has a row, each row has a file). There are 2–4 ADRs for XS/S, 5–12 for M, and 10–15 for L/XL. Each ADR Status = `Accepted`. Each title is in decision-form (`0003-sliding-window-counter.md` ✓ vs `0003-rate-limiting.md` ✗). There are no strawman options.
- The §10 scenarios are testable (When / Then / How-verify). They cite the spec §6 NFR numbers verbatim (do not invent or round numbers).
- §11 has a row for each `save_as_oq` decision, with both owner AND due (severity literal `Open question`). §11 is never N/A.
- If a `CONTEXT.md` exists, the §1 Stakeholders and the §3 actors agree exactly with the glossary (the per-feature file wins over the root file). Else, they agree with the §4 roles of the spec (do not invent `user`/`admin`).
- On a brownfield, the Step-3 Explore ran (or §3 has the greenfield note). The edits-log is kept. The critic ran on the post-Socratic SAD. Each finding is resolved or overridden.
- The step-7 critic and the pre-write backstop scans (mermaid-check, ADR-title form, §9 closure, no-placeholder) are the **structural self-check** of this skill ([`../_shared/self-check.md`](../_shared/self-check.md)). Report its result in the handoff.

## Anti-patterns

- **An ADR for each decision** — this destroys the genre. Only blast-radius decisions become ADRs (5–12 for M, not 25). But if you miss an irreversibility, the feature gets too few ADRs.
- **ADR `Status: Proposed` from this skill** — this skill is synchronous (you decide with the user now), so the Status is `Accepted`. For an async Proposed → Accepted flow, use `decide-adr`.
- **ADR title in problem-form** (`0003-rate-limiting.md`) or with a **strawman option** (an alternative that an existing constraint already excludes). Both make the ADR genre weaker and trigger the F6 of the critic.
- **Invented §10 numbers** that the spec never agreed to — cite the spec §6 NFR verbatim. **A concrete stack named in §2** that contradicts the conventions of the repo, without an Override note that points to §11.
- **No Step-3 Explore on a brownfield** — if you guess the layout, you get a fictional §5 Container view and invented §2 Constraints.
- **A return to a written section** — each section commits atomically. Cross-section drift is the work of the critic, not of a second walk. If you open §4 again after you write §10, you do not trust the batch for each section.
- **Save-as-OQ without owner+due** — get both in the follow-up question. If either is missing, change the decision to Drop with a warning. Never write a half-filled §11 row.
- **Critic findings resolved without the user** (without `AskUserQuestion`) or **one large commit at the end of the pass on medium/hard** — both break the contract of one section at a time with the user in the loop. (On route `quick` + depth `easy`, the step-6 batches are permitted: up to 3 commits, or one for a pass without an interrupt. But they never cancel write-after-resolve: each section goes to the disk when it resolves.)
- **C4 L3/L4 content** — this is out of scope. Suggest a separate diagram pass.

## References & template

- [`./references/draft-generation.md`](./references/draft-generation.md) — Step 5: the sources for each section §1–§12, item-banks, the question budget, pre-Socratic hygiene.
- [`./references/socratic.md`](./references/socratic.md) — the design delta on top of the shared Socratic loop (section list, decision-types, the blast-radius gate, the §11 OQ table).
- [`./references/blast-radius.md`](./references/blast-radius.md) — the 3-criteria ADR gate (irreversible / multi-module / legitimate alternatives), scores, target counts.
- [`./references/critic.md`](./references/critic.md) — the design delta on top of the shared critic (F5 floor, F6 = NFR-leak + strawman-ADR + §2-vs-repo, F1 = strategic-vector drift).
- [`./references/c4-mermaid-syntax.md`](./references/c4-mermaid-syntax.md) — C4Context + C4Container Mermaid cheatsheet for §3/§5.
- [`./references/ask-examples.md`](./references/ask-examples.md) — question shapes for design (strategic-with-ADR-spawn, blast-radius gate, Save-as-OQ follow-up).
- [`../_shared/interview-depth.md`](../_shared/interview-depth.md) — the easy/medium/hard dial that step 1 sets (question volume for each section + autonomy).
- [`../_shared/diagram-presentation.md`](../_shared/diagram-presentation.md) — how to confirm the §3/§5 C4 diagrams in prose (write → validate → describe), never as raw source.
- [`../_shared/surfaces.md`](../_shared/surfaces.md) — the target-surface taxonomy (based on C4 containers). design owns the selection (first §4 decision → frontmatter `target_surfaces`). Downstream stages read it.
- [`./templates/sad.md`](./templates/sad.md) · [`./templates/adr.md`](./templates/adr.md) · [`./templates/deployment.md`](./templates/deployment.md) — output scaffolds. The inline comments are the generation contract for each section. (C4 syntax → [`./references/c4-mermaid-syntax.md`](./references/c4-mermaid-syntax.md).)
