# Structural self-check — the final-step verification contract every skill runs

> **Reference-only.** Not a skill. Each skill examines its own output before the handoff.
> This file is the one contract for how to do it. A skill either runs a **named structural
> checklist** (in its own SKILL.md, in the penultimate protocol step), or it maps an existing
> heavy verifier onto this contract (see «Heavy verifiers count» below). In both cases, the
> SKILL.md writes the phrase **structural self-check** at the place where it satisfies the
> contract. The validator greps for this phrase as evidence.

## TL;DR (short English introduction)

Before the handoff, each skill examines its own artifact **from disk** against a named checklist.
If it finds a problem, it corrects the problem and examines the artifact again (two cycles at
most). If it cannot correct the problem, it tells the user honestly, never silently. The result
is one handoff line: “self-check: 6/6 pass”. Some skills have large validators (critic, reviewer,
drift-check, mermaid-check, GATE). These skills do not do the work two times: their validator
**is** the self-check. They add only the structural items that the validator does not cover.

The English text of the artifact passes the ASD-STE100 self-check in [`./ste100.md`](./ste100.md)
before the handoff.

## The contract (five steps)

1. **Read the artifact again from disk.** Never examine the draft in memory. Downstream stages
   read the file as written. (A skill that writes nothing, for example `interview` or `start`,
   examines its output against its DoD.)
2. **Run the named checklist.** Each item is **structural and easy to examine**: a grep, a count,
   a file-exists test, an enum membership. An item is not a judgment. The checklist is in the
   SKILL.md of the skill (penultimate protocol step). It has a fixed item count, thus you can
   report the result as `N/N`.
3. **Correct and examine again, 2 cycles or fewer.** If an item fails, correct it and run the
   checklist again. Do a maximum of two correction cycles. If an item still fails after that, it
   is *unresolved*. Do not try it again and again.
4. **Show the unresolved items to the user, never silently.** Report each item that still fails,
   with the item name and the corrections that you tried. Do not silently commit an artifact that
   fails. This is the one forbidden action. A stated failure is permitted. A hidden failure is not.
5. **Report in the handoff.** *What I did* contains one line: «self-check: 6/6 pass» (or
   «self-check: 5/6 — <failing item> unresolved, see above»).

## Heavy verifiers count (no double work)

Some skills already run a heavy verifier:

- the clean-context **critic** (`specify`, `design`);
- the **reviewer** agent (`review`);
- the **devil's-advocate** sweep (`clarify`);
- the bidirectional **drift check** (`api`);
- the **mermaid re-validation** and the coverage table (`sequences`);
- the 4-mandatory **self-check** (`data-model`, `tasks`);
- the per-task **GATE** (`implement`, `fix`).

Such a skill counts that verifier **as** its structural self-check. It does not add a second
checklist on top. It adds **only the structural items that the verifier does not cover** (for
example «frontmatter stamped», «file at the size-correct target»). It still reports per step 5.
The SKILL.md states the mapping in one literal sentence («<verifier> = this skill's structural self-check»).

## Anti-patterns

- **Judgment items in the checklist.** You cannot examine «The spec is clear». You can examine
  «every §5 AC id appears in the coverage table». Judgment is the work of the heavy verifiers.
- **Examination of the draft, not the disk.** This contract finds one bug: a write that did not
  go to disk as the conversation expected.
- **Correction loops that do not stop.** Do two cycles, then show the problem. If a checklist
  cannot pass after two corrections, it shows a real problem that the user must see.
- **A silent pass.** The handoff line is mandatory also when all items pass. «self-check: 6/6
  pass» is one line of proof, not noise.
- **A copy of the heavy verifier.** If the critic already examined drift across sections, the
  checklist does not examine it again. It examines only the structural items that are left.
