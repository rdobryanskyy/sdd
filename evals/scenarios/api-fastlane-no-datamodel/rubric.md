# Rubric — api accepts the legal fast-lane skip (no data-model.md, no schema change)

The fixture contains these items:

- `spec.md` + `sad.md` (+ `.size` = S, `.route` = quick) for `delete-own-feedback`;
- live `migrations/` that define the existing `feedback` table;
- **NO** `docs/features/delete-own-feedback/data-model.md`.

The feature changes no schema (sad §5: no new building blocks/entities; no staged
`docs/features/delete-own-feedback/migrations/`).
PASS requires ALL of:

1. The run did NOT refuse and did NOT demand `data-model`. The final message contains no
   «run `data-model` … first» bounce. The run did not create a stub `data-model.md` only to
   satisfy a gate.
2. The run wrote `docs/features/delete-own-feedback/contracts/openapi.yaml`. This file defines
   the delete operation (a DELETE on a feedback resource). It also defines error responses
   other than the happy path (the not-owned / not-found branches from the sad §6 `alt`).
3. The sync report (`contracts/api-sync-report.md`) or the final message names the **legal
   skip**: data-model.md is absent + no schema change. It traces the field origins to the
   **existing schema** (for example, an origin like «existing schema — 000002_create_feedback»),
   not to invented columns.
4. The final message of the run ends with the stage-handoff block (*What I did* / *Review* /
   *Run next*). The block points to `/sdd:tasks delete-own-feedback`.

FAIL if the run refused or bounced to `data-model`. FAIL if it invented fields with no origin in
an input. FAIL if it wrote a `data-model.md` to satisfy the gate.
