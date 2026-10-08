# Contributing to SDD

## Adding or editing a skill

A skill is in `skills/<name>/`. It is the **source of truth** for its stage.

1. **`SKILL.md` is a short spine.** Start with the frontmatter: `name` + a third-person
   `description` with 3–5 trigger phrases (EN plus 2–3 UA). Then write a numbered Protocol. Keep
   the file short. The target is much less than ~140 lines. Put heavy detail in `references/`. Put
   output scaffolds in `templates/`.
2. **Do not copy shared logic.** These items are in `skills/_shared/` one time only: the 4-state
   Socratic machine, the clean-context critic, the size matrix and the `AskUserQuestion` style.
   Refer to them with a relative link. Keep only a short **delta** for each skill (your
   decision-types, your section list, your F6 specialization).
3. **Stay stack-agnostic.** Do not hard-code a language, a tracker, a test framework or a load tool.
   Detect what the repo uses, or name the detected tool as «whatever your repo already uses».
4. **Gate your inputs.** If a prerequisite artifact is missing, hard-refuse. Give a pointer to
   the skill that makes the artifact.
5. **One level of `references/`.** Do not use nested reference folders.
6. **Write English text in ASD-STE100.** All English prose in skills, agents, templates and docs
   must obey [`skills/_shared/ste100.md`](./skills/_shared/ste100.md).

## Subagents

Engine subagents are in `agents/*.md`. Each one has `name` / `description` / `model: inherit`
frontmatter. Each one also has a system prompt that tells it to read upstream artifacts directly.

## Before you open a PR

Run the validator on your computer. It is the same gate that the `validate` GitHub workflow runs.
It now also enforces the **conventions** of the plugin, not only its structure:

```bash
python3 scripts/validate_plugin.py
```

The validator examines these items:

- The plugin + marketplace manifests have the same name / version / description.
- The version is semver.
- Each skill and each agent has its necessary frontmatter.
- `_shared/` stays reference-only.
- The consistency invariants in the checklist below.

It also searches for references to the excluded legacy dirs. The number of checks changes over
time. CI makes sure that the exit code is 0. It does not compare the number of checks.

### Pre-PR checklist

- [ ] **`python3 scripts/validate_plugin.py` passes** (exit 0).
- [ ] **Server change? `cd server && bunx tsc --noEmit && bun test tests/` passes.** This is the same
      gate that the CI `server-tests` job runs. It is deterministic and uses no network. The fixtures
      are under `server/tests/fixtures/`.
- [ ] **One canonical source / DRY.** Shared logic is in `skills/_shared/` one time only. This
      includes the Socratic machine, the critic, the size matrix, the ask-style, the surface
      taxonomy and the handoff block. Link to it with a relative path. Keep only your per-skill
      *delta*. Never copy a `_shared/` table (for example, the surface taxonomy) into a `SKILL.md`.
- [ ] **Stack-agnostic.** Do not hard-code a language, a tracker, a test framework or a build/load
      tool. Detect what the repo uses, or name it «whatever your repo already uses».
- [ ] **Each skill ends with the handoff block** ([`skills/_shared/handoff.md`](./skills/_shared/handoff.md))
      as its final step.
- [ ] **Invocation form is `/sdd:<name>`.** Always use the namespaced form. Never use the hyphenated form `/sdd-<name>`.
- [ ] **Relative links resolve.** Each `[text](./path.md)` target is a real file. There is one
      exception: a template-runtime path (`../spec.md`, `../sad.md`, `../contracts/…`, …). Such a
      path resolves only inside a generated `docs/features/<slug>/` folder. The validator has an
      allowlist for these paths.
- [ ] **References in `references/`, templates in `templates/`.** Use one level only, with no nested folders.
- [ ] **English text obeys ASD-STE100** ([`skills/_shared/ste100.md`](./skills/_shared/ste100.md)).

### Behaviour evals (on-demand — NOT in CI)

`evals/` contains end-to-end scenarios for skill behavior. They start `claude -p` headlessly and
use an LLM judge. They use tokens and are not deterministic, thus they never run in CI. If you
change the *protocol* of a skill (gates, routing, artifact shape), run the closest scenario on your computer:

```bash
./evals/run.sh design-gate-refusal    # or: specify-happy-path, classify-size
```

See [`evals/README.md`](./evals/README.md) for the prerequisites and for how to add a scenario.

## Releasing

1. Increase the version in **all four** manifests: `.claude-plugin/plugin.json`,
   `.claude-plugin/marketplace.json`, `.codex-plugin/plugin.json`, `.cursor-plugin/plugin.json`.
   If the versions are not the same, the validator fails.
2. Run `python3 scripts/validate_plugin.py` → exit 0. Push to `main`. Add the tag `vX.Y.Z`.
3. Claude Code and Codex get the release directly from git (`/plugin install sdd@sdd` +
   `/reload-plugins`; `codex plugin marketplace upgrade sdd`). The `install.sh` path always
   downloads `main` (or `--ref vX.Y.Z`). Only the Cursor **marketplace** listing goes through a
   review. See below.

### Publishing to the Cursor marketplace

Cursor distributes plugins as public git repositories. A person **reviews each plugin manually**.
This applies to the first listing and to each update after it:

1. **Do a check on your computer first.** Copy the repo to `~/.cursor/plugins/local/sdd`. Restart
   Cursor (or run **Developer: Reload Window**). Type `/` in the chat and make sure that the skills show.
2. **The repo already has the correct format.** `.cursor-plugin/plugin.json` is the manifest. Only
   `name` is strictly necessary, but we also supply displayName / version / description / author /
   license. Cursor finds `skills/` + `agents/` automatically from the repo root. A
   `.cursor-plugin/marketplace.json` is necessary only for repos with more than one plugin. This repo has one plugin.
3. **Submit** the repo URL at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish)
   and wait for the review. After approval, the plugin shows on cursor.com/marketplace and in
   the in-app marketplace panel. Users install it from there, with project scope or user scope.
4. **Each update gets a new review** before the marketplace shows it. The `install.sh` git path
   follows `main` immediately, with or without a review.
