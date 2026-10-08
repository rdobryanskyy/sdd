# Interview depth — easy / medium / hard (the depth dial)

> **Reference-only.** Not a skill. The Q&A skills (`specify`, `clarify`, `design`, `interview`) read
> this file for the canonical three levels and for how each level changes the skill. The dial sets
> **how much the skill decides itself and how much it asks you**. It sets these items:
>
> - the number of questions;
> - the autonomy of the skill;
> - which analyses run;
> - whether you confirm each diagram, or the skill writes the diagrams and gives a summary.
>
> The dial does **not** set *completeness*. The skill covers each acceptance criterion at each
> level (see the coverage floor below).

## TL;DR (short English introduction)

The “depth dial” is one control for each run of a skill: **easy / medium / hard**.

- **easy** — the skill makes most decisions with sensible defaults. It asks only about irreversible or high-risk choices. It **lists its assumptions**, so that you can veto them. It does less analysis. It writes the diagrams with one summary and asks no question for each diagram.
- **medium** — the current balanced Socratic pass (default).
- **hard** — the skill examines **each** decision. Each `AskUserQuestion` puts the trade-off first. The skill uses the full set of idea analyses (research / approaches / perspectives / devil's advocate). You confirm each diagram with prose. The skill examines edge cases more deeply.

Completeness (the coverage of each AC) **does not change** with the level. Easy also covers all ACs. It only asks less about *how*.

---

## How the level is chosen (every consuming skill, step 1)

A consuming skill sets the level one time, at the start of its run. It uses this precedence (the highest wins):

1. **A `--depth=easy|medium|hard` argument** in the invocation, if it exists. The skill uses it silently and asks no question.
2. **The opening `AskUserQuestion`** — ONE question that selects the depth. Write it per [`ask-style.md`](./ask-style.md) (with explanations, and with a gloss for each term). Its **default option** (the «(Recommended)» first option) is:
   - the `interview_depth` value from `.claude/sdd.local.md`, if that file exists and sets the value; if not,
   - **medium**.
   The user can always change the level for one run. The saved default only selects the recommendation. It never skips the question (except when the invocation has `--depth=`).

`interview_depth` is a **plugin-wide** setting. It is not only for implement. Its documentation is with the other settings in [`../implement/references/settings.md`](../implement/references/settings.md).

- The skill **automatically creates the settings file with documented defaults the first time a skill needs it**. Usually this is `specify` at the start of the backbone. Thus the Q&A skills that come later read a real file.
- If a reader still finds no file, the question uses medium as the default.
- There is **no hard dependency** on an earlier run of `implement`. The automatic creation uses the same documented template at each location.

The opening question also tells what the level will *do* to this run. Example: «easy → I will decide the reversible calls myself and list my assumptions; hard → I will examine each decision and run the full analysis suite». Thus the user knows the result before they select.

## What each level governs (the four axes)

| Axis | **easy** | **medium** (default) | **hard** |
|---|---|---|---|
| **Question volume + autonomy** | The skill makes the reversible / low-risk decisions itself, with sensible defaults. It asks ONLY the decisions that are irreversible, that have a high blast radius, or that it really cannot infer. It **writes down each assumption** (an assumptions ledger), so that the user can veto it. | The balanced Socratic walk: one `AskUserQuestion` for each real decision. The skill puts the trivial convention defaults together in one question. | The skill walks **each** decision. Each question **puts the trade-off first** (what you get / what you lose / the hidden risk). The skill examines edge cases more deeply. |
| **Ideation analyses** (`specify` step 3) | Skip the analyses. Use only the deep-dive answers. | `researcher` (competitive/web) + `devils-advocate`. | Full set: `researcher` + `strategist` (3 approaches) + `analyst` (multi-perspective) + `devils-advocate`. Then the user confirms the RICE/feasibility scores that Claude proposes. |
| **Diagram confirmation** (`design` C4, `sequences` flows) | Write the diagram and a **one-line prose summary**, then continue. Ask no question for each diagram (per [`diagram-presentation.md`](./diagram-presentation.md)). | Prose description + one `AskUserQuestion` confirmation **for each diagram**. | The same as medium: prose description + confirmation for each diagram (never raw Mermaid). |
| **Edge-case / ambiguity probing** | Only the edges that change the blast radius. | The error/authz/edge criteria that the spec states. | Adversarial: find edges that nobody stated, run the full `devils-advocate` pass, and ask about each «what if». |

Read the axes together, not one at a time:

- **easy** means «use the defaults, and show me your assumptions».
- **medium** means «walk the real decisions with me».
- **hard** means «ask me everything, run all analyses, and leave nothing unexamined».

The dial changes the *effort to ask*, not the *effort to be correct*.

## The assumptions ledger (easy only)

At `easy`, the skill records each decision that it made **for** the user (and did not ask). Each decision is one line in the ledger. The skill shows all entries together before the write-point:

```
- Assumed: <decision> = <chosen value>  — because <default rationale>.  [veto?]
```

The user gets ONE `AskUserQuestion` to veto or change the ledger as a batch, or to accept all entries. If the user vetoes an assumption, that item becomes a real question (in medium style). This is the safety net of the easy level: the skill has autonomy, but it makes no silent commitment. The user sees each default before the skill locks it, but not as N separate prompts. (At medium/hard there is no ledger, because those levels asked the question directly.)

## The coverage floor is depth-independent (correctness, not a preference)

Depth changes **how many questions** and **how much autonomy**. It never changes **what the skill covers**. The completeness guarantees apply at **each** level:

- Each spec §4 user story has ≥1 acceptance criterion (the **use-case floor**). §5 keeps ≥1 AC of each of the 5 coverage types (`specify`).
- Each §4 user story maps to ≥1 flow. Each §5 AC maps to a flow, a branch or an explicit N/A (the `sequences` use-case check and the AC→flow coverage check).
- Each user story and each AC traces from end to end: spec → sequences → data-model → api → tasks → implement (`review`).

`easy` gets to these guarantees when it **decides** the «how» with defaults and lists them in the ledger. `hard` gets to them when it **asks**. The result is the same.

- A skill must never drop an AC, a coverage type or a flow because the level is `easy`. That is a correctness bug, not a depth choice.
- Sometimes easy cannot infer the «how» for a decision that affects coverage. That decision is then one of the «irreversible / un-inferable» decisions. The skill **must** ask about it at all levels.

## Per-skill adaptation (the delta each consuming skill applies)

- **`specify`** — the level controls the ideation set of step 3 (table above). It also controls the number of questions in the step-2 deep-dive and in the step-7 Socratic validation. The §5 coverage gates are a **floor, not a dial**, and apply at each level: ≥1 of each of the 5 AC types, **and ≥1 AC for each §4 user story** (the use-case floor).
- **`clarify`** — the level controls how aggressive the self-sweep and the `devils-advocate` hunt are. Easy: only the build differences that change behavior, with the assumptions stated. Hard: adversarial, the skill shows each fork. The level also controls the number of questions for each finding. At each level, each ambiguity that the skill finds is still Resolved or Deferred. No ambiguity stays open.
- **`design`** — the level controls the number of Socratic questions for each section. Easy: the skill decides the convention defaults itself, writes the ledger, and asks only the blast-radius decisions. Hard: the skill walks each decision and puts each trade-off first. The level also controls the C4 diagram confirmation (per [`diagram-presentation.md`](./diagram-presentation.md)). The blast-radius → ADR gate and the §11 owner+due rule are floors, and apply at each level.
- **`interview`** (the stress test of an idea before the spec) — the level sets a question budget and a posture:
  - **easy** → 3–4 questions (decide for you: one pass on intent, one important tradeoff, one angle);
  - **medium** → 6–10 (balanced, all three phases);
  - **hard** → 10–15 (ask me everything: examine each assumption, use more probing frames).
  It writes no files, so there is no assumptions ledger. The budget and the posture are the full delta.

A consuming skill adds a one-line pointer to this file at its depth-selection step. Then it uses the level as a parameter in its existing loop. It does not implement the dial again.
