---
name: ship
model: inherit
effort: medium
agents: []
description: >
  Use to close the loop after review. Make sure that the feature really works, write the changelog /
  knowledge-base note, and open the pull request. Triggers on "ship {slug}", "open a PR for {slug}",
  "changelog for {slug}", "prepare {slug} for merge", "/sdd:ship {slug}", "ship feature {slug}",
  "create a PR for {slug}", "changelog for {slug}". Runs the gate again. Runs the app/feature to make
  sure of the outcomes of the spec in reality (not only green tests). Writes a changelog and a PR body
  that link spec/AC/ADRs. Proposes the PR command for the forge of the repo. Never auto-merges to main.
---

# Skill: ship

This skill is the closing step. `review` showed that the change is correct on paper. `ship` makes sure that the change **works in reality**, and prepares it for merge. The loop stops here. The result is a reviewed, verified change with a changelog and an open PR. It is not a merge to main, because that stays a human decision.

This skill does not depend on a forge or a stack:

- It finds the verification commands the same way as `implement` finds them.
- The PR step uses the forge of the remote: GitHub through `gh`, GitLab through `glab`, or copy-paste.

The prose of the changelog and the PR body follows `artifact_language`. Commit messages, branch names and the `SDD-Task`/`SDD-AC` trailers stay English → [`../_shared/artifact-language.md`](../_shared/artifact-language.md).

English prose (artifacts, questions, reports, handoff) follows ASD-STE100 Simplified Technical English → [`../_shared/ste100.md`](../_shared/ste100.md). This includes the English changelog entry, the commit message and the PR body.

## Owner

The implementer (who controls the step) and the reviewer who approved the change in `review`.

## Inputs

- `<slug>` — the feature slug.
- **Gate (hard refuse):** a `PASS` review record (`docs/features/<slug>/_review/`). As a minimum, an implemented change with a green gate. If there is no review, say «run `review <slug>` first».
- Read these files:
  - `spec.md` — what to claim in the changelog.
  - Accepted `adr/` — the decisions to record.
  - The commits of the feature — the `SDD-Task` history.

## Protocol

1. **Final verification — does it really work.**
   - Run the detected gate again (unit + integration where available + lint + vet).
   - Then **run the real feature** against its acceptance criteria. "Tests pass" is not enough. Start the app, send a request to the endpoint, or exercise the flow. Observe the outcomes of the spec. For example, the default-on read returns defaults, and the app rejects an invalid value.
   - **Spot-check a minimum of 3 of the most critical §5 AC outcomes.** If the spec has fewer ACs, check fewer. Make the count larger for a broader feature.
   - For each check, name the AC id and the behavior that you observed. Example: «AC-03: posted the same apply twice → one discount row». Then a person can examine the verification. It is not only a feeling.
   - If you cannot run the app here (no runtime, no Docker), say so explicitly. Record what you verified and what you deferred. Never claim verified-working when only the tests compiled.
2. **Write the changelog / KB note.** Use [`./templates/changelog.md`](./templates/changelog.md). Write these items:
   - What changed.
   - Why (link the spec and the key ADRs).
   - Each migration or operational note. Example: "adds migration 000023 — run it on deploy".
   - How to use it.

   If the change is partner-facing, write the note for partners. Write the English changelog entry in ASD-STE100.
3. **Prepare the PR.** Make sure that the work is on a feature branch (not the default branch). Write the PR body from [`./templates/pr-body.md`](./templates/pr-body.md). It contains the summary, the AC that it satisfies, links to spec/sad/ADRs, the `SDD-Task` commit list, the test and verification evidence, and each migration/rollback note. Write the English PR body and each commit message in ASD-STE100.
4. **Find the forge and propose the PR command.** Examine the remote:
   - `github.com` → `gh pr create`.
   - `gitlab.com`/self-hosted GitLab → `glab mr create`.
   - Other → print the branch and the body for manual creation.

   **Propose** the command. Do not push or open a PR to a shared remote without the approval of the user. Never merge to main.
5. **Update the roadmap.** Through `roadmap`, move the item of this feature to **Shipped** in `docs/roadmap.md`. Add the date, the outcome, a link to the feature folder and the PR/changelog. Remove the item from **Now**. This is the anti-drift hook: the delivery itself keeps the roadmap current. If there is no roadmap, skip this step, because the roadmap is optional.
6. **Summary (terminal handoff).** **Emit the stage-handoff block** as [`../_shared/handoff.md`](../_shared/handoff.md) specifies (terminal variant). It contains:
   - *What I did* — the verification result (verified-working / what you deferred and why) and the roadmap update.
   - *Review* — the changelog path and the PR.
   - *Run next* = **Done** — the PR command (or the URL, if the user ran it). The merge to main is the decision of the user. There is no next `/sdd` stage.

## Definition of Done

- The gate ran again, and the feature was exercised against its AC. Or the deferral was stated explicitly with the reason.
- A changelog / KB note exists, with links to the spec and the ADRs.
- A PR body is ready, and the PR command for the forge is proposed. The work is on a feature branch, and main has no changes.
- The run-the-feature verification (a real run against the ACs, not only green tests) is the **structural self-check** of this skill ([`../_shared/self-check.md`](../_shared/self-check.md)). The handoff reports its result.

## Anti-patterns

- **"Tests pass" ≠ "it works".** Run the real feature against the outcomes of the spec. Green unit tests do not prove that the connected system operates correctly.
- **You claim verified when you only compiled.** If the runtime or Docker was not available, say what you deferred. Do not claim more than you did.
- **You auto-merge to main, or push to a shared remote, when the user did not ask.** Propose the PR. The merge is the decision of the team.
- **A changelog that only repeats the diff.** Say what changed and why (link the spec and the ADR). Add the operational note (migrations, flags). Do not write a file list.
- **You forget the migration/rollback note** when the change has one. The deployer must have it.

## References & template

- [`./templates/changelog.md`](./templates/changelog.md) — the scaffold for the changelog / KB note.
- [`./templates/pr-body.md`](./templates/pr-body.md) — the scaffold for the PR description.
