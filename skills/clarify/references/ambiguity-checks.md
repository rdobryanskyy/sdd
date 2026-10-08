# Ambiguity checks — the eight classes + the devil's-advocate subagent

The `clarify` skill sweeps `spec.md` for these eight ambiguity classes (self-sweep, step 2). Then it dispatches the clean-context subagent (step 3). The prompt body of the subagent is at the bottom of this file. Each finding from the two sources ends in one of two states:

- **Resolved** — the spec is tightened in its native section.
- **Deferred** — a §8 Open-Questions row with owner + due.

The test for each class is the same: *can two competent engineers read this and build different things?*

## The eight ambiguity classes

The priority for the step-4 merge (highest impact first): **conflicting-requirement > under-specified-AC > unmeasured-NFR > undefined-term > missing-actor > scope-creep > vague-term > unstated-assumption.**

### 1. vague-term
- **Spot it:** a qualitative word without a quantity in a goal, an AC or an NFR: «fast», «scalable», «user-friendly», «soon», «most», «handles load», «secure enough». There is no number and no named threshold.
- **Resolve it:** ask for the concrete threshold or the named criterion, and write it in place («fast» → «p95 ≤ 250ms» in §6, with a measurement). If the number is really unknown, defer it to §8 with owner + due. Never leave the adjective.

### 2. unmeasured-NFR
- **Spot it:** a §6 row with an adjective as the Target, or with no Measurement. Nobody can verify this non-functional requirement («high availability», «low latency», Target=`good`, Measurement empty).
- **Resolve it:** replace it with a numeric target + a concrete production metric («Availability 99.9% / monthly SLO window»). Use the rule of `specify` again: a bare adjective is never acceptable. Get a number now, or an OQ with owner + due.

### 3. under-specified-AC
- **Spot it:**
  - A §5 acceptance criterion that covers only the happy path. It says nothing about the error branch, the unauthorized actor, a named domain-invariant violation, or a concurrent or edge case. The «Then» names one outcome, but two outcomes are possible.
  - **Also the extreme case: a §4 user story with NO acceptance criterion.** `specify` should enforce this use-case floor, and clarify is the second check. A US with zero ACs is maximally under-specified. Two engineers can build completely different things, or nothing.
- **Resolve it:**
  - Ask which branch is missing. Add a sibling AC in business-observable Given/When/Then, and tag its US (for example `AC-NNb`).
  - **For a US with no AC, add ≥1 AC for it** (business-observable Given/When/Then), or confirm that the US is out of scope (→ a §3 non-goal).
  - Keep it stack-agnostic: no status codes, endpoints, error-code strings or SQL. That mapping is in `api`.

### 4. unstated-assumption
- **Spot it:** the spec works only *if* an unstated condition is true. Examples: a data volume, a current integration, a tenancy model, the SLA of a dependency, "users already have accounts". The assumption is load-bearing, but the spec does not write it.
- **Resolve it:** show the assumption. Then pin it as a §1 context sentence or a §3 non-goal. If it is a real unknown, defer it to §8 with the owner who can confirm it.

### 5. conflicting-requirement
- **Spot it:** two statements that cannot both be true. Examples: a goal vs a non-goal, two AC with incompatible outcomes, an NFR target that contradicts a goal («real-time» in §2 vs «nightly batch» in §6). This has the highest priority, because a conflict damages all downstream work.
- **Resolve it:** name the two lines verbatim and ask which one wins. Rewrite the line that loses (or limit its scope with a §3 non-goal). Never keep the two lines.

### 6. undefined-term
- **Spot it:** a domain noun that the spec uses as if its meaning is clear. But the spec does not define it, and it is **not** in `CONTEXT.md` `## Glossary`. Examples: «active member», «published», «owner», «verified». It is a homonym that can cause a fork. *(If it IS already in the glossary → false positive, drop it.)*
- **Resolve it:** this is a glossary task. Capture the one-sentence definition (and a NOT-reference). Give the term to `glossary` for `CONTEXT.md`. In the spec, refer to the agreed meaning inline where the term first occurs. Do not invent the definition.

### 7. missing-actor
- **Spot it:**
  - An AC or a flow implies a role that has no §4 user story.
  - A §4 role from the glossary occurs in no AC.
  - The spec only partly acknowledges an actor.
  - «the system does X», but no actor starts X.
- **Resolve it:** add the missing US (with a role from the glossary only, no invented `user`/`admin`) and ≥1 AC for it. Or confirm that the role is out of scope, and record that as a §3 non-goal.

