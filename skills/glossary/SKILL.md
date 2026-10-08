---
name: glossary
model: haiku
effort: low
agents: []
description: >
  Use to record or update domain terms in CONTEXT.md before their meaning changes. Use it
  when an unclear word occurs in an interview, spec, or review, and you want one
  canonical definition and a NOT-reference, so that a homonym does not cause problems later.
  Triggers on "add term {X}", "what is {X} in our domain", "add to CONTEXT", "fix the
  glossary", "define {X}", "/sdd:glossary {term}", "add a term", "update the glossary",
  "what does {X} mean". Two-level contract: repo-root CONTEXT.md holds project-wide terms,
  docs/features/{slug}/CONTEXT.md holds feature-scoped terms. Readers read both, and the
  per-feature entry wins. Lazy-bootstraps the target from a template. Examines BOTH levels
  for a conflicting entry. Asks for a one-sentence definition and the concept that people
  confuse with the term. Adds one line to ## Glossary. Skip generic tech words (HTTP, queue,
  cache), because they are not domain terms. Output: a created/edited CONTEXT.md. Runs at any
  time, with no input gate. specify, clarify, design and api read its ## Glossary as the
  canonical source of role names and domain-term names.
---

# Skill: glossary

This skill is a lazy utility. It fixes the meaning of a domain term in `CONTEXT.md` when the term first occurs, so that its meaning does not change across the pipeline. For each term, it records a one-sentence canonical definition. If the word is ambiguous, it also records a **NOT-reference** that names the concept that people confuse with it.

The skill runs at any time, with no upstream gate. It can process:

- one term in the middle of an interview,
- an `undefined-term` finding that `clarify` resolves during its sweep,
- a batch that `specify` gives to it.

The output goes to `specify` (role names and domain-term names) and to `design` (invariants). These skills use `## Glossary` as canonical, and it overrides each item that contradicts it.

This skill is a capture utility, not a Socratic stage. It does **not** run the shared Socratic loop or the critic. Its only shared dependency is the question text:
→ [`../_shared/ask-style.md`](../_shared/ask-style.md)

Term definitions follow `artifact_language`. The `## Glossary` heading and the other H2s stay English. The frontmatter stays the frontmatter of the **template** (`status: Living` + `updated_at:`). Never write `artifact_language` or a different settings key into the file → [`../_shared/artifact-language.md`](../_shared/artifact-language.md).

English prose (artifacts, questions, reports, handoff) follows ASD-STE100 Simplified Technical English → [`../_shared/ste100.md`](../_shared/ste100.md).

## Owner

The person who controls the conversation, or any person who finds an ambiguity. If people do not agree about a term, the Tech Lead approves the canonical form.

## Inputs

- `<term>` — the domain word/phrase to fix. If the user does not give it, ask for it.
- (Optional) `<slug>` — the feature slug. The target is `docs/features/<slug>/CONTEXT.md`. If there is no slug, the target is the repo-root `CONTEXT.md`.
- (Optional) `pending_glossary_terms` — a batch that `specify` gives after it writes the spec. Process the terms one after the other.
- (Optional) an `undefined-term` finding from `clarify`. `clarify` invokes this skill **during its sweep**, one term at a time, when such a finding is Resolved. `clarify` never invents a meaning inline. The canonical definition goes here.
- (Optional) phrasings that an interview/brainstorm already found. Offer them as definition options. Do not ask an empty question.

## Protocol

1. **Select the target (the two-level contract).**
   - Root `CONTEXT.md` = **project-wide** terms (they have a meaning across features).
   - `docs/features/<slug>/CONTEXT.md` = **feature-scoped** terms (they have a meaning only in that feature).

   If the user gives `<slug>`, use the per-feature file. If not, use the repo-root file. A term is in exactly **one** of the two files. Never split it or copy it across levels. Readers (`specify`, `clarify`, `design`, `api`) read **both** files. If there is a conflict, the per-feature entry wins.
2. **Generic-term filter.** Reject words that name infrastructure or transport, not the business domain. Examples: HTTP, queue, cache, the datastore, the broker, a framework. Refuse with: «`<term>` is technical, not a domain word — its choice belongs in the SAD or an ADR, not the glossary». Continue only for real domain words.
3. **Bootstrap (lazy).** Run `test -f <target>`. If the file does not exist, copy [`./templates/CONTEXT.md`](./templates/CONTEXT.md) to `<target>`. If the file exists, read it.
4. **Conflict check — both levels.** Run `grep -i "^- <term>" <target>`. Also examine the file of the other level, if it exists (root `CONTEXT.md` ↔ `docs/features/<slug>/CONTEXT.md`).
   - If you find the term (at either level) with the same meaning, STOP. Report «already in the glossary» and the file that holds it. Never copy a term across levels.
   - If you find the term (at either level) with a different meaning, escalate through `AskUserQuestion` (text as [`../_shared/ask-style.md`](../_shared/ask-style.md) specifies): «`<term>` is already defined as `<existing>` in `<file>` — same concept or a different one?». If the concept is different:
     - If it is a real feature-scoped narrower meaning, put it in the per-feature file (there, readers let it win).
     - If not, propose a pair of names that removes the ambiguity (for example, a billing-scoped and a runtime-scoped variant). Fix both entries.
   - If you do not find the term at either level, continue.
