# design — delta over the shared Socratic loop

Read [`../../_shared/socratic-loop.md`](../../_shared/socratic-loop.md) for these canonical rules:

- the 4-state machine (Approve / Edit / Save-as-OQ / Drop);
- the edits-log schema;
- the cadence;
- the disk-write discipline (keep the content in memory until you write the section).

design gives only the deltas below.

## Sections walked (in order)

The 12 Arc42 sections of `sad.md`, in order:

§1 Introduction & goals → §2 Constraints → §3 Context & scope (C4 Context inline) → §4 Solution strategy → §5 Building blocks (C4 Container inline) → §6 Runtime → §7 Deployment → §8 Crosscutting → §9 Architecture decisions → §10 Quality requirements → §11 Risks → §12 Glossary.

§4 starts with the **Target-surface** decision. This decision gates the §5 containers and each downstream stage, so resolve it before all other §4 choices (see the decision-types catalog below).

Make one combined commit for each section (the `sad.md` edits + all ADR files that the gate started). There is one exception: on route `quick` + depth `easy`, write each section to the disk when it resolves, but batch the commits (≤3 for each pass, or one for a pass without an interrupt — spine step 6).

The skill never goes back to a written section. Cross-section drift is the work of the critic. The size matrix sets the depth of each section. XS/S also walks all 12 sections, with more `<!-- N/A: reason -->` (see [`../../_shared/size-matrix.md`](../../_shared/size-matrix.md)).

## Decision-types catalog

Each section has a mix of these types. The same 4-state machine applies to all of them. The `description` of each option names the next mechanical step (phrasing → [`../../_shared/ask-style.md`](../../_shared/ask-style.md)).

- **Surface** (§4, walk it **first**) — *what the team builds*.
  - Ask a multiSelect over the taxonomy that is based on C4 containers (`backend-service` / `web-frontend` / `mobile-app` / `desktop-app` / `cli` / `worker` / `library-sdk`).
  - Derive the Recommended set from spec §1 «for whom» + the §4 roles.
  - It gates §5 (one container for each surface) and each downstream stage. Thus, resolve it before all other §4 decisions.
  - The blast-radius gate fires each time the user selects **>1 surface** (multi-module + irreversible).
  - When it resolves, write `target_surfaces: [...]` to the `sad.md` frontmatter → [`../../_shared/surfaces.md`](../../_shared/surfaces.md).
- **UI-architecture** (§4, one for each declared UI surface) — the next decision after a `web-frontend` / `mobile-app` / `desktop-app` selection.
  - Web → SSR/SPA/hybrid. Mobile → native/cross-platform. Add state-management + routing only if the complexity makes them necessary.
  - Give a set of 2–3 options, with the Recommended option first. The gate fires frequently (an irreversible delivery choice).
  - This **changes** the old §4 "read-side delivery (SSR/SPA/API-only)" item into a decision for each surface.
  - Keep it light: no component-tree, token or screen artifact (Option B).
  - It **refers to the existing design system / component library** from `architecture-map.md` §Frontend. The UI **reuses** that foundation (components, tokens, styling). It does not design a greenfield UI → [`../../_shared/surfaces.md`](../../_shared/surfaces.md).
- **Strategic** (mostly §4, sometimes §7) — a set of 2–4 options, with the Recommended option first. The blast-radius gate fires **almost always** (irreversible + multi-module). Plan ≥2 ADRs from §4 alone.
- **Building-block** (mostly §5) — the module boundary (extend vs new), the layering style (ask only if the spec shows a difference from the repo convention), the internal sub-package layout. The gate fires frequently (multi-module).
- **Crosscutting bundle** (§8) — one combined question: «keep the repo's defaults» / «override for §X». The gate fires rarely (these are conventions, not blast-radius decisions).
- **Quality scenario** (§10) — a set of options is rarely useful (the numbers come verbatim from the spec NFR). The usual resolution is Approve / Edit (make the verify method more precise) / Save-as-OQ (an owner gives the verify method later).
- **Risk entry** (§11) — generated automatically from the edits-log + the spec Open Questions + the brownfield scan. The user Approves it verbatim or Edits the severity/mitigation/owner.
- **Open-architectural-decision row** (a special Risk entry) — created automatically when an earlier section resolves to Save-as-OQ.
  - The skill writes the §11 row at that time.
  - The user does **not** see a second question for it. The user approved it when they selected Save-as-OQ.
  - The Severity column has the literal `Open question`.

## Per-skill gate — the blast-radius gate (→ ADR)

This gate is the design equivalent of the specify coverage floor. On each **Approved** decision (not Edit/Drop/Save-as-OQ), run the 3-criteria blast-radius gate → [`./blast-radius.md`](./blast-radius.md): irreversible / multi-module / has legitimate alternatives.

- If **2-of-3 fire → start an ADR**.
- On a 1-of-3 borderline, ask clearly: «Lock as ADR or inline?».

To start an ADR:

1. `NNNN` = `ls docs/features/<slug>/adr/*.md 2>/dev/null | wc -l` + 1, with zeros in front to make 4 digits.
2. Write the title in **decision-form** imperative kebab-case. Use the selected option, not the problem (`0003-sliding-window-counter.md` ✓ vs `0003-rate-limiting.md` ✗).
3. Copy [`../templates/adr.md`](../templates/adr.md) → `docs/features/<slug>/adr/NNNN-<title>.md`.
   - Status = `Accepted` (this skill is synchronous).
   - The Considered options include the rejected options from the `AskUserQuestion`.
   - Do not write strawman options (an alternative that an existing constraint already excludes).
4. Add a §9 row in memory: `| NNNN | <imperative title> | Accepted | §N |`. The file goes in the **section commit**, not in a separate commit.
5. Add an entry to an ADR-spawns log in memory (`{adr_id, title, section, triggered_by}`).
   - Keep this log **adjacent** to the edits-log. It is a different signal (a new artifact, not a user edit).
   - The critic reads `adr/` directly. The spawns log gives traceability in memory only.

Expected ADR count for each size: XS/S → 2–4, M → 5–12, L/XL → 10–15.

## Open-Questions table

`save_as_oq` rows go into **§11 Risks** in this exact shape, with the literal `Open question` in the severity column:

```
| Open architectural decision: <headline> | Open question | Resolve before <stage trigger or YYYY-MM-DD>; <inline rationale> | <owner> |
```

The owner + due (a date OR a stage trigger, for example «before `tasks`») are mandatory. Get both in the follow-up `AskUserQuestion`. If either is missing, change the decision to Drop with a warning. There is no gate, because a defer is not an accepted decision.
