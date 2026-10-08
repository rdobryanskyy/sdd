# Rubric — specify happy path

PASS requires ALL of:

1. `docs/features/rate-limit-bump/spec.md` exists and contains the eight spec sections §1–§8
   (Context, Goals, Non-goals, User stories, Acceptance criteria, NFR, KPI, Open questions).
   The sections have numbered headings or clearly equivalent headings.
2. The §5 acceptance criteria are business-observable. §5 contains no HTTP verbs, no URL
   paths, no status-code numbers and no SQL fragments.
3. `docs/features/rate-limit-bump/.size` exists and its content is exactly one token from
   {XS, S, M, L, XL}. If the run wrote `.route`, it is exactly one of {quick, standard, full}.
4. The final message of the run ends with a stage-handoff block. The block has these parts:
   - a "What I did" part;
   - a "Review before continuing" part that lists real `docs/features/rate-limit-bump/...` paths;
   - a "Run next" part that names the next `/sdd:` command.

FAIL if spec.md is missing. FAIL if a section is absent without an explicit N/A. FAIL if an AC
leaks implementation tokens. FAIL if `.size` is malformed. FAIL if the run printed no handoff block.
