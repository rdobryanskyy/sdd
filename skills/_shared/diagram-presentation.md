# Diagram presentation — how to confirm a diagram readably (never dump raw Mermaid)

> **Reference-only.** Not a skill. Some skills ask the user to confirm a Mermaid diagram
> (`design` C4 §3/§5, `sequences` §6 flows; other skills can use it too). These skills obey this file.
> The rule: **never paste raw Mermaid source into the terminal as the item to confirm.** In a
> chat box, raw `sequenceDiagram` / `C4Context` source is not readable. The user cannot judge a
> flow from `participant A as …` lines. Confirm the diagram with a **plain-language description**
> of what it shows. The real source goes into the file (where Obsidian renders it). If a
> renderer is available, the source also goes into an image.

## Why

In a dogfood run, the skill pasted raw `sequenceDiagram` blocks as the confirmation prompt. The user cannot read arrows as text. Thus the user approves without a real review, or becomes frustrated. The solution keeps two topics separate. The **source** goes where it renders (the `.md` file, and an optional image). The **question** is in prose that the user can really evaluate.

This file works together with two other files. [`mermaid-check.md`](./mermaid-check.md) answers «does it parse?». [`interview-depth.md`](./interview-depth.md) answers «ask per-diagram, or proceed?». This file answers «how do I present it?».

## Procedure (per diagram)

1. **Write the diagram to its file first.** Examples: the `sad.md` §6 flow, the §3 C4Context block. Obsidian renders the diagram there natively. Thus, when you write first, the user can go to the rendered view immediately. (This is the opposite of the old «show then write» sequence. In practice, «show» gave raw source. When you write first, the file is the render surface.)
2. **Validate that it parses** per [`mermaid-check.md`](./mermaid-check.md). If `mmdc` is available, do a render-parse. If not, do the structural lint. Never confirm a diagram that does not parse. Correct it first.
3. **Describe it in prose.** The confirmation prompt is a plain-language account of what the diagram shows, not its source. Name the participants in words. Tell the flow in one or two sentences, **with the key branches**. Example for a sequence flow:
   > «Flow 1 — read preferences: the member asks for their prefs → the handler asks the service → the service reads the store; if there's no saved row, it returns the on-by-default state instead of an error.»
   For a C4 view: «The Context shows the member and the admin talking to the Preferences system, which depends on the existing Identity system for who's-allowed and writes to one datastore.» Tell each actor/participant and each `alt`/`else` branch in words.
4. **If a renderer is available, render an image.** If `mmdc` (mermaid-cli) is on PATH (or `npx -y @mermaid-js/mermaid-cli`), **also** render the block to an image. Give its path, thus users without Obsidian can also see it:
   ```bash
   mmdc -i docs/features/<slug>/sad.md -o docs/features/<slug>/_diagrams/<name>.png 2>&1   # one image per diagram, or per file
   ```
   Write the path in the prose («rendered to `_diagrams/flow-1.png`»). If no renderer is available, the file and the prose description are enough. Say this to the user. Do not block. (This is a graceful fallback, the same as the `mmdc` path in `mermaid-check.md`.)

## Depth governs the ask (per [`interview-depth.md`](./interview-depth.md))

- **easy** → write the diagram and give a **one-line prose summary** for each diagram. Then **continue**. Do not use an `AskUserQuestion` for each diagram. The summaries go into the assumptions ledger of the easy level. Thus the user can still veto a flow after the fact, but the skill does not stop at each diagram.
- **medium / hard** → give the prose description (step 3) and an `AskUserQuestion` to **confirm each diagram**. Use the 4-state actions from [`ask-style.md`](./ask-style.md) (Accept / Fix / Save-as-OQ / Drop). On **Fix**, use the note of the user and make that one diagram again (one round, the second answer is final). Then validate and describe it again.

The question text is always the **prose description and the file/image path**, never the raw block. (If the user explicitly asks to see the source, show it. But the *default* confirmation channel is prose.)

## Discipline

- **Never** make the raw Mermaid source the item that the user confirms. This file exists to stop that anti-pattern.
- **Write before you ask.** The file is the render surface. If you ask before you write, the user has no rendered view to go to.
- **Describe each branch**, not only the happy path. If the prose does not tell an `alt`/`else`/dead-letter branch, the user cannot veto that branch.
- **Validate before you describe.** Never describe (or render an image of) a diagram that does not parse. Correct it per `mermaid-check.md` first.
- The prose is for the user. The source is for the file and for `data-model`/downstream. Keep the two channels separate.

## Where each skill calls this

- `design` — at the §3 C4Context and §5 C4Container confirms (steps 5–6). Describe the context and the containers in prose. Do not paste raw C4 source as the question.
- `sequences` — at the §6 flow confirm (step 6). Write each flow → validate → describe in prose → confirm with prose (or continue at easy).

Each skill keeps only a one-line «present per [`diagram-presentation.md`]» pointer. The procedure is only in this file.
