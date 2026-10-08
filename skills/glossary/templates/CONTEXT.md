---
status: Living
updated_at: "<today YYYY-MM-DD>"
---

# Domain Context — <slug or repo>

<!--
CONTEXT.md is the domain glossary. It is not a spec and not a scratch pad. Do NOT write
implementation detail here (no datastore/broker/framework names, no API contracts). Write only
domain words and the boundaries between them. Implementation choices are in the SAD and ADRs.
Behavior is in spec.md.

Fix each term inline, when it first occurs in an interview / spec / review. Never collect terms
in a batch «I'll consolidate later». If an H2 is empty, remove it before the commit. Keep only
the sections that have real content. ## Glossary is mandatory. The other two are optional.
-->

## Glossary

<!-- Write one line for each term: name · one-sentence canonical definition · one-sentence boundary
     (what it is NOT / the concept that people confuse with it). When there are some terms, sort them alphabetically. -->
- <term> — <one-sentence definition>. NOT <concept that people confuse it with + how it differs>.

## Invariants

<!-- Domain rules that are true across the full feature/codebase. Write them as «X always must / can
     never». These rules are ABOVE each single acceptance criterion. They are not spec AC. If there
     are no rules, remove the section. -->
- <invariant in the form «X always must / can never …»>

## Out of scope

<!-- Concepts that the author explicitly put outside this domain, each with a one-line reason.
     Then nobody argues about them again in six months. If there are none, remove the section. -->
- <out-of-scope concept · reason that it is excluded>