5. **Ask for the canonical definition.** Use one `AskUserQuestion`: «Define `<term>` in this domain, in one sentence». If interview/brainstorm phrasings are available, offer them as options. If not, use free text.
6. **Ask for the NOT-reference.** Use one `AskUserQuestion`: «Which concept does `<term>` get confused with, so that a future reader does not confuse them?». If there is no possible homonym, use `None`.
7. **Write one line.** Use `- <term> — <one-sentence definition>. NOT <confused concept + how it differs>.` If step 6 = None, use `- <term> — <definition>.`
8. **Add the line under `## Glossary`.** Read the file. Put the line in `## Glossary`. If the section is already in alphabetical order, keep that order. If not, put the line at the end. Never write existing entries again.
9. **Remove empty H2s.** On a new bootstrap, delete `## Invariants` / `## Out of scope` if they have no real content. Only `## Glossary` is mandatory. Put a real invariant or out-of-scope note in its section. Never write it as implementation detail.
10. **Structural self-check** — as [`../_shared/self-check.md`](../_shared/self-check.md) specifies. Read the target file(s) again from disk and make sure of **3 items**:
    1. The term occurs **exactly one time across the two levels together**. Use grep on root `CONTEXT.md` + `docs/features/<slug>/CONTEXT.md`. There is no duplicate and no split.
    2. The entry agrees with the format `- <term> — <definition>.` (with the optional `NOT …` end).
    3. No empty H2 sections stay.

    Fix and check again for a maximum of 2 cycles. Show each item that is not resolved.
11. **Stamp + commit + handoff.**
    - Set `updated_at: <today>` in the frontmatter.
    - Propose `context: + <term>` (or `context: + <term>, <term2>` for a batch). You can put this change into the intake/spec commit of the caller.
    - Then **emit the stage-handoff block** as [`../_shared/handoff.md`](../_shared/handoff.md) specifies (utility variant). It contains *What I did* (with «self-check: 3/3 pass»), *Review* (`CONTEXT.md`) and *Run next*: go back to your backbone stage (for example, `/sdd:design <slug>`). `/clear` is optional.

## Definition of Done

- `<target>` exists and has `<term>` under `## Glossary` in the format «one-sentence canonical + optional NOT-reference».
- Each conflict with an existing entry is resolved (reported as a duplicate, or changed into different names).
- The skill refuses generic tech words. It does not store them.
- Empty H2 sections are removed on bootstrap. `## Glossary` stays.
- `updated_at` shows today. A commit is proposed.

## Anti-patterns

- **The glossary as a spec or a scratch pad.** Implementation detail («counter stored with a 1-minute TTL») belongs in the SAD/ADR, not here.
- **An empty H2 «for completeness».** If a heading has no bullets, remove it.
- **Silent edits.** Do not add a term without a confirmed definition. The author must control the glossary.
- **A batch «I'll add them later».** Record each term when it occurs. If you defer it, you lose it.
- **You store generic tech words.** HTTP, queue, the datastore name — refuse them.
- **You write the file again on a new run.** The skill reads and adds. It never overwrites the file.
- **An ambiguous term with no NOT-reference.** A homonym without «NOT …» will cause confusion in six months.

## References & template

- [`./templates/CONTEXT.md`](./templates/CONTEXT.md) — the output scaffold. Its inline comments are the contract for each section (Glossary is mandatory, Invariants/Out-of-scope are removed when empty).
- [`../_shared/ask-style.md`](../_shared/ask-style.md) — the text style for the definition / NOT-reference / conflict questions.

## Example invocation

> **User:** «add term tenant for rate-limiting-per-user»
> **Skill:** `<slug>` is given → target `docs/features/rate-limiting-per-user/CONTEXT.md`. Generic filter: `tenant` is a domain word → continue. The file does not exist → copy the template. `grep "^- tenant"` → not found. Definition question → «a billable customer organisation owning 1+ users». NOT-reference question → «NOT user — a user is one person inside a tenant». Write `- tenant — a billable customer organisation owning 1+ users. NOT user (a user is one person inside a tenant).` → add it under `## Glossary` → remove the empty `## Invariants`/`## Out of scope` → `updated_at: 2026-05-28` → commit `context: + tenant`.
