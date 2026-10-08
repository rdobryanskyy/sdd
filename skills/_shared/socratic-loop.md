# Socratic loop — canonical batch validation + 4-state machine + edits-log

> **Reference-only.** This file is not a skill. It has no `SKILL.md` and never triggers.
> Skills that run a Socratic validation pass (`specify`, `design`) read this file for the
> canonical machine. Each skill keeps only a short **delta** with its own decision types and section list.

## TL;DR (short English introduction)

The “Socratic loop” is a dialog with the user about each **section/group** of an artifact:

1. The skill **shows the full section at one time** and gives a number to each decision (the full picture before the details).
2. It asks about **one decision at a time** through `AskUserQuestion` (wording: [ask-style.md](./ask-style.md)).
3. The user selects one of **four actions**: **Approve** / **Edit** / **Save as Open Question** / **Drop**.
4. The skill **applies the transition** in memory and keeps an **edits log**. It writes to disk and commits only at the end of the section.
5. A separate clean-context critic finds internal contradictions between sections ([critic.md](./critic.md)).

---

## Contract — batch-per-section, not per-decision-across-sections

For each section/group in sequence, the skill does these steps:

1. **Show the full proposed section** in one message: the body text + a numbered list of the decisions in it. The user sees the full shape before the skill asks about each decision. Thus the user finds problems early: duplicates, gaps, or a section that must go fully.
2. **Walk the resolution of each decision.** Use one `AskUserQuestion` for each decision, with the 4-state machine below.
3. **Apply the transitions** to the section in memory when each resolution comes.
4. **Run the gate of the skill**, if one exists, on Approved decisions (for example, the blast-radius gate of `design` → ADR). Edit/Drop/Save-as-OQ do not start gates.
5. **Write the resolved section to disk**, with each file that the gate created. Make one bundled commit for each section.
6. **Go to the next section.** The skill **never goes back** to a written section. The critic finds drift between sections. The skill does not walk the section again.

The skill does **not change** artifacts on disk before step 5. All work before that step is in memory.

## The 4-state machine (uniform across every decision-type)

> **Plain-English summary.** The four actions for each decision are **Approve** / **Edit** /
> **Save as Open Question** / **Drop**. `Cancel` and `Reject` have the same meaning as Drop.

- **`Approve`** → keep the decision verbatim. Write no edits-log entry (Approved is the baseline). If the skill has a gate, run it. Go to the next decision.
- **`Edit`** → the user gives the new wording / option / value in one answer. The skill writes the decision again with the new constraint and asks **one more time**. There is only one iteration: the second answer is final. Log entry `action: "edit"`.
- **`Save as Open Question`** → the decision goes out of its section. The skill adds a row to the Open-Questions / Risks table of the artifact:

  ```
  | Open decision: <headline> | Open question | Resolve before <stage trigger or YYYY-MM-DD>; <inline rationale> | <owner> |
  ```

  The owner and the due value are **mandatory**. The due value is a date OR a stage trigger, for example «before `sdd:tasks`». Ask one more `AskUserQuestion` to get both values. If one of them is empty, **change the action to `Drop`** and give a clear warning. Log entry `action: "save_as_oq"`. **No gate**, because a deferred decision is not an accepted decision.
- **`Drop`** → the skill removes the decision. There are two sub-paths:
  - **Mandatory decision** (for example, a module boundary that each feature must have) → ask again **one time**, with a changed set of options. If the user drops it a second time, escalate to `Save as Open Question`. The skill proposes an owner and a due value and gives a warning.
  - **Optional decision** → leave it out, and do not replace it.
  - Log entry `action: "drop"` (`after: null`).

Each option `label` is the **next mechanical step**. Each `description` tells what the skill will do. See [ask-style.md](./ask-style.md).

## Edits-log (mandatory)

After each `Edit` / `Drop` / `Save as Open Question` (NOT `Approve`), add one entry:

```
{decision_id: "DEC-<section>-<short-id>",
 action:      "edit" | "drop" | "save_as_oq",
 before:      "<verbatim wording/option/value before the action>",
 after:       "<verbatim wording after — for save_as_oq this is the OQ-row text incl. owner+due; for drop, null>",
 user_reason: "<the rationale the user gave, verbatim>"}
```

`Approve` decisions are not in the log, because they are the baseline. The log is the **only** signal that the clean-context critic uses to find upstream-coherence drift that user edits caused. Without the log, the critic has no input for its F-classes. If the user gives no reason for `Drop` / `Save as OQ`, ask again one time. The critic must have the verbatim wording.

## Cadence

- Give a 1-line mini-recap of the decisions after about each 5 questions. Thus the user sees the dependency chain and does not have to scroll.
- Keep a soft question budget for each section. Its size comes from the feature class (see [size-matrix.md](./size-matrix.md)): XS/S use `<!-- N/A -->` more, M+ walk each decision.
- **The number of questions also changes with the interview-depth dial** ([interview-depth.md](./interview-depth.md)):
  - `easy` makes the reversible decisions itself and walks only the irreversible or high-risk decisions. It writes its assumptions in a ledger.
  - `medium` walks each real decision.
  - `hard` walks each decision and puts each trade-off first.
  
  Depth and size add together: an XS feature at `easy` asks the fewest questions, and an L feature at `hard` asks the most. Depth changes only the number of questions. It does not change the rules for disk writes, the edits-log, or a coverage floor.

## Exit condition

A section is complete when all of these conditions are true:

- Each decision in it has exactly one resolution applied.
- The resolved content and each file that the gate created are on disk.
- The edits-log has no pending entries.

The full pass is complete when the skill wrote all sections. For a skill that runs a critic phase, the skill must also dispatch the critic. See [critic.md](./critic.md).

## Per-skill delta (what each consuming skill defines locally)

The `references/socratic.md` file of a consuming skill (or an inline block of ≤5 lines in `SKILL.md`) supplies only these items:

- **Section/group list** that the skill walks in sequence (for example `specify`: the 5 AC coverage types; `design`: Arc42 §1–§12).
- **Decision-types catalog** for this artifact (for example `design`: Strategic / Building-block / Crosscutting / Quality-scenario / Risk).
- **Gate of the skill** that runs on Approved decisions, if one exists (for example `design`: blast-radius → ADR).
- **Location of the Open-Questions table** (the section that gets the `save_as_oq` rows).

All other items come from this file: the 4-state machine, the edits-log schema, the cadence and the rules for disk writes.
