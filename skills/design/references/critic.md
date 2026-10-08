# design — delta over the shared critic

Read [`../../_shared/critic.md`](../../_shared/critic.md) for the canonical dispatch and the F1–F6 skeleton. The canonical dispatch is one clean-context `Agent`, `subagent_type: "general-purpose"`, that reads the upstream files itself. design gives only the deltas below. The skill fills the placeholders and dispatches the critic.

In the dispatch prompt, tell the critic to write its report in ASD-STE100 ([`../../_shared/ste100.md`](../../_shared/ste100.md)).

## Placeholders

- **`{{ARTIFACT_NAME}}`** = "Software Architecture Document (Arc42 12 sections)".
- **`{{DRAFT}}`** = the final post-Socratic `sad.md` (all 12 sections, which the skill just wrote to the disk).
- **`{{EDITS_LOG}}`** = the Socratic edits-log. Put the **ADR-spawns log** inline next to it (`{adr_id, title, section, triggered_by}` for each spawn). Then the critic can cross-check which decisions became ADRs.
- **`{{UPSTREAM_FILES}}`** (the critic Reads these files itself — give paths only, never bodies):
  - `docs/features/<slug>/spec.md` — §2 Goals, §3 Non-goals, §6 NFR (numeric targets + measurement), §6.1 Security/privacy + abuse cases, §7 KPIs, §8 Open questions, and all §1 ¶4 «Decision override» bullets.
  - `docs/features/<slug>/CONTEXT.md` — canonical glossary (roles, domain terms).
  - `docs/features/<slug>/adr/` — run `ls` on it. Then read the Status / Title / Considered options / Decision outcome of each ADR.

## F5 structural floor (this artifact)

After all drops + OQ-migrations, the draft must still agree with each line below. Write one finding for each gap:

- All **12 Arc42 sections** have real content OR the mark `<!-- N/A: <reason> -->`. An empty section with no N/A note is a gap.
- §3 has a real **`C4Context`** Mermaid block and §5 has a real **`C4Container`** Mermaid block.
  - They use real names from CONTEXT + the brownfield scan, **not** template stubs.
  - They have no `<placeholder>` substrings and no `Container_Bondary`/`ContainerBoundary` typos (these typos render empty).
- §6 has **≥1 `sequenceDiagram`** Mermaid block. design seeds the primary flow(s). The `sequences` stage completes the full §5-AC coverage (no cap).
- The §9 ADR table is **closed against the `adr/` dir**. Each file in `adr/` has a §9 row, and each §9 row points to an existing file (no orphans in either direction).
- §11 has a row for **each `save_as_oq`** entry in the edits-log. Each row has the owner + due filled (literal `Open question` in the severity column).

## F6 specialization (this artifact)

There are three sub-probes. For each hit, cite the offending line + the upstream source that it contradicts:

- **NFR-number leak.** A §10 Quality scenario cites a number that is **not** in spec §6 NFR. This is an invented target, for example a p99 figure when the spec gives only p95. Copy the numbers of the spec verbatim. Do not round and do not invent numbers.
- **Strawman ADR.** An ADR in `adr/` has a `Considered options` line that an existing constraint already excludes. Examples: a datastore that the §2/CONTEXT constraints exclude; a cache tier with no §4 strategic seed for it. Strawmen make the ADR genre weaker.
- **§2-constraint-vs-repo contradiction.** §2 Constraints contradicts the conventions of the repo **without** an Override note that points to §11 Risks or a §1 ¶4 override bullet. The source of the conventions is the Step-4 brownfield scan, or the project convention file if it is known.

## F1 specialization — strategic-vector drift

Compare §4 Solution strategy + the §1 quality goals with §5–§10. Drift occurs when the user Approved/Edited a §4 choice, but a later section contradicts it without a note. Examples:

- §4 selects async module coupling, but the §6 happy-path flow shows a synchronous call with no emit step.
- The dominant §1 quality goal is availability, but each §10 scenario measures only latency.

For drift, cite the §4/§1 commitment + the draft line that contradicts it.
