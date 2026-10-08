# Artifact language — the `artifact_language` switch (prose ↔ structure)

> **Reference-only.** Not a skill. Each skill that writes an artifact reads this file for the
> rule of the `artifact_language` key in `.claude/sdd.local.md`. The key is defined in
> [`../implement/references/settings.md`](../implement/references/settings.md). The default is `en`.
> The rule: **the prose changes language, the structure stays English.** The conversation
> language (questions and option text) is a different topic → [`ask-style.md`](./ask-style.md).
>
> **Writing standard.** English prose follows ASD-STE100 → [`ste100.md`](./ste100.md).
> Ukrainian prose is out of the scope of ASD-STE100.

## The rule

Write the **prose** of each pipeline document in the configured language. Keep the **structure**
in English, verbatim from the template. The details:

- **Prose (changes language):** paragraphs, list items, table cells, Mermaid node, edge and
  participant *labels*, the ADR context, rationale and consequences, review and fix findings, the
  changelog and PR body text. Also the prose fields of `tasks.json` (`title`, `dod`) and of
  `openapi.yaml` (`summary`, `description`).
- **Structure (stays English):** section headings (verbatim from the template), frontmatter keys
  **and** values, file names, and each machine token in the list below.
- **The setting never goes into artifacts:** `artifact_language` is only in `.claude/sdd.local.md`.
  Never write it (or a different settings key) into a document. The frontmatter keys of an
  artifact come **verbatim from its template**. Do not add improvised keys in any language.

## Never translate

The dashboard state derivation, the implement engine or downstream skills parse these tokens.
If you translate one, the pipeline breaks and shows no error:

- Headings that the state derivation reads: `## Shipped` (roadmap), `## Test plan` (spec), `## Glossary`
  (CONTEXT.md). Also all other template headings, as a class.
- Review verdict literals: `PASS`, `CHANGES REQUESTED`, `REVIEW_CLEAN`.
- Tracker states `todo / in_progress / review / done` and task ids `T<n>`.
- Frontmatter keys and values (`status: approved`, `test_cmd`, `reflects_commit`, `target_surfaces`, …)
  and the `.size` / `.route` token files.
- Mermaid keywords (`sequenceDiagram`, `participant`, `alt/else/end`, …) and diagram identifiers that
  name real modules, files or endpoints. Translate the labels. Do not translate the names.
- `tasks.json` machine fields (`id`, `layer`, `deps`, `acs`, `files_hint`, `slug`) and OpenAPI
  paths, `operationId`, status codes and schema names.
- ADR `Status:` values (`Proposed`, `Accepted`, `Deprecated`, `Superseded`).

Code, tests, test names, commit messages and branch names are **always English**. They are
fully out of the scope of this key.

## Precedence (editing vs creating)

1. **The language of an existing file wins over the setting.** A skill that edits a document
   (`clarify`, `sequences`, `fix`, …) uses the language that is already on the page.
2. **A new file uses the language of the other files in its feature folder.** Do not start a
   second language in the middle of a feature.
3. Only a fully new start reads the setting. **Never translate an existing artifact again.**

## Agent reports

When a skill dispatches a subagent that writes a report, the **dispatch prompt** gives the
language. Example: «Write your report's prose in Ukrainian; keep identifiers, file paths and
verdict literals as-is.» The pass of the skill itself is the backstop. The `agents/*.md` files
stay language-neutral.

## Template comments

The `<!-- … -->` comments in `skills/*/templates/*.md` are the generation contract, not content.
**Never copy them into the output, in any language.**
