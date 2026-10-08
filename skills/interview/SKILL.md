---
name: interview
model: opus
effort: high
agents: []
description: >
  Use BEFORE specify to stress-test a raw idea. Test it hard before you write a spec. This is a
  Socratic interview. It finds hidden assumptions, names tradeoffs, shows imprecise points and
  proposes new angles. The scope is any idea (product, content, business, architecture, refactor
  approach). In an SDD repo, the usual exit is /sdd:specify on the idea that survives.
  Triggers on "interview {slug}", "stress test {slug}", "challenge this",
  "poke holes", "rip this apart", "/sdd:interview {slug}", "grill it", "tear this idea apart",
  "rip it apart". It runs 3 phases (understand intent → find tradeoffs and weak spots → propose
  new angles) with AskUserQuestion. It ends with a summary of risks, alternatives and the next
  step. Optional: the backbone starts at specify. Use interview when the idea itself is not
  decided yet.
---

# Skill: interview

This skill tests an idea hard **before** the idea becomes a spec. The user gives a raw idea. In
**3 phases**, find hidden assumptions, name tradeoffs, show imprecise points and propose new
angles. Then give the idea that survives to `specify`. This is the optional step before the
backbone. It makes `specify` cheaper, because it stops or changes a weak idea before a spec exists.

**Scope: any idea.** Product, content, business, architecture and refactor approach are all in
scope. The limit: this is an interview about the *idea*. It is not a study of the codebase. Ask
the user to describe the idea in words first. Read files only if the user explicitly tells you
to. The default is interview first, with no grep/find/read that the user did not ask for.

**Language.** Reply in the language of the user. The instructions here are in English to make them clear.

The depth dial and the Socratic posture are SDD-wide:
→ [`../_shared/interview-depth.md`](../_shared/interview-depth.md) · [`../_shared/ask-style.md`](../_shared/ask-style.md)

English prose (artifacts, questions, reports, handoff) follows ASD-STE100 Simplified Technical English → [`../_shared/ste100.md`](../_shared/ste100.md).

## Depth dial — set this first

Ask one `AskUserQuestion`, then keep the answer (**default medium**). The dial is SDD-wide. The
canonical `interview` row in [`../_shared/interview-depth.md`](../_shared/interview-depth.md)
gives the interview delta: the **3–4 / 6–10 / 10–15** question budget for each level and the
posture of each level. Do not copy the table here.

If the user uses an adversarial trigger (grill / rip apart), use **hard**, unless the user says
a different depth. Tell the depth in one line, then start.

## Hard rules

1. **Ask each question through AskUserQuestion**, not as free text.
   - Give 2-4 concrete options.
   - Mark the first option `(Recommended)`.
   - In the `description` of each option, tell what occurs if the user selects it.
   - With free text, the user often says "I don't know", and you lose the signal.
2. **Ask one question at a time.** The user answers with the full context of the previous
   answer. Change the next question to agree with that answer.
3. **A recommendation is mandatory.** Always put a position in the Recommended option. A neutral
   interviewer finds less than an interviewer with an opinion that the user can argue against.
4. **Do not skip phases.** Do not propose alternatives before the intent is clear. Do not test
   tradeoffs hard before you understand the idea.

## Phases

Use **1-3 questions in each phase**, and aim for the count from the depth dial. Go to the next
phase if the answers repeat, if the user says "next" / "enough", or if the last answer added nothing.

### Phase 1 — Understand the idea
If the user did not give the idea in one sentence, ask for it in plain text (no AskUserQuestion).
Then examine it: who has a problem without this · what success looks like in concrete terms ·
whether it is new or an improvement. Do not ask about items that are already clear.

### Phase 2 — Stress-test tradeoffs and imprecisions
This phase is the core. Look for:

- **hidden assumptions** ("this assumes X. If X is false, what then?"),
- **tradeoffs** (time vs quality, scope vs depth, reach vs focus),
- **imprecisions** (vague terms, ambiguous metrics),
- **competition for attention**,
- **the cost of failure**.

