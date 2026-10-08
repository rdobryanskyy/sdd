---
name: sequences
model: inherit
effort: medium
agents: []
description: >
  Use to add Mermaid sequenceDiagram blocks to the runtime view of the SAD (sad.md §6). Write one
  block for each critical flow. Each block shows how a request moves between participants, with
  the happy path and the error paths.
  Triggers on "sequences for {slug}", "sequence diagram for {slug}", "draw the runtime flow",
  "add a sequence to the SAD", "/sdd:sequences {slug}", "sequence diagrams for {slug}",
  "sequence for {slug}", "draw the flow for {slug}". Reads sad.md §5 for participants. Drafts each
  flow from templates/sequence.md with generic participants. Walks the flows Socratically, one flow
  at a time. Writes the confirmed blocks into sad.md §6. Downstream, the blocks help data-model to
  select indexes. Hard-refuse if sad.md is missing → run `design {slug}` first.
---

# Skill: sequences

This skill draws the **runtime view** of a feature that has a design. For each critical flow, it makes a Mermaid `sequenceDiagram` block. Each block has generic participants, the happy path and the error branches that the spec demands. The skill writes the blocks into `docs/features/<slug>/sad.md §6`. It does one flow at a time, and the user confirms each flow. The diagrams connect the static design (§5 building blocks) to the data layer. Each persist or read step that you draw becomes a hint for the indexes that `data-model` will need.

The diagram labels and the §6 prose follow `artifact_language`. But **the language of the existing `sad.md` wins** over the setting. Mermaid keywords (`sequenceDiagram`, `participant`, `alt/else/end`) stay English. Participant names that name real modules also stay English → [`../_shared/artifact-language.md`](../_shared/artifact-language.md).

English prose (artifacts, questions, reports, handoff) follows ASD-STE100 Simplified Technical English → [`../_shared/ste100.md`](../_shared/ste100.md).

This skill keeps only its own machinery. The question phrasing is **shared** → [`../_shared/ask-style.md`](../_shared/ask-style.md).

- **The spec sets the flow count. There is no cap.** Cover each §4 user story and each §5 acceptance criterion. The size can make the *detail* smaller, but never the *coverage* → [`../_shared/size-matrix.md`](../_shared/size-matrix.md).
- **Confirm each diagram in prose. Never confirm it as raw Mermaid** → [`../_shared/diagram-presentation.md`](../_shared/diagram-presentation.md).
- The interview-depth setting selects how you confirm each flow: one question for each diagram, or write and summarize → [`../_shared/interview-depth.md`](../_shared/interview-depth.md).

## Owner

The Tech Lead (controls the runtime decomposition). The PM confirms that each flow agrees with a real user story. A backend engineer flags the persist steps that need a new index.

## Inputs

- `<slug>` — the same feature slug that each earlier stage used.
- **Gate (hard-refuse if missing):** `docs/features/<slug>/sad.md`. The §5 building-block view names the participants. You write the flows in §6. If `sad.md` is absent → STOP and point: «run `design <slug>` first — sequences are written into its §6».
- (Expected) The `sad.md` frontmatter key `target_surfaces`. It selects the participant vocabulary (UI-driven flows for a UI surface).
  - **If it is absent or empty, warn** («surfaces undeclared — re-run `design`, or proceeding as `backend-service`»). **Then use `[backend-service]`** (→ [`../_shared/surfaces.md`](../_shared/surfaces.md)).
  - Never guess a UI surface silently.
- **Strongly expected:** `docs/features/<slug>/spec.md`.
  - The §4 user stories tell you *which* flows exist.
  - The §5 acceptance criteria are the **coverage floor**. A flow, a branch or an explicit non-runtime N/A must show each AC (the step-7 coverage check).
  - In the normal pipeline, the spec is present at this stage. If it is really absent, get the flow list from §6/§5 of `sad.md`. Then write a note that you cannot make sure of the AC coverage.
