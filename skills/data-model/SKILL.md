---
name: data-model
model: inherit
effort: medium
agents: [explorer]
description: >
  Use to design the data model AND make the forward + rollback migrations in one pass. The output
  is shippable SQL, not a plan. Triggers on "data model for {slug}", "schema for {slug}",
  "generate migrations for {slug}", "DB design + migration", "/sdd:data-model {slug}",
  "data model for {slug}", "schema for {slug}", "generate migrations". Reads spec.md §5, the
  sad.md §5 building blocks and the §6 sequence diagrams. Then writes docs/features/{slug}/data-model.md,
  paired *.up.sql / *.down.sql migrations and an audit report. The migrations are STAGED under
  docs/features/{slug}/migrations/ (NOT the live migrations/ tree). implement promotes them when
  the team builds the feature. Greenfield-first; brownfield delta with --mode brownfield; drift
  only with --drift-only. Hard-refuses if spec.md or sad.md is missing. Stack-agnostic: it finds
  and FOLLOWS the DB + migration conventions and the domain layer of the repo. It applies no DB
  philosophy and writes no rules file.
---

# Skill: data-model

This skill does the full persistence step in one pass: data model, migrations and drift check.

- The default is greenfield-first. For a brownfield delta, use `--mode brownfield`.
- The output is **shippable**: full `.up.sql` + `.down.sql`, not a plan.
- But the output is **staged under `docs/features/<slug>/migrations/`. Never write it into the live `migrations/` tree.**
- `implement` **promotes** the staged pair into `migrations/` only when the team builds the feature. At that time, it gives the real sequence number or timestamp.

This is deliberate. `data-model` is a design stage, four steps before `implement`. A stray `migrate up` (the loop of a teammate, CI, a deploy) must not apply a schema that is only half designed to a real database. (The drift fixes use the same staging discipline under `_drift/`.)

**This skill is stack-agnostic by design. It applies no DB philosophy and writes no rules file.**

- `data-model` **gets the DB + migration conventions from the architecture** and **follows** them. The sources are:
  - `architecture-map.md` (the migration tool and naming that `survey` recorded);
  - the `sad.md` persistence decisions (§4 strategy / §5 building blocks / §8 crosscutting);
  - the Accepted ADRs.
- The live `migrations/` and schema **corroborate** these sources. They also fill each item that the architecture did not state.
- On a greenfield repo with no signal from the architecture, the skill **confirms each schema choice with the user** (Socratic). It does not use a house style as the default.
- On each stack, it applies migration **safety**: staging, reversibility, FK indexes, zero-downtime decomposition, no PII.
- It never takes a position on `updated_at` or not, hard or soft delete, UUID or sequence, or if `CHECK` constraints are permitted.
- The size matrix (→ [`../_shared/size-matrix.md`](../_shared/size-matrix.md)) controls how much you make. The dialogue about aggregate roots uses [`../_shared/ask-style.md`](../_shared/ask-style.md).

The prose of `data-model.md` follows `artifact_language`. SQL, table and column identifiers, headings and frontmatter stay English → [`../_shared/artifact-language.md`](../_shared/artifact-language.md).

English prose (artifacts, questions, reports, handoff) follows ASD-STE100 Simplified Technical English → [`../_shared/ste100.md`](../_shared/ste100.md).

## Owner

Backend Lead.

## Inputs

- `<slug>` — the feature slug.
- **Gate (hard refuse if missing):**
  - `docs/features/<slug>/spec.md` (the entities are in the §5 acceptance criteria);
  - `docs/features/<slug>/sad.md` (the entity candidates: the §5 building blocks, which are the persistence containers, and the §6 persist notes).
  - If one is missing → «run `specify` / `design` first».
- Optional: the sequence diagrams in `sad.md §6`. Each `writes/reads <entity>` note is an index candidate (one index for each query, with a reason).
- (Expected) The `sad.md` frontmatter key `target_surfaces`. It tells which containers persist which data.
  - **If it is absent or empty, warn** («surfaces undeclared — re-run `design`, or proceeding as `backend-service`») **and use `[backend-service]`** (→ [`../_shared/surfaces.md`](../_shared/surfaces.md)).
