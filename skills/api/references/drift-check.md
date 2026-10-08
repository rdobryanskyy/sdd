# api — drift check, report shape, reconcile, conflicts

The contract is a **derived** artifact: `data-model.md` (typed shape) + `sad.md` §6 sequences
(error branches, async actors) + `spec.md` §4/§5 (endpoint list, observable outcomes) → OpenAPI.
This file gives the operational details for step 7 of the spine: the contents of the report and
the comparison of each drift point. The spine ([`../SKILL.md`](../SKILL.md)) is the source of
truth for when this check runs.

## `api-sync-report.md` shape

Write it to `docs/features/<slug>/contracts/api-sync-report.md`, next to the YAML. It has two sections.

### Section A — field-origins table

Write one row for each `(operation, schema_field)` pair. Then you can trace each field in the contract:

```
| schema_path                | origin                                        | confidence |
|----------------------------|-----------------------------------------------|------------|
| createLesson.title         | data-model.md → lesson.title (≤200)           | high       |
| createLesson.module_id     | data-model.md → lesson.module_id (FK)         | high       |
| deleteFeedback.id          | existing schema — 000012_create_feedback.up   | high       |
| listLessons.next_cursor    | derived (cursor wrapper convention)           | high       |
| publishLesson.published_at | inferred from spec §5 AC-4, no column         | low        |
```

- **high** — the field maps to a `data-model.md` column with a matching type or constraint.
- On a **legal fast-lane skip** (no `data-model.md`, no schema change — SKILL.md step 1), the
  origin is **`existing schema — <migration/DDL anchor>`**. This is the live migration file (or
  DDL statement) that defines the column. The confidence scale is the same. A column with a
  matching type or constraint in the live DDL is `high`.
- **medium** — the field comes from a field name in the spec, and no column exists yet (for
  example, a computed field or a field that is only in the response).
- **low** — the field is inferred only from the name of a sequence message. Flag it for confirmation.

A `low` row is **declared incompleteness**, not an error. It tells the team what `--reconcile`
will make stricter when the model gets that column. Never hide it.

### Section B — drift findings (4-point checklist)

Each point is ✓ or ✗. A ✗ has a one-line diagnostic.

1. **Endpoint ↔ data-model** *(core)* — each endpoint reads or writes ≥1 entity in `data-model.md`
   (for example, `POST /lessons/{id}/publish` changes `lesson.status`).
   - On a legal fast-lane skip (no `data-model.md`), use this fallback: each endpoint reads or
     writes ≥1 entity in the **existing schema** (the live `migrations/` DDL). This is the same
     as the sad.md fallback below.
   - If sad.md is absent, use this fallback: each endpoint maps to a §4 user story.
2. **Error code ↔ repo error definition** *(core)* — each `code` in an `Error` response exists in
   the error definitions of the repo, **checked in the form that the repo uses**.
   - First, find that form: a constants or enum file, an error registry, a sentinel module, a
     generated table. Then compare with it.
   - Do **not** assume one language or a Go-style `domain/errors.go`.
   - If the repo has no central error list yet, do not fail the point. Record "no error registry
     found — codes are the contract's proposal; reconcile when the repo defines them".
3. **Validation ↔ constraint** *(core)* — `maxLength` / `pattern` / `enum` in the contract agree
   with the bounded types and the uniqueness and format constraints in `data-model.md`.
   - On a legal fast-lane skip, they agree with the **DDL of the existing schema** (column types,
     `CHECK`s, uniqueness in the live migrations).
   - If there is a conflict, use the **stricter** value and flag both values. The person decides
     which artifact is wrong.
4. **OpenAPI ↔ sequence** *(supporting)* — the methods, paths and outcome branches that the §6
   sequences show agree with the contract.
   - A difference usually means that a sequence was drawn before the contract was final, and
     nobody updated it.
   - The §6 participants are generic (`<client>`/`<service>`/`<data-store>`). Thus, compare the
     **flow and its `alt` branches**, not the participant names.
   - A branch such as `alt not owner` must have a related error response.

If a **core** point (1–3) fails, or if there are **≥3 flags** of any kind in one run, pause the
run. Show the findings to the user before you write. If the **supporting** point (4) fails, write
a follow-up note in the report. Resolve each finding with the shared 4-state actions
([`../../_shared/ask-style.md`](../../_shared/ask-style.md)):

- **Accept as is** — record the difference as accepted (for example, an entity that is
  intentionally internal and has no endpoint). Then continue.
- **Fix the contract** — make the related operation or schema again, so that it agrees with the source.
- **Save as Open Question** — keep it for later, with an owner and a due date. The field or the
  endpoint stays with a `# unresolved` note until there is an answer.
- **Fix the source first** — STOP. The contract waits until the user corrects `data-model.md` or
  the sequence. (This skill never changes the sources.)
  - On a legal fast-lane skip, the "source" is the existing schema. A difference there usually
    means that the skip was NOT legal (the feature needs a column that does not exist).
  - Send it to `data-model <slug>`. Do not change the schema by hand.

## Reconcile semantics (`--reconcile`)

Run this after an upstream artifact changed. Usually, `data-model.md` arrived (or became stricter)
after a first pass with less data. The reconcile pass:

1. Reads all inputs again.
2. Makes the loose types stricter where the model now has a constraint. A bare `string` becomes
   `string` + `maxLength`. A free field becomes an `enum`.
3. Updates the confidence column of Section A (`low`/`medium` → `high` where a column now supports the field).
4. **Shows real drift**: each field that *had* an inferred origin but *now does not agree* with
   the model. This is the most important output. Each old incompleteness becomes resolved or
   becomes a real conflict. The two never get mixed.

`info.version` never increases here. The user increases the semver explicitly with a CHANGELOG line.

## Conflict table — human in the loop

| Conflict | Skill action |
|---|---|
| A field in `data-model.md` that no story in `spec.md` covers | Add it to the schema with a `# unused-in-spec` note in the report. Ask the user. |
| A §6 sequence has a flow that maps to no endpoint | Flag `# orphan-sequence` in the report. Ask (a forgotten endpoint? an internal job?). |
| A `spec.md` §5 constraint does not agree with a `data-model.md` constraint | Use the stricter value. Flag both. The person decides which artifact is wrong. |
| The existing `openapi.yaml` has a field that is absent from all sources | Keep it with a `# manual-addition` note. Flag it in the report. |
| A field disappeared from `data-model.md` | Keep it in the YAML with a `# stale` note. Show it. The person removes it from the contract or puts it back in the model. |

On a **legal fast-lane skip**, compare the `data-model.md` rows with the **existing schema**. The
contract can need a field that exists in *no* live migration. This is the most important flag. It
means that a schema change exists and that the skip was illegal → stop and run `data-model <slug>`.

If ≥3 flags occur in one run, pause and list them. Then ask if you must continue or fix the sources first.

## Defaults (deviation by ADR only)

These defaults are a fixed minimum. Do not make new defaults for each feature. An `adr/*.md` can
override each default. Then the report records "deviation by ADR-NNNN".

- OpenAPI **3.1.0** — nullability with `type: [string, null]`, never `nullable: true` (3.0 style).
- Error envelope **`{code, message, details?}`**, `code` = neutral `module.error_name` snake_case.
- **Cursor** pagination (`?after=&before=&limit=`) in the wrapper `{items, has_next, has_prev, next_cursor}`. Never offset.
- **URL** versioning (`/api/v1/...`). Never a `?v=2` query parameter.
- **BearerAuth** global. A public endpoint declares explicit `security: []`.
- `$ref` is mandatory for shared schemas. Use only placeholder data in `example` blocks (no real PII).
