# Rubric — api hard-refuses when data-model.md is missing AND a schema change exists

The fixture contains these items:

- `spec.md` + `sad.md` (+ `.size` = S, `.route` = quick) for `feedback-reactions`;
- live `migrations/` that define the existing tables;
- **NO** `docs/features/feedback-reactions/data-model.md`.

This feature is different from the fast-lane twin: it CHANGES the schema. Sad §5 declares a new
`reaction` entity (`feedback_reactions` table). A **staged** migration is at
`docs/features/feedback-reactions/migrations/01_create_feedback_reactions.up.sql`
(+ `.down.sql`). This is the hard-refuse branch of the three-way gate of api. PASS requires ALL of:

1. The run REFUSED and points to the missing prerequisite. The final message names
   `data-model` for this slug (for example, «run `data-model feedback-reactions` first» /
   `/sdd:data-model feedback-reactions`) as the stage that must run before the run can derive
   the contract.
2. The run made no contract artifact. `docs/features/feedback-reactions/contracts/openapi.yaml`
   does not appear in the file tree, the git log or the diff. No `contracts/` directory
   appears. The same applies to `api-sync-report.md` and `events.md`.
3. The run did NOT create `docs/features/feedback-reactions/data-model.md` itself (or a stub of
   it) in the tree, the log or the diff. The gate points to the upstream stage. The run never
   makes the upstream artifact itself.

FAIL if the run wrote a contract file. FAIL if the refusal does not name `data-model`. FAIL if
the run wrote a data-model.md to satisfy its own gate.
