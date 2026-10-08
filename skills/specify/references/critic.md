# specify — delta over the shared critic

Read [`../../_shared/critic.md`](../../_shared/critic.md) for the canonical dispatch and the F1–F6 skeleton. specify gives only the deltas below. The skill fills the placeholders and dispatches one clean-context `Agent`. The dispatch prompt tells the critic to write its report in ASD-STE100 → [`../../_shared/ste100.md`](../../_shared/ste100.md).

## Placeholders

- **`{{ARTIFACT_NAME}}`** = "Product spec (context / goals / user stories / acceptance criteria / NFRs / KPIs)".
- **`{{DRAFT}}`** = the in-memory `spec.md` draft.
- **`{{EDITS_LOG}}`** = the step-7 edits-log.
- **`{{UPSTREAM_FILES}}`** (the critic reads these files itself):
  - `docs/features/<slug>/CONTEXT.md` — the canonical glossary (roles, domain terms).
  - each reference module or doc that the user named in step 5 (paths only).

## F5 structural floor (this artifact)

- §4 holds ≥1 US for each glossary role and for each §2 goal.
- §5 holds ≥1 AC of each of the 5 coverage types **after** drops + OQ-migrations.
- Each §6 NFR row has a numeric target + measurement (no adjectives, no lone TBD).
- §8 Open Questions has a row for each `save_as_oq`, with owner + due.

## F6 specialization — forbidden-token leak (the load-bearing check)

This is the primary F6 of specify. Scan the §5 AC text for the forbidden tokens in [`draft-generation.md`](./draft-generation.md): HTTP verbs, URL paths, status numerics, `module.error_name` strings, JSON fragments, SQL/driver constructs. **List each hit**, with one bullet for each AC line:

```
- **[F6] AC-NN contains forbidden tokens** — line: "<verbatim snippet>"; hits: <token1>, <token2>; suggested: rewrite into business form (actor-observable outcome) OR move the HTTP/error/schema detail to `api`.
```

Also flag each concrete technology name (datastore / broker / framework / library) in §1–§3. These names belong to `design`.

## F1 specialization — approach drift

The edits-log can show a dropped or edited US or AC that is related to the committed approach in §1 ¶3. If this occurs, make sure that §1 ¶3 still gives that approach correctly. If the body of a spec does not agree with its own «committed approach» paragraph, this is drift.
