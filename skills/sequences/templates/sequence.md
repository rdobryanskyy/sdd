<!-- Template for `sequences`. Put it INLINE in docs/features/<slug>/sad.md §6 (Runtime view). -->
<!-- Write one `### <flow name>` block for each critical flow. Participants are GENERIC placeholders. -->
<!-- Replace the <…> message text and note text with the specifics of this flow. Do NOT replace the participant names. -->
<!-- Generic vocabulary (only these participants are permitted): -->
<!--   <client>          — the item that starts the flow (UI, CLI, a different service, a scheduler) -->
<!--   <service>         — the building block that owns this flow (from §5) -->
<!--   <data-store>      — the persistent store that the service reads and writes -->
<!--   <external-system> — a third party that the service calls -->
<!--   <message-bus>     — the async transport (queue / event stream) for flows that are not sync -->
<!-- `design`/`data-model` name the concrete technology. The runtime view does not. -->

### <flow name>

<!-- SYNC flow: request → response, with the error branches that the acceptance criteria of the spec demand. -->
<!-- Each write becomes a persist note. Then `data-model` knows what to index downstream. -->

```mermaid
sequenceDiagram
    autonumber
    participant C as <client>
    participant S as <service>
    participant D as <data-store>

    Note over C,S: Precondition: <state required before this flow, from spec>
    C->>S: <action>
    S->>D: <read / lookup>
    D-->>S: <result>
    S->>D: <write>
    Note over S,D: persists <entity> (see §6 / informs data-model indexes)
    D-->>S: <ack>
    S-->>C: <success outcome>
    alt <error condition from acceptance criteria>
        S-->>C: <error outcome — name it, no status numbers>
    else <second error condition>
        D-->>S: <store failure>
        S-->>C: <error outcome>
    end
    Note over C,S: Postcondition: <state guaranteed after this flow, from spec>
```

### <async flow name>

<!-- ASYNC flow (incoming webhook / scheduled job / queued or event-driven step / third-party callback). -->
<!-- MUST have: an idempotency-key check as the first step of the handler, a retry note, a dead-letter branch. -->

```mermaid
sequenceDiagram
    autonumber
    participant C as <client>
    participant B as <message-bus>
    participant S as <service>
    participant X as <external-system>
    participant D as <data-store>

    Note over C,B: Trigger: <event / schedule / callback that starts this flow>
    C->>B: <enqueue event>
    B->>S: <deliver event>
    S->>S: check idempotency key (skip if already processed)
    S->>X: <outbound call>
    X-->>S: <response>
    S->>D: <write result>
    Note over S,D: persists <entity> (informs data-model indexes)
    D-->>S: <ack>
    Note over S,X: retry <N> times with exponential backoff on failure
    alt exhausted retries
        S->>B: <route to dead-letter>
        Note over S,B: dead-letter after <N> failed attempts
    end
```
