# design-specific `AskUserQuestion` shapes

The canonical question/option contract is in [`../../_shared/ask-style.md`](../../_shared/ask-style.md). Read that file first. The contract is:

- junior-friendly and bilingual;
- label = the next mechanical step;
- description = 3–5 sentences with the four mandatory elements.

This file keeps only the **design-specific shapes** that are not in the shared file: the strategic-decision-with-ADR-spawn, the blast-radius gate, and the Save-as-OQ follow-up. The examples are stack-agnostic. Use the real names of your repo.

## Strategic decision (§4) — option labels name the ADR spawn

```
Question:
  §4 Solution Strategy — how do the two modules communicate?
  CONTEXT: module A writes a record. Module B must react to it (for example, send a notification).
  We must decide: A calls B inline, or B reacts to an event later.
  WHY IT MATTERS: this is irreversible. A change after data collects is a migration of many weeks.
  It is also multi-module: it changes the contract that A and B see. Blast-radius ≈ 3/3,
  so this decision will spawn an ADR. The trade-off is coupling vs more moving parts.
  Read the option descriptions before you choose.

Options:
  - label: "Async events (Recommended) (→ spawn ADR-0001)"
    description: "A writes its record and emits an event. B consumes the event in the background. BENEFIT: if B is down, A can still write. This supports the availability quality goal, and the modules deploy independently. COST: it needs an event-delivery mechanism: a table that A writes events into in the same transaction, plus a worker that reads and dispatches them (about 150 LOC). It also needs eventual-consistency handling. RESULT: I spawn ADR-0001 in decision form, add a §9 row, and lock the integration shape for the `data-model` stage. HIDDEN: this is useful only if you need decoupling. For a single in-process call, it is over-engineering."
  - label: "Synchronous call (→ spawn ADR-0001)"
    description: "A calls B directly and waits for the result. BENEFIT: it is the easiest to understand, needs no more infrastructure, and has strong read-after-write behavior. COST: when B is down, the write of A fails. This couples their availability and their deployment lifecycles. RESULT: I spawn ADR-0001 with this as the chosen option and with the alternatives recorded. Then I add a §9 row. HIDDEN: this is correct until B becomes slow or unstable. Then A gets the incidents of B."
  - label: "Save as Open Question"
    description: "I remove this decision from §4 and add a §11 Risks row «Open architectural decision: module integration — Open question — Resolve before `data-model` — owner: <you>». Then I ask you for the owner + due. Without both, it becomes Drop. No ADR, because a defer is not an accepted decision."
  - label: "Drop and reframe"
    description: "I discard this option set and ask again with a different set (for example, only the synchronous variants if you excluded async). Use this when the set does not include a dimension that is important to you. This decision is mandatory. Thus, a second drop escalates to Save-as-OQ with a suggested owner."
```

## Blast-radius gate (after an Approve, on a 1-of-3 borderline)

When the gate score is **2+**, spawn the ADR and do not ask. Ask only on a **1-of-3 borderline**:

```
Question:
  Blast-radius check after you approved «<chosen option>».
  CONTEXT: this got 1 of 3. It has legitimate alternatives, but it is reversible and stays
  in one module. We must decide if it needs its own ADR file.
  WHY IT MATTERS: ADRs are for decisions that people will read again in six months. Too many ADRs
  make the genre weaker. Too few ADRs lose the «why». Read the options.

Options:
  - label: "Record as ADR"
    description: "I create adr/NNNN-<decision-in-kebab>.md from the options you saw (with the rejected ones) + your rationale, with Status Accepted. Then I add a §9 row. The file goes in the commit of this section (or in its batch on quick+easy). Select this if other people can really dispute the choice."
  - label: "Keep inline"
    description: "I write the decision into the section body with a one-line rationale, and no ADR file. Select this when the choice has a small blast radius but has alternatives. This is usual for §8 crosscutting or for a §5 internal-layout decision."
```

## Save-as-OQ follow-up (capture owner + due)

Ask this immediately after a section resolves to Save-as-OQ:

```
Question:
  The decision moves to §11 Open Decisions. Give an owner and a due: a date
  (YYYY-MM-DD) or a stage trigger, for example «before `tasks`». Both are mandatory. Without both,
  this becomes a Drop and nothing goes into §11.

Options:
  - label: "Provide owner and due date"
    description: "You type «owner: <name/role>, due: <date or stage>» in one line. I write it into the §11 row (severity = Open question). Thus, you can recover the deferred decision until that trigger."
  - label: "Cancel — Drop instead"
    description: "I stop the OQ migration and apply Drop. The decision goes out of its section, and I create no §11 row. The edits-log records it as a drop."
```
