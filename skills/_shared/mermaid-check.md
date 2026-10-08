# Mermaid check — validate every diagram after writing it

> **Reference-only.** Not a skill. Some skills write a Mermaid diagram (`design` C4 §3/§5,
> `sequences` §6, `data-model` ER, `survey` C4, `tasks` `_epic` flowchart). Each of these skills
> runs this check **after it writes** the diagram and **before it commits** the diagram. The rule:
> never commit a diagram that does not parse. Broken Mermaid shows as a red error box to the reader.

## Procedure

1. **Write** the diagram into its file.
2. **Validate that it parses.** If a renderer is available, do a render-check. If not, use the structural lint below.
3. **On failure:** cite the bad ```mermaid block and the error line of the parser. **Correct the syntax** and **validate again**. Do this loop a maximum of 3 times.
4. If the diagram still does not parse after 3 tries, do **not** commit it as it is. Show the block and the error to the user, and ask. Do not ship a diagram that shows as an error box.

## Detection cascade (first available wins)

1. **`mmdc` (mermaid-cli)** — the real parser. It is on PATH, or use `npx -y @mermaid-js/mermaid-cli`. Run it over the file that contains the diagrams. It extracts and renders each ```mermaid block. Send the output to a temporary file and examine the exit code:
   ```bash
   mmdc -i docs/features/<slug>/sad.md -o /tmp/_mmd_check.md 2>&1   # exit != 0 → a block failed; stderr names it
   ```
   A non-zero exit means that a minimum of one block is not valid. The stderr names the diagram and the syntax error. After the check, delete the temporary output.
2. **Project mermaid dep** — if `node_modules/mermaid` exists, a small `mermaid.parse(src)` for each extracted block (parse-only, no render) is enough. It is fast.
3. **Obsidian vault** — if the docs are in an Obsidian vault, the obsidian-cli render/error-capture can confirm that the block renders.
4. **No renderer → structural lint.** This is the fallback. `design` did it inline before, and now it is centralized here. For each ```mermaid block, examine these items:
   - the opening and closing ```mermaid fences match;
   - the first token is a known token: `graph`/`flowchart`/`sequenceDiagram`/`classDiagram`/`erDiagram`/`stateDiagram`/`C4Context`/`C4Container`/`C4Component`/`journey`/`gantt`;
   - **each node or participant that an edge/`Rel` refers to is declared first**;
   - no template `<placeholder>` substrings are left;
   - brackets, parens and quotes are balanced;
   - no known typos (see below).
   The lint finds the usual breakages. If `mmdc` is not present, recommend that the user installs it for a real parse.

## Per-type gotchas (the usual render failures)

- **C4** (`C4Context` / `C4Container`): write `Container_Boundary` / `System_Boundary` (NOT `Container_Bondary`). Declare each `Person(...)` / `System(...)` / `Container(...)` / `ContainerDb(...)` **before** a `Rel(from, to, "label")` that uses its id. Ids have no spaces. `Rel` must have the quoted label argument.
- **sequenceDiagram**: declare `participant X as Display Name`, then refer to `X`. Keep `alt … else … end` / `loop … end` / `opt … end` balanced. Write `Note over X,Y: text`. An actor with spaces must have an alias.
  - **No `;` in message/Note text.** Mermaid uses `;` as a statement separator. Thus in `Note over R,DB: commit; any error rolls back`, it parses the part after `;` as a broken new message. This check found this real bug.
  - Do not use **Unicode arrows (`→`)** in text. Use words or `-->`.
  - Do not put a **trailing `%%` inline comment** on a message line. `%%` must start its own line.
- **erDiagram**: write `ENTITY ||--o{ OTHER : "label"`. Attribute lines are `type name` in `ENTITY { … }`. Cardinality glyphs must be valid (`||--o{`, `}o--||`, …). The key class is only `PK` / `FK` / `UK`. **`PK_FK` is not valid.** Use `PK, FK`, or `PK "FK to users"` as a comment. This check found this real bug too.
- **flowchart**: write `flowchart LR` (or `TD`) and `A[label] --> B{decision}`. Match the bracket shapes (`[]` `()` `{}`). A node label with special characters must have quotes: `A["a: b"]`.

## Where each skill calls this

- `design` — at the write of each section (§3 C4Context, §5 C4Container) and again in the finalize backstop, over `sad.md`.
- `sequences` — after it writes the §6 `sequenceDiagram` blocks.
- `data-model` — after the `erDiagram` in `data-model.md`.
- `survey` — after the C4 in `architecture-map.md`.
- `tasks` — after the `flowchart` in `_epic.md`.

Each skill keeps only a one-line "validate per [`mermaid-check.md`]" pointer. The procedure is only in this file.
