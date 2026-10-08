# specify — delta over the shared Socratic loop

Read [`../../_shared/socratic-loop.md`](../../_shared/socratic-loop.md) for the canonical 4-state machine, the edits-log and the disk-write discipline. specify gives only the deltas below.

## Sections walked (in order)

§4 User stories → §5 Acceptance criteria → §6 NFR → §7 KPIs. The skill drafts and shows §1–§3, but it does not examine them item by item. These sections have no decision set. If necessary, the user edits them inline.

## Decision-types

- **User story** (§4) — Approve / Edit / Drop / Save-as-OQ. If the user drops a US that owns the only AC of a coverage type, the §5 coverage gate starts.
- **Acceptance criterion** (§5) — the 4-state machine **plus a 5th option «Add another AC»**. The user dictates a new AC. The skill drafts it in business form and runs a one-question mini-batch on it. If a drop or an OQ-migration removes the **last AC of a retained §4 user story**, the use-case floor below starts (generate an AC for that US).
- **NFR row** (§6) — Approve / Edit (change the number or the measurement) / Save-as-OQ (the number is TBD, with owner+due). The user can never Approve a bare adjective («fast»). Get a number or an OQ.
- **KPI** (§7) — Approve / Edit / Drop. If baseline=TBD, an inline measurement plan or an OQ is necessary.

## Per-skill gate — §5 coverage floors (two, both re-checked after every resolution)

After each §5 resolution, check **the two floors** below again. OQ-migrated AC do NOT count for the floors, because they are in §8 now. The two floors are the specify equivalent of the blast-radius gate of `design`. They apply at each interview depth.

1. **Coverage-type floor.** After drops and OQ-migrations, ≥1 AC of each of the 5 coverage types (happy / error / authorization / domain invariant / cross-context) must stay. If a type is empty, generate a replacement AC of that type and run a one-question mini-batch.
2. **Use-case floor (§4 US → ≥1 §5 AC).** **Each *retained* §4 user story must still have ≥1 acceptance criterion.**
   - If a Drop or an OQ-migration leaves a retained US with no AC, generate an AC for that US (or use the «Add another AC» option). Then run a one-question mini-batch.
   - A user story with no AC is not complete. It silently breaks the downstream `sequences` use-case coverage and the end-to-end trace of `review`.
   - If the user drops the **whole** US, this is a correct de-scope, and this floor does not start. Only a retained US that loses its last AC starts this floor.
   - This floor also applies at **draft time**. If the first §5 draft gave no AC to a §4 US, add one before the walk starts.

## Open-Questions table

`save_as_oq` rows go into **§8 Open questions** as a checkbox line: `- [ ] <headline>? — owner: <…>, due: <…>`. Owner + due are mandatory. If one of the two is missing, the row becomes a Drop.