### 8. scope-creep
- **Spot it:** an AC, a goal or an open question that silently goes beyond the declared size of the feature. Examples: a second subsystem, one more integration, a "while we're here" capability that the §3 non-goals do not exclude. Two engineers can disagree about whether it is in scope.
- **Resolve it:** ask in or out.
  - In → it must trace to a §2 goal (and it can make it necessary to run `classify-size` again).
  - Out → add an explicit §3 non-goal, so that it does not come back.
  - Never add it silently.

## A finding is closed two ways (mirror of the shared 4-state machine)

- **Resolve now** → edit the spec in its native section. Record `before→after` in the edits-log.
- **Defer to §8** → add a checkbox row `- [ ] <question>? Default now: <X>. — owner: <name/role>, due: <date or stage trigger like "before sdd:design">`. Owner + due are mandatory (the same rule as for §8 in `specify`). If one of the two is missing, ask again one time. If it is still missing, the finding stays unresolved. Never drop it silently.
- **Not an ambiguity** → a false positive, for example a term that is already in CONTEXT, or a number that is present but the sweep read incorrectly. Drop it and make no edit.

---

## Devil's-advocate subagent — prompt body

> All text below the line is the `Agent` prompt (`subagent_type: "general-purpose"`, clean context). The skill replaces `<slug>` and sends the assembled text. The subagent **reads the spec itself**. The skill puts nothing inline, to prevent paraphrase poisoning, per the dispatch discipline in [`../../_shared/critic.md`](../../_shared/critic.md). This agent is not the coherence critic. It looks for **ambiguity / build divergence**, not for cross-section drift.

---

You are a devil's-advocate reviewer for a feature specification. You did **not** see the conversation that wrote it, and you propose no new features. Your only task is to find where the spec is **so ambiguous that two competent engineers can build different things from it.**

Write your findings in ASD-STE100 Simplified Technical English: approved words, short sentences, active voice, no "-ing" verb forms. Keep identifiers, file paths, `§ref` values and the literal tokens below as they are.

### Inputs — you MUST Read these yourself, do not trust any paraphrase

- `docs/features/<slug>/spec.md` — the spec to attack. Sections: §1 Context, §2 Goals, §3 Non-goals, §4 User stories, §5 Acceptance criteria, §6 NFR (+ §6.1 Security), §7 KPIs, §8 Open questions.
- `docs/features/<slug>/CONTEXT.md` — the glossary, **if it exists**. A domain term that this file already defines is NOT an ambiguity. Do not flag it.

### Method

Read the two files first. Then, for each section, ask this question: *if I gave only this text to a second engineer with no access to the authors, where would the build of that engineer diverge from the first engineer's build?* Examine the eight classes:

1. **vague-term** — a qualitative word without a quantity (fast / scalable / soon / most / handles load).
2. **unmeasured-NFR** — a §6 row with an adjective target or with no measurement. Nobody can verify it.
3. **under-specified-AC** — a §5 AC that covers only the happy path. It says nothing about error / authorization / a named domain-invariant violation / a concurrent or edge case. Also flag each **§4 user story that has no §5 AC** (the extreme case: add ≥1 AC for it or de-scope it).
4. **unstated-assumption** — the spec works only if an unstated condition is true (data volume, a current integration, a tenancy model, the SLA of a dependency).
5. **conflicting-requirement** — two statements that cannot both be true (goal vs non-goal, two AC, an NFR vs a goal).
6. **undefined-term** — a domain noun that the spec uses as clear, but does not define, and that is not in the glossary.
7. **missing-actor** — an AC or a flow implies a role with no §4 story, or a glossary role occurs in no AC, or «the system does X» names no actor that starts X.
8. **scope-creep** — an item that silently goes beyond the declared size of the feature, and no §3 non-goal excludes it.

Be adversarial but honest. If the authors clearly decided a point, it is not ambiguous only because you would phrase it differently.

### Output format

Give a markdown list of **≤ 12 findings**, with the highest build-divergence impact first. If the spec is really unambiguous, output literally `NO_AMBIGUITIES` and nothing else. If not, write one bullet for each finding:

```
- **[<class>] <one-line headline>** — §ref: <section/AC id>; divergence: <the two different things engineers could build>; suggested: <resolve-now tightening OR defer-to-§8 with a candidate owner>.
```

### Discipline

- Cite a `§ref` on **each** finding (a section number or an AC id). A finding without a citation is not valid. Drop it. Do not send it.
- Do NOT propose new features, do not change the scope, and do not rewrite the spec. Only show where it forks.
- Do NOT flag a term that is already in `CONTEXT.md` `## Glossary`.
- Collapse near-duplicates into one bullet (same `§ref` + same class).
- Do not write an introduction, a restatement or a closing summary. Write only bullets (or `NO_AMBIGUITIES`).
- If you cannot Read `spec.md`, output literally `CLARIFY_BLOCKED: <reason>` and stop. Do not guess its contents.
