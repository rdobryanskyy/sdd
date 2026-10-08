# Clean-context critic — canonical dispatch + F1–F6 skeleton

> **Reference-only.** Not a skill. Some skills run a critic after the Socratic pass (`specify`,
> `design`). These skills read this file for the canonical dispatch and the skeleton of failure
> classes. Each skill keeps only a short **delta**: its artifact name, its upstream files and
> its F6 specialization.

## Why a separate critic

The Socratic loop ([socratic-loop.md](./socratic-loop.md)) examines one section at a time. It never goes back to a section after it writes that section. Thus it **cannot** see drift across sections that later edits cause. It also cannot see structural gaps that the author did not see during self-edits. The critic is a single `Agent` (`subagent_type: "general-purpose"`). It has a **clean context**: it never saw the conversation. It reads the upstream artifacts itself, thus a paraphrase cannot give it wrong data. It examines the draft against the edits-log.

## How a skill dispatches it

1. Read this file.
2. Read the critic delta of the consuming skill (artifact name, upstream paths, F6 specialization).
3. Fill the placeholders (`{{DRAFT}}`, `{{EDITS_LOG}}`, upstream paths). Give the assembled text as the `Agent` prompt.
4. The critic **Reads the upstream files itself**. The skill puts only the draft and the edits-log into the prompt. It never puts the upstream text into the prompt.
5. The prompt tells the critic to write its report in ASD-STE100 → [`ste100.md`](./ste100.md). The skeleton below contains this instruction.
6. **Async hosts:** if the host runs the agent asynchronously (background or teammate mode), add the report-delivery instruction from [`agent-roster.md`](./agent-roster.md) (shared-contract point 2) to the prompt. An idle or completion signal without content is **not** `NO_CONTESTED_DECISIONS`. Get the full report through the messaging channel of the host before you resolve a finding.
7. Resolve each finding with the user through `AskUserQuestion` (Accept revert / Accept amendment / Override-with-rationale). An override writes a documented bullet. Thus downstream skills see the deliberate choice.

## Prompt skeleton (everything below the line is the agent prompt)

---

You are a clean-context critic for a **{{ARTIFACT_NAME}}** draft. You did not see the conversation that made this draft. Your task is to find these problems, which the Socratic validation of each section could not see:

- drift across sections;
- coherence damage from user edits;
- structural gaps;
- constraint leaks and quality leaks.

You do **not** propose new ideas. Your task is coherence, not vision.

Write your report in ASD-STE100 Simplified Technical English. Use approved words, short sentences and the active voice. Keep identifiers, file paths and literal tokens as they are.

### Inputs

**Final post-Socratic draft (just written):**
```
{{DRAFT}}
```

**Edits-log** — each `Edit` / `Drop` / `Save as Open Question` that the user applied, in time sequence. The log intentionally has no `Approve` entries (they are the baseline). For `save_as_oq`, `after` is the Open-Questions row, with owner+due:
```
{{EDITS_LOG}}
```

**Upstream artifacts — you MUST Read these yourself, do not trust paraphrases:**
{{UPSTREAM_FILES}}

### Method

Read the upstream files first. Then examine the draft against the edits-log for each of the six failure classes. Be skeptical. A decision that passed the Socratic pass can still be incoherent with other sections after the edits around it.

### Failure classes (probe each)

- **F1 — Vector / recommendation drift.** The upstream artifact committed to a choice (the chosen approach, the dominant quality goal, the recommended option). A later section of the draft silently contradicts this choice. Cite the upstream commitment and the draft line that contradicts it.
- **F2 — Size-class creep.** An `edit`/`add` resolution added new modules, object types or branches. These push the feature past its declared size class (see size-matrix). Flag it also if the user did not see the size effect.
- **F3 — Defer vs upstream vector.** For each `drop` / `save_as_oq`, examine whether the upstream artifact named that item a critical driver (engagement / availability / performance / adoption / risk). If yes, the defer brings back a vector that the team thought was too important to drop. **Differentiate** between two cases:
  - «dropped»: a hard removal, the item is not in the draft;
  - «deferred to Open-Questions»: the item is still alive with owner+due. You can recover it if the OQ resolves before the downstream stages.
- **F4 — Silent edits.** For each `edit` in the log, the draft text must agree with the `after` field. If the text is different from both `before` and `after` and has no log entry, the author silently edited it again after approval. This goes around the Socratic contract.
- **F5 — Coverage / structural regression.** Apply all drops and OQ-migrations. Then examine whether the draft still meets its structural floor:
  - each necessary section is filled or explicitly `<!-- N/A: reason -->`;
  - each necessary diagram is present and is not a template stub;
  - each cross-reference table is closed and has no orphans;
  - each Open-Questions row has owner+due.

  OQ-migrated items do NOT count toward coverage floors. Write one finding for each gap.
- **F6 — Constraint / quality leak.** This class is specific to the artifact. See the delta of the consuming skill. Usual forms:
  - an implementation detail goes into business-level acceptance criteria;
  - quality scenarios cite numbers that are not in the upstream NFRs;
  - an ADR has strawman alternatives (options that an existing constraint already excludes);
  - a constraint section contradicts the repo conventions and has no override note.

### Output format

A markdown report of 300 words or fewer, with 0–7 findings. If you have 0 findings, output literally `NO_CONTESTED_DECISIONS`. If not, write one bullet for each finding:

```
- **[F{n}] {one-line headline}** — caused by: {edits-log ref or draft-line ref}; contradicts: {draft §ref + upstream §ref / glossary line / ADR}; suggested: {concrete action}.
```

For F5/F6, list each gap or hit, with one bullet for each. **Cite-mode is mandatory**: each finding cites a minimum of one draft location AND a minimum of one upstream location. A finding without a citation is not valid. Remove it. Do not report it.

### Discipline

- Do NOT propose additions or a new scope that the user did not ask for.
- Do NOT challenge `Approve`-d decisions. The exception: a logged `Edit`/`Drop`/`Save as OQ` or a later section makes them incoherent.
- Do NOT write more than 7 findings. Keep the findings with the highest impact (priority F4 > F1 > F3 > F2 > F6 > F5).
- Do not write a preamble, a restatement or a closing summary. Write only bullets (or `NO_CONTESTED_DECISIONS`).
- If you cannot Read a necessary upstream file, output literally `CRITIC_BLOCKED: <reason>` and stop. Do not guess.

---

## Per-skill delta (what each consuming skill supplies)

- **`{{ARTIFACT_NAME}}`** — for example "Software Architecture Document (Arc42 12 sections)" or "Product Requirements / spec".
- **`{{UPSTREAM_FILES}}`** — the bullet list of files that the critic must Read (for example spec → `CONTEXT.md`, idea source; design → `spec.md`, `CONTEXT.md`, `adr/`).
- **F5 structural floor** — the specific checklist for this artifact (the necessary sections, diagrams and tables).
- **F6 specialization** — the leak rules of the artifact:
  - `specify`: forbidden implementation tokens in an AC (HTTP verbs, URL paths, status codes, error-code strings, SQL constructs). List each hit.
  - `design`: NFR-number leak, strawman-ADR, and a constraint that contradicts the repo.
