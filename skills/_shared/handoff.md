# Stage handoff — what every skill prints when it finishes (the output contract)

> **Reference-only.** Not a skill. **Each** skill ends with the handoff block that this file defines.
> The block is the **last output** of the skill, after the skill proposes its commit. The format is
> only in this file. Each skill keeps a one-line pointer and supplies its own *What I did* / *Review* /
> *next command*. This file exists because a bare «Next: …» line is difficult to use. Without the
> block, the user must scroll back to find what changed, which files to open, and what to run next.

Do you use Codex CLI or Cursor? Then the `/clear` and `/sdd:<next>` forms map to the equivalents of
the host tool, per [`tool-adapters.md`](./tool-adapters.md).

## TL;DR (short English introduction)

At the end, each skill always prints the same handoff block with three sections:

1. **What I did** — what the stage did and which commit it proposed (the user must not scroll up).
2. **Review before continuing** — links to the files that the stage created or changed and that the user must review at this gate. Use real `docs/features/<slug>/…` paths that the user can click or copy.
3. **Run next** — first `/clear`, then the next `/sdd:<next> <slug>` command in a **fenced block** (the user can copy it in one click). Add a skip alternative when one exists. `/clear` is mandatory for a forward transition, so that the next stage reads everything again from disk.

This prevents the main problem: output that is difficult to copy and review.

---

## The block (sectioned format)

```md
## ✅ <skill> — <slug>

**What I did**
- <1–3 bullets: the artifacts that the stage wrote or changed + the proposed commit>

**Review before continuing**
- `docs/features/<slug>/<file>` — <what to examine here>
- `docs/features/<slug>/<file2>` — <…>

**Run next**
1. `/clear` — mandatory (new context; the next stage reads its inputs again from disk)
2. then run:
   ```
   /sdd:<next> <slug>
   ```
   ↳ or `/sdd:<alt> <slug>` to <skip condition>   ← only when a real skip exists
```

Rules for the block:

- **Always write the block** as the final output, one time for each run, after the skill proposes the
  commit. Never end a skill on a bare «Next: X».
- Write the prose of the handoff block in ASD-STE100 → [`ste100.md`](./ste100.md).
- **What I did** — make it concrete and complete. Name the files that the stage wrote and the proposed
  commit message, so that the user does not have to scroll up to find them.
- **State the size + route used.** *What I did* names the `feature_size` AND the route of the stage:
  «size M + route standard (from `.size`/`.route`)».
  - If the stage had to use a **default** because a file was missing, say so clearly:
    «size M (default — no `.size`; run `/sdd:classify-size <slug>`)», «route standard (default — no `.route`)».
    Thus the user sees a missing size or route at this gate, not three stages later.
  - A missing `.route` always means `standard` (the behavior before routes existed; fully back-compatible).
  - `specify` sets both at the start, so this occurs rarely.
- **Review before continuing** — list **each artifact that this stage wrote or changed**. Give each one
  as a real `docs/features/<slug>/…` path (or a repo-root path such as `docs/architecture-map.md`).
  Add one line about what to examine. This list *is* the review checklist for the gate.
- **Run next** — put the next command in **`/sdd:<name> <slug>`** form inside a fenced code block (so
  that the user can copy it in one click). `/clear` is step 1, and it is **mandatory** for a forward backbone handoff.
  - Add a `↳ or …` skip alternative **only** when one really exists (see the table).
  - The skip alternatives come from the **fast-lane N/A conditions** in [`size-matrix.md`](./size-matrix.md).
  - **The result of each skip alternative depends on the route**: auto-skip on `quick`, offered on
    `standard`, removed on `full` (see the *Route-resolved forward handoff* variant below).
- Replace `<slug>` with the real slug. Never leave the literal `<slug>` in the printed block.

## Variants

- **Backbone forward handoff** (`survey → … → review → ship`): `/clear` is mandatory + the next stage.
- **Route-resolved forward handoff** (a backbone stage whose next stage is *optional*:
  `specify`, `clarify`, `design`, `sequences`, `data-model`, `tasks`): before you print *Run next*,
  find the next stage from `docs/features/<slug>/.route` and the Routes table in
  [`size-matrix.md`](./size-matrix.md):
  - **`quick`** — examine the N/A condition of the next optional stage yourself.
    - If the condition is true, *Run next* names the stage after the skipped stage. *What I did* states
      «auto-skipped `<stage>`: <reason>». The `↳ or` line **inverts**: it offers the skipped stage
      («run the full path»).
    - If the condition is not true, use a normal forward handoff (the stage does not skip).
  - **`standard`** — normal forward handoff. When the N/A condition is true, add the `↳ or` skip
    alternative (the user selects).
  - **`full`** — normal forward handoff. **Never** print an `↳ or` skip line.
  Missing `.route` → `standard`. The route controls handoffs only. A stage that you start directly
  always runs.