- **Convention source:** `docs/architecture-map.md` §Migrations (from `survey`), the `sad.md` persistence decisions (§4/§5/§8) and the Accepted ADRs.
  - The migration tool, the naming and the DB approach **come from these sources**. Do not make them up.
  - The map also gives the module layout, so you do not scan the repo again.
  - For **drift detection**, `explorer` still reads the **actual domain layer**. The map gives the layout, but drift needs the real source of the structs and fields.
  - When you dispatch `explorer`, tell it to write its report in ASD-STE100.
  - The skill is stack-agnostic. It has no hard-coded path or language.

## Conventions — detect and follow (stack-agnostic)

`data-model` applies **no** DB philosophy. For each topic below, it **follows the decision of the architecture**: `architecture-map.md` §Migrations, the `sad.md` persistence decisions and the Accepted ADRs. The existing migrations and schema of the repo corroborate this decision. On a greenfield repo with no signal, it **confirms the choice with the user**. It never makes a house style into a rule.

| Topic | How `data-model` decides |
|---|---|
| Naming (tables / columns) | Follow the convention of the repo (found in the existing migrations and schema). Greenfield → confirm. |
| PK strategy | Follow the repo (UUID / bigint-identity / sequence / composite — the one that it uses). Greenfield → confirm. |
| Audit columns (`created_at` / `updated_at` / …) | Use the same pattern as the repo. Greenfield → confirm. The skill takes no position. |
| Delete strategy (hard / soft / status) | Use the same strategy as the repo. Greenfield → confirm. |
| Constraints (`CHECK` / `TRIGGER` / DB `DEFAULT`) | Use them **only if the repo uses them**. Never add them or forbid them as a rule. |
| String / JSON types | Use the same norms as the repo (`VARCHAR(N)` / `TEXT` / JSON). Greenfield → confirm. |

The skill **applies these items on each stack**. They are migration **safety**, not DB philosophy:

