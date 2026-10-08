---
slug: <slug>
date: <YYYY-MM-DD>
triage: <regression | spec-bug | gap | no-spec>
acs: [<AC-NN>]            # the AC(s) traced; empty list for no-spec
commit: <sha>             # filled after the fix commit lands
recurrence_of: <none | _fixes/<date>-<short>.md>
---

# Fix: <one-line symptom>

## Symptom

<!-- The reproduction statement from intake, verbatim: «doing X, expected Y, got Z».
     Also the scope: who sees it (one user / all), and since when (release, commit, date). -->

## Root cause

<!-- 2–4 sentences: the mechanism, the file:line, and why the existing tests did not find it
     (no test at that level? an assertion that is too weak? a branch without a test?). -->

## The pinning test

<!-- Test name + level (unit / integration / e2e) + the failing line QUOTED from the RED
     run. This is the proof that the test failed for the correct reason before the fix. -->

## Spec patch

<!-- Write one of these, per the triage branch:
     (a) regression: «none — spec was right; AC-NN re-verified»
     (b) spec-bug:   the AC wording, before → after
     (c) gap:        the new AC text added to §5 (with its added-by-fix marker)
     no-spec:        «no spec to patch — brownfield; survey recommended» -->

## Follow-ups

<!-- The refactors / adjacent risks that the fix showed but did NOT touch on purpose (the fix
     commit stays minimal). Write each one as one line that a person can act on. Or «none». -->