- (Optional) `docs/features/<slug>/.size` — a depth hint for the *detail*, never for the *coverage*. XS/S can collapse the internal steps of a flow.
  - If it is absent, use M **and say this clearly in the handoff** — «size M (default — no `.size`; run `/sdd:classify-size <slug>`)».
- (Optional) `.claude/sdd.local.md` `interview_depth` (else medium). It controls only the diagram confirmation: prose and a question for each diagram, or write, summarize and continue.
  - `sequences` does **not** ask its own depth question. It uses the setting, or a `--depth=` argument if the user gives one.

## Protocol

1. **Gate.** Run `test -f docs/features/<slug>/sad.md`. If it fails, refuse with the pointer above. Then read §5 (participants) and §6 (the flows that are already there). This skill only adds. Never write an existing block again.
2. **Select the flows from the spec. There is no cap.**
   - Get the flows from **the §4 user stories and the §5 acceptance criteria** of `spec.md`. If the spec is absent, get them from §6.
   - Write **one flow for each critical user story or each different runtime path**.
   - There is **no fixed cap**. Draw all the flows that the user stories and ACs need. (The old "3–5" cap did not cover all ACs, and it gave no warning.)
   - Then **plan the AC coverage**. Map each §5 AC to the place that shows it:
     - a **dedicated flow**;
     - an **`alt`/`else` branch** in the related flow;
     - **explicitly non-runtime** (for example, a 401 from the middleware, or a check at build time), with a one-line reason.
   - The size collapses only the *detail* (XS/S can show fewer internal steps in each flow), never the *coverage*.
   - Before you draw, confirm the flow list **and the AC→flow map** with one `AskUserQuestion`. Use the phrasing in [`../_shared/ask-style.md`](../_shared/ask-style.md).
3. **Map the participants. Use only generic participants.**
   - For each flow, select the participants from a fixed generic vocabulary: `<client>`, `<ui>`, `<service>`, `<data-store>`, `<external-system>`, `<message-bus>`.
   - Do **not** make up concrete service names or technology names. `design` and `data-model` make these decisions, not the runtime view.
   - **If the `sad.md` frontmatter key `target_surfaces` declares a UI surface** (`web-frontend` / `mobile-app` / `desktop-app`), draw the related flows as **UI-driven**: `<user>` (actor) → `<ui>` → `<service>` → `<data-store>`. This shows the step that the user sees, not only the service call (→ [`../_shared/surfaces.md`](../_shared/surfaces.md)).
   - A backend-only, `cli` or `worker` feature keeps the service-level vocabulary (no `<ui>`).
   - `<ui>` stays generic, as all other participants do. Never use a framework name or a component name.
   - If a flow needs a participant that §5 does not declare, write a note («flow needs `<message-bus>`, not in §5 — flag for design»). Then draw the participant.
4. **Sync or async.**
   - If the spec describes one of these steps, the flow is async:
     - a webhook;
     - a scheduled job;
     - a queued or event-driven step;
     - a callback from a third party.
   - For an async flow, add these items:
     - an idempotency-key check as the first step of the handler;
     - a retry note (`Note over <service>,<external-system>: retry N times with backoff`);
     - a dead-letter branch in an `alt` after N failures.
   - Otherwise, the flow is sync (request → response).
5. **Draft each flow** from [`./templates/sequence.md`](./templates/sequence.md).
   - Write a precondition note, the happy-path messages and a postcondition note.
   - Add an `alt`/`else` for the error branches that the acceptance criteria of the spec need.
   - Mark each write as a generic persist note: `Note over <service>,<data-store>: persists <entity>`. Then `data-model` sees what to index.
   - Start each message with a verb. Do not put HTTP verbs, status numbers or SQL in the messages.
