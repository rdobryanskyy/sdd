# Ideation orchestration — specify step 3 (depth-gated named subagents)

For a feature that is a real bet, the deep-dive answers are not enough to select an approach. This pass gives a base for the committed approach in **§1 ¶3** of the spec.

- The pass is **read-only research + named subagents + user confirmation**. The skill writes nothing before it writes the spec.
- All content stays at **product level**. Do not use concrete datastore, broker, framework or library names, because these are `design` decisions. Tell each subagent the same rule.

The **interview-depth dial** controls what runs ([`../../_shared/interview-depth.md`](../../_shared/interview-depth.md)). The feature **size** is a secondary trimmer.

- The analyses that ran inline before are now **named-subagent dispatches**.
- Each subagent has a clean, isolated context, because its value is fresh eyes.
- Spawn each one with `subagent_type: "sdd:<name>"` per [`../../_shared/agent-roster.md`](../../_shared/agent-roster.md) §Dispatching.
- If the namespaced agent is not available, use a `general-purpose` agent as the fallback.

## When each agent runs (depth × size)

| Depth | What runs |
|---|---|
| **easy** | **Skip the suite.** No subagents, because the step-2 deep-dive answers are enough. §1 ¶3 still names a committed approach. Claude selects it from the deep-dive and records it as an **assumption in the easy ledger** (per the depth dial), and the user can veto it. No research, no 3-approach fan-out. |
| **medium** (default) | `researcher` (competitive / web) **+** `devils-advocate` (failure modes). No strategist/analyst/RICE. The base is lighter. |
| **hard** | **Full suite:** `researcher` **+** `strategist` (3 approaches) **+** `analyst` (multi-perspective over these approaches) **+** `devils-advocate`. Then do the **RICE + feasibility** confirm that Claude proposes. |

**Size is the secondary signal.** It is never the primary gate.

- The depth that the user selects wins. The size only *trims the volume* in that depth.
- An XS/S feature at hard still runs the suite. But the `researcher` table can correctly have one `N/A — internal tool` row, and the RICE pass stays short.
- Before 1.7, only the size controlled this pass ("M/L/XL only"). Now the depth is the gate, and the size is the trimmer.

## The dispatches

The dispatch prompt is the **only channel** to a clean-context agent (per the shared agent contract). For each agent below, the prompt puts this material inline:

- the **captured idea (verbatim baseline)**,
- the **step-2 deep-dive answers**,
- (if it exists) the **`CONTEXT.md` path** for canonical terms,
- the instruction to write the report in ASD-STE100 → [`../../_shared/ste100.md`](../../_shared/ste100.md).

The spec is not written yet. There is no `spec.md` to read, so the material is inline.

1. **`researcher`** (`sdd:researcher`) — *medium + hard.* Competitive and adjacent-solution research with web access.
   - It returns a cited table (Product · URL · Features · Value 1–5 · Gap). Each row has a footnote with the date + query. It also gives a one-line synthesis of the largest gap.
   - **Fallback:** a `general-purpose` Agent with the same prompt and `WebSearch`/`WebFetch`.
   - **If web access is not available** in this run, accept its `RESEARCH_LIMITED` output and record a known gap (as for the `mmdc` fallback in other skills). Never invent competitors to fill the table.
2. **`strategist`** (`sdd:strategist`) — *hard only.* It generates the three strategic approaches: A Simplicity / B Differentiation / C Balanced. Each approach has Name · Thesis · For-whom · Outcome-metric · Key-trade-off · Effort-signal. Dispatch it **together with `researcher`** in one message, because they are independent.
3. **`analyst`** (`sdd:analyst`) — *hard only.* It does a multi-perspective review (Engineer / Executive / UX lenses) **of the three approaches of `strategist`**.
   - It returns a 3×3 synthesis matrix (+/0/−, justifications of ≤6 words) + one synthesis line for each approach.
   - Dispatch it **after** `strategist` returns, because it must have the three approaches inline.
   - The Engineer lens stays abstract: no product or library names.
