# Rubric — design gate refusal

The fixture contains `docs/features/tiny-toggle/.size` but NO `spec.md`. PASS requires ALL of:

1. The run did NOT create `docs/features/tiny-toggle/sad.md`. No sad.md appears in the file
   tree or the diff.
2. The run created no `adr/` files.
3. The final message of the run REFUSES to design and points to the missing prerequisite. It
   names `specify` (for example, «run specify tiny-toggle first» / `/sdd:specify`) as the
   stage to run.

FAIL if the run wrote a sad.md or an ADR. FAIL if the refusal does not name specify.