6. **Show and confirm each flow, one at a time. Use prose, never raw Mermaid.** Obey [`../_shared/diagram-presentation.md`](../_shared/diagram-presentation.md). For each flow that you drafted:
   1. **Write the block into §6** under a `### <flow name>` heading. Then Obsidian shows the diagram.
   2. **Make sure that it parses**. Obey [`../_shared/mermaid-check.md`](../_shared/mermaid-check.md).
   3. **Describe it in prose**: the happy path and each `alt`/`else` branch, in plain words.
   - **Never paste the raw `sequenceDiagram` source as the question.**
   - The interview-depth setting controls the confirmation in prose:
     - At **medium/hard**, ask one `AskUserQuestion` for each flow. Use the 4-state actions from [`../_shared/ask-style.md`](../_shared/ask-style.md) (Accept / Fix / Save-as-OQ / Drop).
       - On **Fix**, make that one block again and overwrite it. Then validate it again and describe it again. Do one round only. The second answer is final.
       - On **Drop**, remove the block.
     - At **easy**, write the block and put a one-line summary in prose into the assumptions ledger. Then continue (no question for each flow).
   - Never change a flow that is already in §6.
   - Keep the edits-log. Obey [`../_shared/socratic-loop.md`](../_shared/socratic-loop.md).
7. **Check the use-case and AC → flow coverage (before you finalize).** Do two passes. Show the result as one coverage table.
   - **Use-case pass (§4).** List **each §4 user story** and the flows that show it.
     - Each user story that stays in scope maps to **≥1 flow**.
     - A US with no flow is a gap. Draft and confirm a flow for it. Or, remove it from the scope through `specify`/`clarify`. Never skip it silently.
     - `specify` already makes sure that each §4 US has ≥1 AC, and `clarify` finds a US with no AC. This pass does the same check in the runtime view. Thus both ends are checked, and you do not only assume them.
   - **AC pass (§5).** List **each §5 AC** and the place that shows it now:
     - a **dedicated flow**;
     - an **`alt`/`else` branch**;
     - an **explicit non-runtime N/A**, with its one-line reason (for example, «AC-7: middleware-enforced 401, not a runtime flow»).
   - A `Drop` or a `Save-as-OQ` in step 6 can leave a user story or an AC with no coverage. If this occurs, draft and confirm the missing flow or branch before you continue (the step 5–6 mini-loop). Or, record the explicit N/A with the user.
   - **Each §4 user story and each §5 AC must have coverage. Do not leave a gap silently.** This gate does not change with the depth or the size. It applies also at easy/XS.
8. **Finalize: put in order, validate, propose the commit.**
   1. Put the §6 blocks in the same order as §4.
   2. **Validate each `sequenceDiagram` block again. Obey [`../_shared/mermaid-check.md`](../_shared/mermaid-check.md)** as the last check.
      - Make sure that `alt`/`else`/`end` are balanced and that all participants are declared.
      - If a block does not parse, fix it before the commit.
   3. Add the flagged items (new participants, decisions for an ADR) as a short note at the end of §6. Only flag these items. Never write an ADR automatically.
   4. Propose the commit `sequences: <slug> runtime flows`.
   5. **Emit the stage-handoff block**. Obey [`../_shared/handoff.md`](../_shared/handoff.md). Write *What I did*, *Review* (`sad.md` §6) and *Run next*.
   6. **Find the next stage from `.route`** (the Routes table in [`../_shared/size-matrix.md`](../_shared/size-matrix.md)):
      - The forward stage is `/sdd:data-model <slug>`. It uses the persist notes to select indexes.
      - The N/A condition of `data-model` is **no schema change**: no new entity, column or index in a flow that you drew. The skip target is `/sdd:api <slug>`.
      - On `quick`, skip automatically. Give the reason and the inverted `↳ or`.
      - On `standard`, offer the `↳ or`.
      - On `full`, write no skip line.

## Definition of Done