- **Loop-back** (`review → implement` on `CHANGES REQUESTED`): **no `/clear`**, because you stay in the
  context to iterate. *Run next* = `/sdd:implement <slug>` (fix), then review the changed surface again.
- **Terminal** (`ship`): there is no `/sdd` successor. *Run next* becomes **Done**: the PR command/URL
  + «merging to main is your call». Still print *What I did* + *Review* (the changelog + PR).
- **Utility** (`classify-size`, `glossary`, `decide-adr`, `roadmap`, `fix`): the user starts these when
  necessary. They are not a gate.
  - `/clear` is **optional**. Recommend it only if the context is large.
  - *Run next* = «resume your backbone stage». Name the probable stage (for example `/sdd:design <slug>`).
  - Print *What I did* + *Review* (the one file that the skill wrote).
  - One exception: only `fix` adds a **conditional** recommendation. When the fix touched >5 files or
    crossed a module boundary, *Run next* also offers `/sdd:review <slug>`. This is a recommendation,
    never a gate.

## Canonical sequence (stage → review-files → next)

| Stage | Review before continuing (files written) | Run next |
|---|---|---|
| `survey` | `docs/architecture-map.md` (+ scaffold `tasks.json` on greenfield) | `/sdd:specify <slug>` |
| `specify` | `docs/features/<slug>/spec.md` | `/sdd:clarify <slug>` ↳ or `/sdd:design <slug>` (XS/S, zero §8 OQ — fast lane) |
| `clarify` | `docs/features/<slug>/spec.md` (tightened) | `/sdd:glossary <slug>` ↳ or `/sdd:design <slug>` |
| `design` | `sad.md` (C4 §3/§5 + `target_surfaces`) + `adr/` | `/sdd:sequences <slug>` ↳ or `/sdd:data-model <slug>` (XS/S, no multi-step flow — fast lane) |
| `sequences` | `sad.md` §6 (flows) | `/sdd:data-model <slug>` ↳ or `/sdd:api <slug>` (XS/S, no schema change — fast lane) |
| `data-model` | `data-model.md` + staged `migrations/` | `/sdd:api <slug>` ↳ or `/sdd:tasks <slug>` (XS/S, no contract change — fast lane) |
| `api` | `contracts/openapi.yaml` (+ `events.md`, `api-sync-report.md`) | `/sdd:tasks <slug>` |
| `tasks` | `tasks/` + `tasks.json` | `/sdd:plan-tests <slug>` ↳ then `/sdd:implement <slug>` |
| `plan-tests` | `test-plan.md` (or `spec.md` `## Test plan` for XS/S) | `/sdd:implement <slug>` |
| `implement` | the committed diff (code + tests) + `tasks/tracker.md` | `/sdd:review <slug>` |
| `review` | `_review/review-<date>.md` | `/sdd:ship <slug>` (PASS) · `/sdd:implement <slug>` (CHANGES, no `/clear`) |
| `ship` | `CHANGELOG` + the PR | **Done** — PR command/URL; merge is your call |
| `classify-size` | `.size` + `.route` | resume — e.g. `/sdd:specify <slug>` |
| `glossary` | `CONTEXT.md` | resume — e.g. `/sdd:design <slug>` |
| `decide-adr` | `adr/NNNN-<title>.md` | resume — `/sdd:tasks <slug>` or `/sdd:plan-tests <slug>` |
| `roadmap` | `docs/roadmap.md` | resume your backbone stage |
| `fix` | `_fixes/<date>-<short>.md` + the diff (+ the spec patch if any) | resume — or `/sdd:review <slug>` when the fix was wide (>5 files / cross-module) |

The `↳ or` cells above show the output for the `standard` route. On `quick`, the stage auto-skips (and
the `↳ or` inverts). On `full`, the `↳ or` line is removed. This is per the *Route-resolved* variant.

## Discipline

- **The block is the last output: each run, no exceptions.** If a skill ends on prose without the block,
  that is a regression.
- **Real paths, not descriptions.** The user cannot review «the SAD». The user can review `docs/features/<slug>/sad.md`.
- **The next command is ready to copy**: `/sdd:<name> <slug>` in a fenced block, with the real slug.
- **Use `/clear` only where it is correct.** It is mandatory on a forward backbone handoff. Do not use it on a
  loop-back (you iterate). It is optional after a utility.
- **The format is canonical here.** If a skill makes its own block shape, it duplicates the contract.

## Where each skill calls this

The final protocol step of each skill ends with: «emit the **stage-handoff block** per
[`handoff.md`](./handoff.md)» + its own next command from the table above. The format and the variants are
in this file. The skill supplies only the content of the run.