4. **`devils-advocate`** (`sdd:devils-advocate`) — *medium + hard.* Run it in its **failure-mode mode** (not the ambiguity mode of clarify).
   - The prompt asks: «there is no spec yet — here is the idea (+ approaches, at hard); find how this fails — 5–10 attack vectors with production signals: what breaks, how it shows up in monitoring / churn / an incident».
   - It returns the cited vectors.
   - It runs in parallel with the other agents. At hard, give it the approaches, so that it attacks the leading approach.
   - **Fallback:** `general-purpose` with the same prompt.

> The sequence at hard: dispatch `researcher` + `strategist` + `devils-advocate` in one message. When `strategist` returns, dispatch `analyst` over its three approaches. At medium: dispatch `researcher` + `devils-advocate` together.

## RICE + feasibility (hard only — Claude-proposed, `AskUserQuestion` confirm)

These steps stay **inline**. Claude calculates them from the upstream signals and confirms them with the user. They are not a subagent.

5. **Claude-proposed RICE.**
   - Calculate the values from upstream: Reach ← user segments; Impact ← problem severity + the Executive lens of `analyst`; Confidence ← inverse of unresolved TBDs; Effort ← the effort signal of the approaches.
   - Calculate `R × I × C / E`.
   - Confirm each number with the user (`Confirm` / `Adjust up` / `Adjust down` / `Mark TBD`). Never make the user invent the numbers (the «calculator game» anti-pattern).
   - Phrase the questions per [`../../_shared/ask-style.md`](../../_shared/ask-style.md).
6. **Feasibility (read-only repo scan + confirm).**
   - Scan the repo for adjacent shipped features.
   - Propose three checkboxes: Tech / Skills / Time. Justify each one with a cited adjacent feature.
   - Confirm each one (`Confirm ☑` / `Flip to ☐ — reason` / `TBD`).

## Recommendation → §1 ¶3

Claude selects one approach and writes a rationale of 3–5 sentences. Then Claude confirms it with the user (`Accept` / `Pick different` / `Mark TBD`). The accepted approach becomes **§1 ¶3** of the spec. The rationale must cite different data, as a function of what ran:

- **hard** — cite all four upstream signals: the RICE score, the feasibility state, ≥1 cell of the `analyst` synthesis matrix, and ≥1 competitive gap from `researcher`.
- **medium** — cite the gap from `researcher` + the strongest vector of `devils-advocate` + the success criterion from the deep-dive. There is no RICE or matrix to cite. It is still a real, confirmed recommendation, but it is lighter.
- **easy** — §1 ¶3 gives the approach that Claude inferred from the deep-dive, and the assumptions ledger shows it. The veto or accept of the user on the ledger *is* the confirmation.

## How the outputs feed the spec

- **`researcher` gap** → the §1 ¶3 recommendation cites it. If a competitor omits something deliberately, this can start a §3 Non-goal.
- **`strategist` approaches** → the set of options from which the recommendation selects. If the user wants to track the other approaches, they start §8 rows.
- **`analyst` matrix** → §1 ¶3 cites it. If a lens is `−` for all approaches, flag a §6 NFR or a §11 risk to monitor.
- **`devils-advocate` vectors** → the strongest vector goes into §6.1 Security/privacy + abuse cases (or §11 Risks). The other vectors start §8 Open questions.
- **RICE / feasibility** → §1 ¶3 cites them. When `specify` registers the feature, the RICE score also sets the Next order of the roadmap.

## Discipline

- **The depth is the gate.** easy skips the suite (it records an assumption in the ledger). medium = research + adversary. hard = the full SLDC-style pass. The dial keeps easy and medium light after the agents were added again.
- **Three approaches, not one** (at hard depth). With one approach, the decision is already made, and there is nothing to evaluate.
- **All three perspectives** (at hard depth). The Engineer lens alone does not see business and UX. The Executive lens alone does not see cost.
- **The adversary runs from a clean context.** If not, it gets the optimism of the upstream conversation.
- **Product level only.** Do not put a concrete stack in an analysis or in §1 ¶3. Technology belongs to `design`.
- **Never invent** competitors or RICE numbers to fill the pass. An honest `N/A — internal tool` row or a `Mark TBD` is better than invented research.
- **Plan mode:** the full pass is read-only. If the skill started in plan mode, keep all data in session memory. Write the spec after `ExitPlanMode`.
