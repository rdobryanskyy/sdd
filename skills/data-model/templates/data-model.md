---
status: Draft
owner: "<Backend Lead>"
reviewers: []
updated_at: "<YYYY-MM-DD>"
feature_size: "<from .size>"
---

# Data model — <slug>

## ER diagram

<!-- instruction: a clean erDiagram that you put in order manually. One block, no auto-layout. -->

```mermaid
erDiagram
    <PARENT> ||--o{ <ENTITY> : has
    <ENTITY> {
        uuid id PK
        varchar name
        timestamptz created_at
    }
```

## Entities

<!-- instruction: one subsection for each entity, grouped by aggregate root. Write the types in
the vocabulary of your target database. The examples below use Postgres-style names. Use the
equivalent names of your DB. The examples are ILLUSTRATIVE, not mandates. The PK type, the audit
columns (created_at / updated_at / none) and the constraint usage follow the conventions of the REPO. -->

### `<entity>`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, app-generated (UUID v7) | <...> |
| `<col>` | VARCHAR(N) | NOT NULL | bound N from a spec §5 validation limit |
| `<fk>_id` | UUID | NOT NULL, FK → `<other>(id)` | indexed below |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |

**Aggregate root:** <which entity owns this one, or "root">.
**Access patterns:** <pattern> → index `<idx_name>` on `<columns>`.
**Constraints:** UNIQUE on `<...>`; FK → `<other>(id)`.

<!-- The constraint set (UNIQUE / NOT NULL / FK / DEFAULT / CHECK / triggers) follows the conventions
of the REPO. Do the same as the codebase does now. data-model does not apply a style and does not forbid a style. -->

## Indexes

<!-- instruction: one row for each index. A concrete query from a sequence diagram is the reason
for each index. No "just in case" indexes. -->

| Index | Columns | Query it serves |
|---|---|---|
| `<idx_1>` | `<cols>` | <the sequence/AC query that needs it> |

## Test fixtures

<!-- instruction: list the fixture factories/builders that you made for tests. Use the form that
your repo uses (factory functions, fixtures, builders). NOT in migrations/. PII guard: example.test only. -->

- `<NewEntity>(...)` — <what it builds>.
