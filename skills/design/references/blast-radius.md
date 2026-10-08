# Blast-radius heuristic — when an architectural decision becomes ADR-worthy

> **TL;DR.** *Blast radius* measures how difficult it will be to reverse a decision in three months. There are three criteria:
> 1. The rework takes ≥3 days (irreversible).
> 2. ≥2 modules see the decision.
> 3. A legitimate alternative exists.
>
> **2 of 3 → ADR.** 0 stays inline in `sad.md`. Expect 5–12 ADRs for an M-size feature.

The skill makes 15–30 decisions in each pass. Without a gate, you write one ADR for each decision, or zero ADRs. One for each decision is noise and destroys the genre. Zero loses the *why* of the important decisions. The blast-radius heuristic selects the correct 5–12. It is the Socratic gate of design, and it runs on each **Approved** decision (see [`./socratic.md`](./socratic.md)).

## The three criteria

A decision crosses the threshold if it gets **2 of 3**. A single criterion is a borderline. Then ask the user clearly.

### 1. Irreversible

> If we picked a different option three months from now, would the rework take ≥3 days?

This criterion **fires** for these examples:

- **Storage shape** — relational vs document vs object store. A later change needs a data migration that takes weeks.
- **Sync vs async module coupling** — a direct call vs a background event. This changes the data shape and the failure model of all downstream parts.
- **ID strategy** — random vs time-sortable vs auto-increment. A later change needs a *backfill*. A backfill is a script that reads each existing row and writes a new id. It read-locks those rows while it runs.
- **Auth model** — sessions vs per-request tokens. This changes the shape of each request.
- **Sharding / partition key** — the key that spreads the data across servers. A later change needs a re-cluster of all data.

This criterion **does not fire** for these examples:

- **Library choice within the same language** (two equivalent libraries for the same job) — the rework is search-and-replace, a few hours.
- **A configuration value** (a 5s vs 10s timeout) — one PR.
- **Naming** (`objective` vs `title`) — the IDE renames it in a minute.

### 2. Multi-module impact

> Does this decision change a contract seen by ≥2 modules?

This criterion **fires** for: an event schema across module boundaries; a shared error-code namespace; a pagination convention that many endpoints use; a migration that adds a column that other modules read.

This criterion **does not fire** for: an internal function name in one module; a private method signature; a log format that only one component uses.

### 3. Has legitimate alternatives

> Will a reader six months from now ask «why not X?» where X is a real, non-strawman alternative?

**Excludes:**

- Decisions where the alternative is clearly worse (no strawman ADRs).
- Decisions where an existing constraint excludes the alternative (no ADR for «we used the language the repo is already written in»).

**Catches:**

- Choices that look arbitrary in the code (why *this* cache TTL? why *this* circuit-breaker threshold?).
- Trade-offs where two reasonable engineers would select differently.
- All decisions where the option set had 2–3 serious options, not 1.

## Using the heuristic during the Socratic pass

After each `AskUserQuestion` choice:

1. **Score it.** Count how many of the three criteria fire.
2. **Decide:**
   - 0 → inline, no ADR.
   - 1 → borderline. The default is inline. The exception is §4 Solution Strategy, where the bar is lower, because strategy is broad by definition.
   - 2+ → ADR.
3. **On a borderline,** ask clearly: «This is borderline ADR-worthy because of <criterion>. Lock as ADR or keep inline?» Give the options `Lock as ADR` (Recommended if irreversible) / `Inline only`.

## Why 5–12 per M feature

- **Below 5:** probably too few ADRs (you missed an irreversibility). The exception is a real XS/S feature, where 2–4 is correct.
- **5–12:** correct for an M feature. Each ADR is a real decision that people will read again.
- **Above 12:** probably too many ADRs. Combine them, change their scope, or move tactical details inline. L/XL can have 10–15.

## Closing self-review

1. Does §9 refer to each file in `adr/`? No orphans.
2. Does each ADR have a Status (`Accepted`) and a Decision outcome (not only a Context)?
3. For each ADR: if you run the heuristic again, does it still gate the ADR? (Did you make an ADR for a trivial config value?)
4. For inline decisions: does one of them look like an ADR? If yes, promote it.

## Anti-patterns

- **An ADR for the alternative that you rejected.** The ADR is about the selected path. Put the alternatives in `## Considered options`, not in their own file.
- **An ADR with `Status: Proposed` from this skill.** Synchronous decisions with the user → `Accepted`. For asynchronous Proposed → Accepted flows, use `decide-adr`.
- **One ADR for each quality goal.** Quality goals are in §10. ADRs record the specific *decisions* that the team made because of them.
- **A title that names the problem, not the decision.** `0003-rate-limiting.md` (bad) vs `0003-sliding-window-counter.md` (good).
