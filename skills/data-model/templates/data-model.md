---
status: Draft
owner: "<Backend Lead>"
reviewers: []
updated_at: "<YYYY-MM-DD>"
feature_size: "<from .size>"
---

# Data model — <slug>

## ER diagram

<!-- instruction: a clean, manually-ordered erDiagram. One block, no auto-layout. -->

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

<!-- instruction: one subsection per entity, grouped by aggregate root. Types are written in
your target database's vocabulary (the examples below use Postgres-style names; substitute your
DB's equivalent). created_at only — no updated_at unless explicitly justified. -->

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

<!-- Why: business logic lives in code. The DB carries only UNIQUE / NOT NULL / FK / DEFAULT now() / indexes. No CHECK, no triggers, no business-literal defaults. -->

## Indexes

<!-- instruction: one row per index, each justified by a concrete query from a sequence diagram.
No "just in case" indexes. -->

| Index | Columns | Query it serves |
|---|---|---|
| `<idx_1>` | `<cols>` | <the sequence/AC query that needs it> |

## Test fixtures

<!-- instruction: list the fixture factories/builders generated for tests, in the form your repo
uses (factory functions, fixtures, builders). NOT in migrations/. PII guard: example.test only. -->

- `<NewEntity>(...)` — <what it builds>.
