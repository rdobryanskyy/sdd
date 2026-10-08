---
id: T1
title: "<imperative, specific title>"
layer: "migration|domain|infra|app|ports|ui|tests|wiring|docs"
deps: []                # task ids that must finish first
acs: ["AC-01"]          # spec §5 acceptance criteria this task satisfies
files_hint: ["path/or/dir/the/task/touches"]
owner: "<owner / TBD lead>"
estimate: "S"           # S/M/L or hours
status: "todo"
---

# T1 — <title>

## Why

<!-- instruction: 1–2 sentences. Link to the upstream source. Do not paste it. Example:
derives from [spec §AC-01](../spec.md), [sad §6](../sad.md), [ADR-0001](../adr/0001-....md). -->

## What

<!-- instruction: the concrete change. Its scope is ≤1 day / one PR that a reviewer can examine.
Name the files/dirs (the same as files_hint). For a migration task: name the **staged** up + down
files under `docs/features/<slug>/migrations/<NN>_*`. `implement` promotes them into the live
`migrations/`. For a ports task: name the handler + its dto + errors. If possible, keep the change
in one layer. -->

## Definition of Done

<!-- instruction: testable bullets. Examples: -->
- [ ] <unit/integration test for this task passes>
- [ ] <staged migration is promoted to live `migrations/`, then applies and reverts cleanly> (migration tasks)
- [ ] <handler returns the spec'd outcome for AC-01> (ports tasks)
- [ ] lint + vet clean

## Notes

<!-- instruction: write the hidden problems (gotchas). Name the lane that this task shares with a different task
(overlapping files_hint). Name each Hard Rule that the task must obey. -->
