# Rubric — design batches commits on route quick + depth easy

The fixture contains only `spec.md` (+ `.size` = S, `.route` = quick) for `rate-limit-bump`. It
is greenfield: no source code and no `docs/architecture-map.md`. The step-6 Commit cadence of the
design skill gives this rule for route `quick` + depth `easy`:

- The skill still writes each section to disk when the section is resolved.
- The commits **batch — at most 3 for the pass** (or a single `design: <slug> sad (quick)`
  commit for a pass without interruption), after the step-4 bootstrap commit.
- The skill does not use the default commit for each section (that cadence gives ~12–14 commits).

PASS requires ALL of:

1. `docs/features/rate-limit-bump/sad.md` exists. Each of the 12 Arc42 sections (§1–§12) has
   content OR has an explicit `<!-- N/A: <reason> -->` marker. The frontmatter `target_surfaces`
   is not empty.
2. **Commit count (the key check).** Count the commits in the git log after the fixture
   commit `baseline`. There are **at most 4** in total: the step-4 bootstrap commit
   `design: … bootstrap sad.md` plus up to 3 batched section/finalization commits. Fewer
   commits are also a PASS. One or two commits after `baseline` (for example, a single
   `design: rate-limit-bump sad (quick)`) satisfy this item. **FAIL if there are 5 or more
   commits after `baseline`.** That result shows that the cadence for each section leaked into
   quick+easy.
3. The sections are really on disk. The file tree contains `sad.md` with its section content
   (committed, or visible in the uncommitted diff). The batched commits did not cancel the
   write-after-resolve behavior.
4. The tail of the final message of the run contains the stage-handoff block (*What I did* /
   *Review* / *Run next*). *Run next* points to a next SDD stage: `/sdd:sequences
   rate-limit-bump`, or an auto-skip to `/sdd:data-model rate-limit-bump` or
   `/sdd:api rate-limit-bump`. ANY of these is legal on route quick. Do not require one
   specific stage.

FAIL if there are 5+ commits after `baseline`. FAIL if `sad.md` is missing, or if it has
sections without content and without an `<!-- N/A: … -->` marker. FAIL if the final message
does not have the handoff block.
