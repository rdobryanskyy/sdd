# Rubric — classify-size

PASS requires ALL of:

1. `docs/features/tiny-toggle/.size` exists. Its content is exactly ONE bare token from
   {XS, S, M, L, XL} (no comments, no extra lines other than a trailing newline). This fixture
   is a clear one-line-config change, so XS or S are the sane classes.
2. `docs/features/tiny-toggle/.route` exists and is exactly one of {quick, standard, full}.
3. The final message of the run contains a stage-handoff block (What I did / Review before continuing /
   Run next — the utility variant: resume the backbone stage).

FAIL on a `.size` with more than one line or with annotations. FAIL on a missing or malformed
`.route`. FAIL if there is no handoff block.
