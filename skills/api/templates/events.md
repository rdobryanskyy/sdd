<!-- Template for `api`. Copy it to docs/features/<slug>/contracts/events.md ONLY if the -->
<!-- feature has async flows (a sad.md §6 sequence with a <message-bus> / <external-system> -->
<!-- participant, an enqueue/deliver message, or a retry note). Write one `## Event` block for each -->
<!-- async message in the sequences. Event names use the domain language from data-model.md, not a -->
<!-- broker/library idiom. If the feature is fully synchronous, delete this file. -->
---
status: Draft
owner: "<Backend Lead>"
reviewers: []
updated_at: "<YYYY-MM-DD>"
feature_size: M
---

# Events — <feature>

This is the async contract for the flows in `sad.md` §6. Each event is a published fact, and
subscribers read it. As with the OpenAPI contract, this contract is **derived** from the sequences.
Each event here maps to an enqueue/deliver message in a §6 diagram.

## Channel: `<channel-name>`

- **Producer:** `<service>` — the building block that owns the flow.
- **Consumers:** `<list of services / jobs that subscribe>`.
- **Delivery:** at-least-once | exactly-once.
- **Ordering:** key-based (by `<field>`) | none.

## Event: `<module>.<action>.v<N>`

<!-- Name = the neutral `module.action.vN` convention. The envelope follows the same idea as the -->
<!-- HTTP error model: a small, stable, machine-readable head + a typed `data` body. -->

```json
{
  "event_id": "<uuid>",
  "event_type": "<module>.<action>",
  "version": <N>,
  "occurred_at": "<iso8601>",
  "data": {
    "<field>": "<type — traces to a data-model.md column where one exists>"
  }
}
```

- **Required fields:** `<event_id, event_type, version, occurred_at, ...>`.
- **Origin:** sad.md §6 `<flow name>` → message `<enqueue ...>`.
- **Backwards-compat policy:** additive-only. A new optional field is permitted. If you remove
  or rename a field, this is a new version (`v<N+1>`). Subscribers must ignore unknown fields.

## Idempotency & retry

<!-- Get these numbers from the §6 retry note and the dead-letter branch. Do not make them up. -->

- **Idempotency:** consumers remove duplicates by `event_id` (a second delivery has the same id).
- **Retry:** `<N>` attempts with exponential backoff.
- **Dead-letter:** after `<N>` failed attempts, send the event to `<channel-name>.dlq`. The on-call engineer empties it.

## Schema registry

- Registry: `<url / repo path>` — the location of the canonical schema for each event version.
- Validator: `<tool the repo already uses>` — find it. Do not assume one.