Each question gives positions, not yes/no.

**Probing frames** are internal lenses (premortem · second-order · naive listener · inversion ·
cost of waiting · the other person). Pick the lenses that fit, and mix them. Do not tell the
frame name to the user. For before/after examples for each lens → [`references/probing-frames.md`](references/probing-frames.md).

**Intensity dial.** The default tone is Socratic. The adversarial triggers make the words
stronger ("Why do you think that X is true at all?"). The user can make the tone softer with
"ease up" / "go easier".

**Drill vs move on.** If an answer showed a new assumption, ask more about the same dimension.
If the position is clear and the tradeoff has a name, go to a different dimension.

### Phase 3 — Propose new angles
Now propose new angles actively through AskUserQuestion. Give 2-3 alternative shapes (a
different audience, format or scale) or a twist (inversion, constraint, simplification). The
Recommended option is your strongest choice, with the reason in `description`.

## Final summary (plain text, not AskUserQuestion)

≤4 questions → **mini**; ≥5 → **full**.

**Mini:** Revised idea (one sentence) · Weakest spot (one sentence) · Next action (one verb).

**Full:**
```md
## Revised idea
{one paragraph — the idea after the interview}

## What surfaced
- **Hidden assumptions**: …
- **Main tradeoff**: …
- **Weakest spot**: …

## Alternative angles
1. {strongest} 2. {second} 3. {the one they wouldn't have reached alone}

## Next step
{one concrete verb — usually "/sdd:specify <slug>" once the idea survives}
```

For a full medium-depth pass with notes → [`references/annotated-pass.md`](references/annotated-pass.md).

## Hand off

interview writes **no files**. It makes the idea clearer in the mind of the user.

- The **structural self-check** of this skill is a check of the final summary against its
  mini/full format ([`../_shared/self-check.md`](../_shared/self-check.md)). There is no file on
  the disk to read again.
- After the summary, **emit the stage-handoff block** per [`../_shared/handoff.md`](../_shared/handoff.md)
  (utility variant, `/clear` is optional):
  - *What I did*: the revised idea + its weakest spot.
  - *Review*: nothing on the disk. The summary above is the artifact.
  - *Run next*: if the idea is a feature that you will build, `/sdd:specify <slug>` changes the
    idea that survived into a spec. If not, continue the work that you did before.
- Never end with only «Next: …».

## Anti-patterns

- You ask "what exactly do you mean by X?". Instead, give 3 interpretations for the user to select from.
- You give general advice ("think about the user"). Instead, give a specific opinion.
- You end without a recommendation, or without the name of the next step.
- You continue after the limit of the depth dial. At medium, the target is 6-10 questions, not a very long session.
- You read the repo or run grep when the user did not ask for it. The user describes the idea in words first.

## Edge cases

- **The idea is already mature.** Skip most of Phase 1. Sometimes, ask only 1 question.
- **The user stops with "ok summary".** Go directly to the final block with the information that you have.
- **The idea is weak, and you find this during the interview.** Say this clearly, then propose the reframe.
- **The idea is for a different person.** Change the route: "what would they say to question X?"

### Stuck protocol
If the user selects **Other two times in sequence**, OR writes "I don't know", ask one open text
question ("In your words — what is the largest problem with this idea now?"). After the user
answers, use AskUserQuestion again with a new angle.

## References

- [`references/probing-frames.md`](references/probing-frames.md) — the 6 lenses, with before/after questions.
- [`references/annotated-pass.md`](references/annotated-pass.md) — a full medium-depth interview with notes.
- [`../_shared/interview-depth.md`](../_shared/interview-depth.md) — the SDD-wide easy/medium/hard dial.
- [`../_shared/ask-style.md`](../_shared/ask-style.md) — the contract to write AskUserQuestion options.
- [`../_shared/handoff.md`](../_shared/handoff.md) — the format of the stage-handoff block.