| Mechanic | Why (stack-agnostic) |
|---|---|
| **Staged** as `docs/features/<slug>/migrations/<NN>_<verb>_<entity>.up.sql` + `.down.sql` (NN = ordinal in the feature). `implement` promotes the pair and gives the real number or timestamp at that time. | The live tree has no schema that is only half designed. A late number prevents collisions from an early number. |
| Idempotent DDL where the tool supports it (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING` on seeds) | If you run a migration again after it was applied partially, it gives no error. |
| A `.down` for each `.up` (full reversibility) | A rollback is always possible. |
| An index on each FK, and one index for each real query (from the sequences) | Usual performance hygiene. No indexes "just in case". |
| A breaking change on an existing table → expand → backfill → contract | Zero downtime, on each DB. |
| No PII that looks real in seeds (`example.test`) | Safety. |

## Protocol

1. **Check the prerequisites (hard).** `spec.md` and `sad.md` must both be present. If one is missing, refuse and point to the missing file.
2. **Get the conventions from the architecture (read-only — never write a rules file).**
   - **First**, read these sources. They select the migration tool, the naming and the DB approach (PK / audit / delete / constraints):
     - **`architecture-map.md` §Migrations** (the tool and naming that `survey` recorded);
     - the **`sad.md` persistence decisions** (§4 strategy / §5 building blocks / §8 crosscutting);
     - the **Accepted ADRs**.
   - **Corroborate** them with the live `migrations/` folder and schema (Explore or `ls`). Use the live files for each item that the architecture did not state. Examples: the rules for statements in each file (golang-migrate uses one transaction for each file), the next sequence value.
   - Record the migration naming as a **promote-time hint** in the audit report. Example: «sequential, next ≈ `000023` — `implement` assigns the real number at promotion, since another feature may promote first».
   - On a **greenfield** repo with no signal from the architecture, confirm the schema choices with the user (steps 4–6). Do not use a house style as the default.
   - **Do not select a final number. Do not write into the live `migrations/`. Do not apply a convention that the architecture or the repo does not use.** Staging occurs in step 9. Promotion occurs in `implement`.
   - If the architecture and the repo do not agree, flag this in the report.
3. **Read the prerequisites in this sequence:**
   1. spec §5 (the entity candidates from the ACs);
   2. sad §5 building blocks (the persistence containers — which container owns which data);
   3. the `sad.md §6` sequences (each `writes/reads <entity>` note → an entity candidate and an index candidate);
   4. (optional) the domain layer that Explore found, for a map of structs to DDL.
4. **Aggregate roots.** Ask (or get from the ACs) which aggregate roots own which data. Without explicit aggregates, the FK graph becomes too complex. Use the phrasing in [`../_shared/ask-style.md`](../_shared/ask-style.md).
5. **PK strategy.** Follow the PK convention that you found in the repo. On greenfield, confirm with the user: UUID, bigint-identity, sequence, composite, or a different one that fits. Also confirm if an AC demands a specific PK, for example a lookup slug. The skill applies no default.
6. **Columns + constraints** for each entity. **Use the same conventions as the repo:**
   - string and JSON types from the norms of the repo (`VARCHAR(N)` with a size from the validation limits in the ACs / `TEXT` / JSON);
   - audit columns (`created_at` / `updated_at` / none) from the pattern of the repo;
   - `CHECK` / DB `DEFAULT` / triggers **only if the repo uses them**;
   - `<!-- TBD -->` where a decision is really open.
   - On greenfield, confirm these items with the user.
7. **One index for each query.** Each sequence note becomes one index candidate. Remove the candidates that have no concrete query. Write a "Query it serves" column with the reason.
8. **Write `docs/features/<slug>/data-model.md`** from [`./templates/data-model.md`](./templates/data-model.md).
   - Write an ER Mermaid block (clean, in order), entity tables for each aggregate and an indexes table.
   - **Validate the `erDiagram`. Obey [`../_shared/mermaid-check.md`](../_shared/mermaid-check.md).** If `mmdc` is available, parse with it. If not, use the structural lint: valid cardinality glyphs and `type name` attribute lines.
   - If the diagram is not valid, fix it before you continue.
9. **Make the migration files. STAGE them in the feature folder, not in the live tree.**
   - A run can find **no schema change**. Then it makes a minimal `data-model.md` (it documents the existing entities that the feature touches) with **zero** staged migrations. This is a valid result, not a failure. Write a note that `api` also accepts the fast-lane skip (→ [size-matrix fast lane](../_shared/size-matrix.md)).
   - Write the pairs into **`docs/features/<slug>/migrations/`**. Use a name with an **ordinal in the feature** (`01_create_<entity>.up.sql` + `.down.sql`, `02_…`). The ordinal keeps the sequence in the feature.
   - The SQL is full and shippable. Only the location and the final number are different from a live migration.
   - **Never write into the live `migrations/` of the repo at this step.** `implement` promotes these files when it runs the `layer: migration` task. It gives the real sequence number or timestamp from the convention of step 2, in ordinal order.
   - The rules for the SQL content do not change:
     - **Greenfield:** one create-`<entity>` `.up.sql` + `.down.sql` for each entity (or for each small aggregate). Use `IF NOT EXISTS` at all locations. Use `ON CONFLICT DO NOTHING` on seeds.
     - **Existing-table index:** use the concurrent form that does not block. **If your migration tool puts each file in a transaction** (for example, golang-migrate), warn that the file must contain only that one statement.
     - **New NOT NULL on an existing table / rename / drop:** write the 3-step sequence expand→backfill→contract (in different ordinal files). The user reviews the backfill SQL.
10. **Seeds (3 buckets).**
    - Bootstrap (deterministic hardcoded UUID v7) → the first migration.
    - Lookup data → a different migration with `ON CONFLICT DO NOTHING`.
    - Test fixtures → **NOT** in `migrations/`. Make them in the form that the repo uses (factory functions / fixtures / builders). Document them under "Test fixtures".
    - **PII guard (hard):** put no email, name or phone that looks real in a seed. Use `admin@example.test`, `user-<uuid>@example.test`, `Test User`.
11. **Drift detection (always; `--drift-only` stops the run here).** If the Explore subagent found a domain layer, map each field to a column. Report `field-without-column` / `column-without-field` / `type-mismatch` / `nullability-mismatch`. Automatically propose fix migrations under `_drift/` for the user to review.
12. **Self-check (4 mandatory checks, stack-agnostic).**
    - **Naming** agrees with the convention of the **repo**.
    - **Down reversibility:** each CREATE has a DROP, each ADD COLUMN has a DROP COLUMN, each CREATE INDEX has a DROP INDEX.
    - **FK indexes:** each `REFERENCES other(id)` has an index on the FK column.
    - **Convention adherence:** the schema follows the conventions that you found in the repo. Flag each deliberate divergence in the report. Never apply a house style silently.
    - If a check fails, fix it or show it. Never commit silently.
13. **Audit report** `docs/features/<slug>/_audit/data-model-<date>.md`. Write these items:
    - the **staged** migration files (their paths `docs/features/<slug>/migrations/<NN>_*`);
    - the **promote-time convention hint** (for example, «repo is sequential, next ≈ `000024` — `implement` assigns the real number at promotion»);
    - the convention deviations;
    - the drift findings;
    - the breaking-change decompositions;
    - each `<!-- TBD -->`.
    - Write this clearly: «migrations are staged — not yet in the live `migrations/` tree; `implement` promotes them». The next stage is `api <slug>`.
14. **Propose the commit and the handoff.**
    1. Propose the commit `data-model: <slug> (data-model.md + staged migrations)`.
    2. **Emit the stage-handoff block**. Obey [`../_shared/handoff.md`](../_shared/handoff.md). Write *What I did*, *Review* (`data-model.md`, staged `migrations/`) and *Run next*.
    3. **Find the next stage from `.route`** (the Routes table in [`../_shared/size-matrix.md`](../_shared/size-matrix.md)):
       - The forward stage is `/sdd:api <slug>`.
       - The N/A condition of `api` is **no contract change**: no new or changed endpoint, event or public signature. The skip target is `/sdd:tasks <slug>`.
       - On `quick`, skip automatically. Give the reason and the inverted `↳ or`.
       - On `standard`, offer the `↳ or`.
       - On `full`, write no skip line.

## Definition of Done

- `data-model.md` exists. It has the ER diagram, each entity and each index with a query reason.
- Each entity or change has a matched `.up.sql` + `.down.sql` pair **under `docs/features/<slug>/migrations/`** (staged, with ordinal names in the feature). **The skill wrote nothing into the live `migrations/` tree** (that is the promotion step of `implement`). The SQL still follows the convention that you found in the repo.
- All 4 self-checks pass.
- The audit report is written (with the staged paths and the promote-time number hint). If you found drift, the drift report is written (with `_drift/*.sql`).
- The step-12 check (4 mandatory items) and the step-11 drift detection are the **structural self-check** of this skill ([`../_shared/self-check.md`](../_shared/self-check.md)). The handoff gives its result.

## Anti-patterns

- **A DB philosophy that the repo (or the user) did not ask for.** Examples: UUID v7 / hard delete / no `updated_at` / no `CHECK` on a repo that uses different patterns. Or a `.claude/rules/migrations.md` that makes one into a rule. `data-model` **finds and follows** the conventions of the repo. If a repo uses `CHECK` constraints or `updated_at`, use them too.
- **An index "just in case"** with no concrete query. Each index makes writes slower.
- **One very large migration with 5 ALTERs.** Then the rollback is all or nothing. Split it.
- **DROP COLUMN before you deploy the new code.** This breaks the pods that run between the phases. Always use the 3 steps.
- **PII that looks real in seeds.** Use `example.test`.
- **A migration in the live `migrations/` tree at design time.** This puts a runnable schema that is only half designed where a stray `migrate up` (CI, the loop of a teammate, a deploy) can apply it. This can occur before the team builds or reviews the feature. It also takes a sequence number early, and it collides with other features in progress. Stage it under `docs/features/<slug>/migrations/`. `implement` promotes it (with the real number) when the team writes the code that needs it.
- **A silent change to the migration naming convention of the repo.** Find it, follow it and flag it in the report.
- **Live DB introspection with no offline fallback.** CI has no DB credentials. Parse the SQL files.

## References & template

- [`./templates/data-model.md`](./templates/data-model.md) — the output structure for the design doc.
