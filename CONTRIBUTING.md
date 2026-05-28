# Contributing to SDD

## Adding or editing a skill

A skill lives in `skills/<name>/` and is the **source of truth** for its stage.

1. **`SKILL.md` is a short spine.** Frontmatter (`name` + a third-person `description` with
   3–5 trigger phrases, EN plus 2–3 UA) then a numbered Protocol. Keep it lean — target well
   under ~140 lines. Heavy detail goes in `references/`; output scaffolds go in `templates/`.
2. **Don't duplicate shared logic.** The 4-state Socratic machine, the clean-context critic,
   the size matrix, and the `AskUserQuestion` style live once in `skills/_shared/`. Reference
   them with a relative link and keep only a short per-skill **delta** (your decision-types,
   your section list, your F6 specialization).
3. **Stay stack-agnostic.** No hard-coded language, tracker, test framework, or load tool.
   Detect what the repo uses, or name the detected tool as «whatever your repo already uses».
4. **Gate your inputs.** If a prerequisite artifact is missing, hard-refuse with a pointer to
   the skill that produces it.
5. **One level of `references/`.** No nested reference folders.

## Subagents

Engine subagents live in `agents/*.md` with `name` / `description` / `model: inherit`
frontmatter and a system prompt that instructs them to read upstream artifacts directly.

## Before you open a PR

The `validate` GitHub workflow runs `scripts/validate_plugin.py`, which checks that the plugin
and marketplace manifests agree on name / version / description, that the version is semver, and
that every triggering skill and agent carries the required frontmatter (and that `_shared/` stays
reference-only). It also greps for references to the excluded legacy dirs. Run it locally before
opening a PR:

```bash
python3 scripts/validate_plugin.py
```