- `sad.md §6` has a Mermaid `sequenceDiagram` for **each** critical user story or different runtime path. There is **no fixed cap**. The size can collapse the internal detail of a flow, never its coverage.
- **Each §4 user story maps to ≥1 flow. Each §5 AC maps to a flow, an `alt`/`else` branch or an explicit non-runtime N/A.** The step-7 coverage check passed on both passes (use-case and AC). No item is without coverage silently (at each depth and each size).
- Each flow was **confirmed in prose** (medium/hard) or **written and summarized** (easy). The raw `sequenceDiagram` source was never the question.
- Each block uses **only** generic participants (`<client>` / `<ui>` / `<service>` / `<data-store>` / `<external-system>` / `<message-bus>`). It has no concrete technology names or service names. A declared UI surface uses `<ui>` in a UI-driven flow (`<user>` → `<ui>` → `<service>` → `<data-store>`). A backend-only feature does not use it.
- Each flow shows the error branches that its spec acceptance criteria need, not only the happy path. Each step that changes data has a generic persist note for `data-model`.
- Each async flow has an idempotency-key step, a retry note and a dead-letter branch.
- The §6 blocks that were there before are not changed. New participants and decisions for an ADR are flagged, not added silently.
- The step-7 use-case and AC coverage check and the step-8 mermaid validation are the **structural self-check** of this skill ([`../_shared/self-check.md`](../_shared/self-check.md)). The handoff gives its result.

## Anti-patterns

- **Concrete participants.** `Postgres`, `content-api`, a specific broker — this is the old trap. Participants stay generic. `design`/`data-model` name the technology.
- **A cap on the flow count** (the old "3–5") that silently leaves gaps in the coverage. §4/§5 set the flow count. A flow, a branch or an explicit N/A shows each AC. In one dogfood run, the skill drew only 2 flows for a spec with 6 ACs. This skill now forbids this failure.
- **Raw Mermaid as the confirmation.** The user cannot read `sequenceDiagram` source in the terminal, so the user approves without the facts. Confirm in prose. Let Obsidian show the block that you wrote (obey [`../_shared/diagram-presentation.md`](../_shared/diagram-presentation.md)).
- **Only the happy path** when the spec lists explicit error acceptance criteria. Each flow gets the happy path and the error branches that the spec demands.
- **One very large diagram** for the full feature. Write one diagram for each flow. A cross-cutting flow gets its own `### Cross-cutting: <name>` heading.
- **ADRs written automatically.** This skill only flags decisions (idempotency strategy, retry shape, sync or async). ADRs come from `decide-adr` or a person.
- **A change to an existing §6 block.** Only add. A change to a flow that is drawn is a deliberate manual diff.
- **A new participant that §5 does not declare, with no flag.** §5 is the source of truth. The flag lets `design` reconcile it.

## References & template

- [`../_shared/ask-style.md`](../_shared/ask-style.md) — the canonical phrasing of questions and options for steps 2 and 6.
- [`../_shared/diagram-presentation.md`](../_shared/diagram-presentation.md) — how to confirm each flow (write → validate → describe in prose → confirm or continue). Never use raw Mermaid as the question.
- [`../_shared/interview-depth.md`](../_shared/interview-depth.md) — the depth setting. It selects a question for each flow, or write and summarize. The skill reads it from the settings. `sequences` asks no depth question of its own.
- [`../_shared/mermaid-check.md`](../_shared/mermaid-check.md) — the parse validation for each block at step 6, and again as the last check at step 8.
- [`../_shared/size-matrix.md`](../_shared/size-matrix.md) — collapses the *detail* of a flow for XS/S, never its *coverage*. Each AC is still shown.
- [`../_shared/surfaces.md`](../_shared/surfaces.md) — a declared UI surface adds `<ui>` to the vocabulary and gives UI-driven flows. The skill reads it from `sad.md` `target_surfaces`.
- [`./templates/sequence.md`](./templates/sequence.md) — the `sequenceDiagram` scaffold with generic participants (sync and async). Put it inline in sad.md §6.
