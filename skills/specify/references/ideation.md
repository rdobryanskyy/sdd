# Heavy ideation pass — M/L/XL only (specify step 3)

For a feature large enough to be a real bet (M+), the 3–5 deep-dive answers aren't enough to commit to an approach. This pass runs the autonomous, Claude-driven ideation that the committed approach in §1 ¶3 should be grounded in. It is **read-only research + sub-agents + user confirms**; nothing is written until the spec is. Skip the whole pass for XS/S.

All of this stays at **product level** — no concrete datastore / broker / framework / library names (those are `design` decisions). Sub-agents are told the same.

## Steps

1. **Competitive research (Claude-driven).** WebSearch + the project's knowledge-base search for 3–5 competitors / adjacent solutions. Build a table: *Product · URL · Features · Value (1–5) · Gap*, each row footnoted with the date + query. Internal tool with no market → one honest `N/A — internal tool` row with a reason. Never invent competitors to fill space.
2. **Three strategic approaches (3 parallel sub-agents, one message).** Shared prompt, three personas:
   - **A — Simplicity:** shortest path, MVP, fewest moving parts.
   - **B — Differentiation:** the wow-factor / strategic moat / unique angle.
   - **C — Balanced:** the trade-off between A and B.
   Each returns: Name (3–5 words) · Thesis (1 sentence, product language) · For whom (a segment) · Outcome metric (1 KPI, baseline→target) · Key trade-off (1 line) · Effort signal (S/M/L).
3. **Multi-perspective review (3 parallel sub-agents).** Engineer / Executive / UX-researcher, each seeing all three approaches. The Engineer is told «abstract concerns only — latency, throughput, complexity, integration surface; no product/library names». Build a 3×3 synthesis matrix (+/0/−) with ≤6-word justifications per cell.
4. **Devil's-advocate (1 clean-context sub-agent).** No upstream session memory. Prompt: «find how this fails — 5–10 attack vectors with production signals (what breaks, how it shows up in monitoring / churn / an incident)». The sharpest vector is reserved for the spec's risks/security; the rest seed open questions.
5. **Claude-proposed RICE (`AskUserQuestion` confirm).** Compute from upstream: Reach ← user segments; Impact ← problem severity + the Executive bullets; Confidence ← inverse of unresolved TBDs; Effort ← the approaches' effort signal. Compute `R × I × C / E`. Confirm each number with the user (`Confirm` / `Adjust up` / `Adjust down` / `Mark TBD`) — never make the user invent the numbers (the «calculator game» anti-pattern).
6. **Feasibility (read-only repo scan + confirm).** Scan the repo for adjacent shipped features. Propose three checkboxes — Tech / Skills / Time — each justified by a cited adjacent feature. Confirm each (`Confirm ☑` / `Flip to ☐ — reason` / `TBD`).
7. **Recommendation.** Claude picks one approach and writes a 3–5 sentence rationale that **explicitly cites**: the RICE score, the feasibility state, ≥1 synthesis-matrix cell, and ≥1 competitive gap. Confirm with the user (`Accept` / `Pick different` / `Mark TBD`). The accepted approach becomes §1 ¶3 of the spec.

## Discipline

- **Three approaches, not one.** One approach means the decision is already taken — nothing to evaluate.
- **All three perspectives.** Engineer-only is blind to business/UX; Executive-only is blind to cost.
- **Devil's-advocate from clean context** — otherwise it inherits the upstream optimism.
- **Recommendation cites four upstream signals** — otherwise it's «I feel like A».
- **Planning-mode-friendly:** this whole pass is read-only. If the skill started in plan mode, keep everything in session memory and let the spec write happen after `ExitPlanMode`.
