# specify — delta over the shared Socratic loop

Read [`../../_shared/socratic-loop.md`](../../_shared/socratic-loop.md) for the canonical 4-state machine, edits-log, and disk-write discipline. specify supplies only the deltas below.

## Sections walked (in order)

§4 User stories → §5 Acceptance criteria → §6 NFR → §7 KPIs. §1–§3 are drafted and shown but not per-item walked (they have no decision set — the user edits them inline if needed).

## Decision-types

- **User story** (§4) — Approve / Edit / Drop / Save-as-OQ. Dropping a US that owns the only AC of a coverage type triggers the §5 coverage gate.
- **Acceptance criterion** (§5) — the 4-state machine **plus a 5th option «Add another AC»** (user dictates a new AC; skill drafts it in business form and runs a one-question mini-batch on it).
- **NFR row** (§6) — Approve / Edit (change the number or measurement) / Save-as-OQ (number is TBD, owner+due). A bare adjective («fast») is never Approvable — force a number or an OQ.
- **KPI** (§7) — Approve / Edit / Drop. baseline=TBD forces an inline measurement plan or an OQ.

## Per-skill gate — §5 coverage floor

After every §5 resolution, check that ≥1 AC of each of the 5 coverage types (happy / error / authorization / domain invariant / cross-context) still stands **after** drops and OQ-migrations (OQ-migrated AC do NOT count — they live in §8 now). If a type is empty, regenerate a replacement AC of that type and run a one-question mini-batch before moving on. This is the specify analogue of `design`'s blast-radius gate.

## Open-Questions table

`save_as_oq` rows land in **§8 Open questions** as a checkbox line: `- [ ] <headline>? — owner: <…>, due: <…>`. Owner + due mandatory; missing either downgrades to Drop.
