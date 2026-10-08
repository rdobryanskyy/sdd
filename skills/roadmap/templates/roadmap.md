---
status: living
updated_at: "<YYYY-MM-DD>"
---

# Roadmap — <repo>

> **Direction, not a promise.** Near-term work is firm. When an item is further in the future, it
> is more directional and it will more probably change. This is **not** a release plan, and it has
> **no dates**. It is the set of outcomes that we work toward, with less certainty over time. The
> *solution* for each item is in its `docs/features/<slug>/` spec, not here.

## Now — committed · spec'd · in progress

<!-- instruction: features that have a docs/features/<slug>/ spec and that the team builds now.
Write one ROW for each feature: the OUTCOME (the why), a link to the feature folder, and a status
(designing / implementing / review). Do not write spec detail. Link to the spec, do not copy it.
specify promotes an item here. ship moves it to Shipped. -->

| Outcome (the why) | Feature | Status |
|---|---|---|
| <outcome — the problem this solves> | [<slug>](./features/<slug>/) | implementing |

## Next — problems / opportunities (deliberately not yet spec'd)

<!-- instruction: the prioritized pool of candidates. Each row is an OUTCOME/PROBLEM, not a solution.
It has NO feature folder yet. It gets one when specify moves it into Now. Sort the rows by RICE, largest first.
RICE = (Reach × Impact × Confidence) ÷ Effort — Impact 3/2/1/0.5/0.25, Confidence 100/80/50%, Effort person-weeks. -->

| Outcome / problem | RICE | R · I · C · E |
|---|---|---|
| <problem statement> | <score> | <reach> · <impact> · <conf%> · <effort wk> |

## Later — outcomes / themes (directional)

<!-- instruction: write only coarse, directional one-line items, with one ROW for each. No features, no scores, no dates. -->

| Outcome / theme (directional) |
|---|
| <outcome or theme we expect to pursue, eventually> |

## Shipped

<!-- instruction: ship moves delivered items here, with one ROW for each: date + outcome + link to the
feature + the PR/changelog. This keeps Now correct and records what was delivered. -->

| Date | Outcome | Feature | PR |
|---|---|---|---|
| <YYYY-MM-DD> | <outcome> | [<slug>](./features/<slug>/) | [PR](<url>) |
