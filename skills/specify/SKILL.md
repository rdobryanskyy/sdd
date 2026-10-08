---
name: specify
model: opus
effort: high
agents: [critic, researcher, strategist, analyst, devils-advocate]
description: >
  Use to change a raw feature idea into a reviewed spec.md. The skill joins a short Socratic
  interview (capture the idea, examine the problem) with a full product spec (context,
  goals, user stories, acceptance criteria, NFRs, KPIs). Triggers on "specify {slug}",
  "spec for {slug}", "write the spec", "capture this idea", "draft requirements for {slug}",
  "/sdd:specify {slug}", "write a specification for {slug}", "describe the requirements", "record the idea".
  It starts with the interview-depth dial (easy/medium/hard). It drafts from templates/spec.md,
  validates each acceptance criterion Socratically, runs a clean-context critic, and then writes
  docs/features/{slug}/spec.md. The ideation analyses (competitive research, strategic approaches,
  multi-perspective review, devil's-advocate) run as named subagents. The depth dial controls
  them: easy skips them, hard runs the full suite.
---

# Skill: specify

This skill changes a one-line idea into a reviewed `spec.md`. The steps are:

1. A short interview captures the idea and tests it.
2. The skill drafts a product spec (context → goals → user stories → acceptance criteria → NFRs → KPIs).
3. The skill validates the draft Socratically.
4. A clean-context critic examines the draft before the skill writes it.

The user types less and reviews more. This file is the main structure. The details are in `references/`.

The Socratic machine, the critic and the size matrix are **shared**. This skill keeps only its deltas:
→ [`../_shared/socratic-loop.md`](../_shared/socratic-loop.md) · [`../_shared/critic.md`](../_shared/critic.md) · [`../_shared/size-matrix.md`](../_shared/size-matrix.md) · [`../_shared/ask-style.md`](../_shared/ask-style.md)

The depth sets the number of questions, the autonomy, and the ideation analyses that run → [`../_shared/interview-depth.md`](../_shared/interview-depth.md).

The prose of the document follows the `artifact_language` setting of the project. Section headings, frontmatter and machine tokens stay in English → [`../_shared/artifact-language.md`](../_shared/artifact-language.md).

English prose (artifacts, questions, reports, handoff) follows ASD-STE100 Simplified Technical English → [`../_shared/ste100.md`](../_shared/ste100.md).

## Owner

PM + Tech Lead (co-authors). The PM controls goals, non-goals and KPIs. The Tech Lead controls the context patterns and the acceptance-criteria coverage.

## Inputs

- `<slug>` — the kebab-case feature slug.
- (Optional) `CONTEXT.md` — the two-level glossary → [`../glossary/SKILL.md`](../glossary/SKILL.md).
  - Read **both** files: the repo-root file (project-wide) and `docs/features/<slug>/CONTEXT.md` (feature-scoped).
  - If the two files conflict, the per-feature file wins.
  - If the glossary is present, its roles and terms are canonical. They override all text that contradicts them.
- `docs/features/<slug>/.size` — the depth hint (MVP vs Full, per the size matrix).
  - If the file is present, read it.
  - If the file is absent, step 1 classifies the feature and writes the file. Thus, downstream stages do not silently use M as the default.
  - `classify-size` classifies the feature again when the scope changes.
- (Optional) prior notes, a reference module or a ticket that the user already has.

## Protocol

1. **Read the context and set the interview depth.**
   - **Glossary.** If a `CONTEXT.md` exists, read **both** files (repo-root and `docs/features/<slug>/`). If they conflict, the per-feature file wins. Load its `## Glossary` as session state (canonical roles and terms).
   - **Size.** If `.size` exists, read it to set the depth of the spec. **If `.size` is absent, set it now.** Run the **`classify-size` protocol inline**. The canon is [`../classify-size/SKILL.md`](../classify-size/SKILL.md) plus the mapping in [`../_shared/size-matrix.md`](../_shared/size-matrix.md).
     - Put the four signals into one bundled `AskUserQuestion`. At `easy` depth, use the matrix default and record it in the assumptions ledger.
     - Write `docs/features/<slug>/.size` **+ `.route`**. The route default comes from the size: XS/S→`quick`, M→`standard`, L/XL→`full`.
     - Confirm the route in the **same** bundled question, per the Routes table in [`../_shared/size-matrix.md`](../_shared/size-matrix.md).
     - Thus, each later stage reads a real size and does not silently use M. Without this step, the gap shows only at `plan-tests`.
     - `classify-size` stays the utility that classifies the feature again when the scope changes.
   - **Architecture map.** If `docs/architecture-map.md` exists (from `survey`), read it. Then the spec is **architecture-aware**. The map gives data to §1 Context, §2 Constraints and §3 Non-goals (what the current system does or cannot do).
     - If the map is absent, recommend that the user runs `survey` first. Then continue. The spec is product-level, and you can capture it without the map.
     - **Do not put the technology of the map into §5 AC.** The AC stay business-observable. The map changes the constraints, not the acceptance criteria.
   - **Interview depth (the first question).**
     - **If `.claude/sdd.local.md` is absent, create it automatically** with the documented default frontmatter. Explain each key and its permitted values inline. Patch `.gitignore` → [`../implement/references/settings.md`](../implement/references/settings.md).
     - Read `interview_depth` from the file. If there is no value, use medium.
     - If the run did not get a `--depth=easy|medium|hard` argument, ask ONE depth-selection `AskUserQuestion`. Phrase it per [`../_shared/ask-style.md`](../_shared/ask-style.md). Put the saved value (or medium) as the first option, with «(Recommended)». The user can override it for each run.
     - The selected level controls the volume of the step-2 deep-dive, the step-3 ideation suite and the step-7 Socratic volume → [`../_shared/interview-depth.md`](../_shared/interview-depth.md).
     - The depth does not change completeness. The 5-type AC floor of §5 applies at each depth.
2. **Capture the idea (interview front).**
   - Use one `AskUserQuestion` to get the raw idea in 1–3 sentences. Keep it verbatim as the baseline.
   - Then do a Socratic deep-dive on problem clarity, success criteria, constraints and strategic fit. Ask the questions in batches of 2–3.
   - The depth dial sets the volume:
     - easy: ask only the few questions that you cannot infer. Then give a stated-assumptions ledger.
     - medium: ask 3–5 questions.
     - hard: examine each angle and show each trade-off first.
   - Phrase each question per [`../_shared/ask-style.md`](../_shared/ask-style.md).
3. **Ideation suite (named subagents, controlled by the depth).** The **interview-depth dial** controls the ideation analyses. The size is a secondary trimmer → [`./references/ideation.md`](./references/ideation.md).
   - **easy** → skip the suite. Do only the deep-dive. Record the selected approach as a ledger assumption.
   - **medium** → `researcher` (`sdd:researcher`, competitive/web) + `devils-advocate` (`sdd:devils-advocate`, failure-mode mode).
   - **hard** → the full suite: `researcher` + `strategist` (`sdd:strategist`, 3 approaches) + `analyst` (`sdd:analyst`, multi-perspective) + `devils-advocate`. Then do the RICE/feasibility confirm that Claude proposes.
   - The analyses stay **product-level**. Do not use technology names, because these belong to `design`.
   - The confirmed recommendation becomes §1 ¶3.
   - Dispatch with `subagent_type: "sdd:<name>"` per [`../_shared/agent-roster.md`](../_shared/agent-roster.md). The fallback is `general-purpose`.
   - In each dispatch prompt, tell the subagent to write its report in ASD-STE100 → [`../_shared/ste100.md`](../_shared/ste100.md).
   - `researcher` must have web access. If the web is not available, accept its `RESEARCH_LIMITED` output and record it as a known gap.
4. **Reconcile the glossary during the flow (a hard rule, at each depth).**
   - When a new or unknown domain term comes up in the interview or the draft, invoke `glossary <slug>` for it **immediately**.
   - Compare the term with `CONTEXT.md`. Add or update the definition before you continue.
   - Thus, when the skill writes the spec, each §4 role and each §5 domain term is already canonical in the glossary. The glossary is never a deferred batch.
   - Plan-mode note: decide add or update for each term during the flow. If writes are blocked until the spec write-point, keep the reconciled terms and write them together with the spec. Never skip the compare for each term.
5. **Ask which more channels to read** (multi-select `AskUserQuestion`). The options are: reference module code / project docs / MCP-Atlassian (Confluence/Jira) / knowledge-base / none. For each selected channel, ask for the **specific** path or query. Do not do silent broad scans.
6. **Read the template and draft §1–§8.**
   - Read [`./templates/spec.md`](./templates/spec.md). Its `<!-- instruction -->` comments are the contract for each section.
   - Draft per [`./references/draft-generation.md`](./references/draft-generation.md). This file gives the sources for each section, the **5 AC coverage types** (happy / error / authorization / domain invariant / cross-context), and the **stack-agnostic forbidden-token** rule for acceptance criteria.
7. **Socratic validation.**
   - Examine §4 US → §5 AC → §6 NFR → §7 KPI with the shared 4-state machine.
   - The depth dial sets the volume of questions for each decision. At easy, the decisions that you do not ask go into the assumptions ledger for a batch veto.
   - The specify delta → [`./references/socratic.md`](./references/socratic.md). AC has a 5th option «Add another AC».
   - After drops and OQ-migrations, the §5 coverage gate applies **two floors**:
     - (a) ≥1 AC of each of the 5 coverage types.
     - (b) **≥1 AC for each retained §4 user story.**
   - If a type *or* a user story has no AC, generate a replacement or add one.
   - **The two floors are not dials. They apply at each depth.** Only the volume of questions changes.
   - Floor (b) closes the §4→§5 link. Thus, a user story that lost its only AC cannot break the downstream `sequences` use-case coverage and the `review` trace.
   - Keep the edits-log.
8. **Critic, write and commit.**
   - Dispatch the [`critic`](../../agents/critic.md) agent with `subagent_type: "sdd:critic"`. It has `model: opus` + `effort: high` and a clean, isolated context per [`../_shared/agent-roster.md`](../_shared/agent-roster.md).
   - Use the specify delta in [`./references/critic.md`](./references/critic.md) (over [`../_shared/critic.md`](../_shared/critic.md)). Put the draft and the edits-log inline. The critic reads `CONTEXT.md` and the idea source itself.
   - In the dispatch prompt, tell the critic to write its report in ASD-STE100 → [`../_shared/ste100.md`](../_shared/ste100.md).
   - Resolve the findings with `AskUserQuestion`: Accept revert / Accept amendment / Override-with-rationale → a §1 ¶4 bullet.
   - Run the forbidden-token regex scan as the F6 backstop.
   - If the checks pass, write `docs/features/<slug>/spec.md`. The glossary is already reconciled during the flow (step 4). Propose the commit `spec: <slug>`.
   - **Register the feature on the roadmap.** Add or promote this feature to **Now** in `docs/roadmap.md` (with `roadmap`). Give an outcome one-liner, a link to this feature folder and the status. If the feature was a Next candidate, move it up. If there is no roadmap, skip this step, because the roadmap is optional.
   - Then **emit the stage-handoff block** per [`../_shared/handoff.md`](../_shared/handoff.md): *What I did* + *Review* (`spec.md`, `.size`, `.route`) + *Run next*.
   - **Resolve the next stage per `.route`** (the Routes table in [`../_shared/size-matrix.md`](../_shared/size-matrix.md); the route-resolved variant is in handoff.md):
     - The forward stage is `/sdd:clarify <slug>`.
     - The N/A condition of `clarify` is **zero §8 open questions and no AC flagged as ambiguous**. The skip target is `/sdd:design <slug>`.
     - On `quick`: skip automatically, give the reason, and show the inverted `↳ or`.
     - On `standard`: offer the `↳ or`.
     - On `full`: do not show a skip line.
   - If `critic` is not available, use a `general-purpose` Agent with the same delta as the fallback.

## Definition of Done

- The skill wrote `docs/features/<slug>/spec.md`. All sections have content (or `<!-- N/A: reason -->`).
- `docs/features/<slug>/.size` **and `.route`** exist after this stage. The skill read them if they were present, or classified and wrote them here. Thus, the backbone does not get to `design`…`plan-tests` with a silent M default, and each handoff resolves per a real route.
- After drops and OQ-migrations, §5 holds ≥1 AC of each of the 5 coverage types.
- **Each §4 user story has ≥1 AC.** This is the use-case floor: no retained US has zero ACs.
- §5 has **0 forbidden tokens** (HTTP verbs / URL paths / status-code numerics / `module.error_name` strings / JSON fragments / SQL constructs).
- The §4 roles are exactly the same as in the `CONTEXT.md` glossary (no invented `user`/`admin`).
- Each §8 Open Question has an owner + a due date (no lone «TBD»).
- The skill kept the edits-log. The critic ran on the post-Socratic draft. Each finding is resolved or overridden.
- The step-8 critic and the forbidden-token regex backstop are the **structural self-check** of this skill ([`../_shared/self-check.md`](../_shared/self-check.md)). The handoff gives the result.

## Anti-patterns

- **Do not skip the interview front.** Do not build the idea from a guess of the model. Capture and deep-dive must really send `AskUserQuestion`.
- **Do not name concrete technologies in §1–§3** (a specific datastore, broker, framework or library). The spec is WHAT + WHY. Technology decisions belong to `design`.
- **Do not put implementation detail in AC**, for example HTTP, status, error-code or SQL detail. That mapping is in `api` and `decide-adr`.
- **Do not run the full ideation suite at `easy` depth.** It produces too much. The depth dial controls the suite: easy skips it, medium runs research + devil's-advocate, hard runs all. The feature size only *trims the volume* in a level. The size is not the gate.
- **Do not invent competitors or RICE numbers** to fill the ideation pass. `N/A — internal tool` is better than false research. Accept the `RESEARCH_LIMITED` output of the `researcher` agent, not invented rows.

## References & template

- [`./references/ideation.md`](./references/ideation.md) — the ideation orchestration, controlled by the depth. It tells which named subagent (`researcher` / `strategist` / `analyst` / `devils-advocate`) runs at which level, what each one returns, and how the outputs go into the spec.
- [`../_shared/interview-depth.md`](../_shared/interview-depth.md) — the easy/medium/hard dial that step 1 sets (volume of questions, autonomy, the analyses that run).
- [`./references/draft-generation.md`](./references/draft-generation.md) — the sources for each section, the 5 AC coverage types, the stack-agnostic forbidden tokens.
- [`./references/socratic.md`](./references/socratic.md) — the delta of specify over the shared Socratic loop.
- [`./references/critic.md`](./references/critic.md) — the delta of specify over the shared critic (F6 = forbidden tokens).
- [`./templates/spec.md`](./templates/spec.md) — the output scaffold. Its inline comments are the generation contract for each section.
