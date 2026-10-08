# Rubric — glossary-artifact-language-uk

The `.claude/sdd.local.md` file of the fixture sets `artifact_language: uk`. The prompt gives two
term definitions in English and never names a language itself. Thus Ukrainian prose can come only
from the skill when it obeys the setting.

PASS requires ALL of:

1. `docs/features/rate-limit-bump/CONTEXT.md` exists with **English structure**:
   - the `## Glossary` heading verbatim (never “Glossary”);
   - no other Ukrainian or translated headings in the file;
   - English frontmatter keys+values (`status: Living`, `updated_at: <date>`).
2. Both terms (`quota window`, `burst credit`) are under `## Glossary`, with one line for each
   term in the `- <term> — <definition>.` shape. **The prose of each definition is Ukrainian.**
   Cyrillic text gives the meaning (for example, “a rolling 60-second interval…”). It is not the
   English sentence copied verbatim. The `quota window` entry keeps a NOT-boundary: a `NOT`
   token, or an equivalent Ukrainian boundary clause that names the billing period.
3. The written file contains no copied `<!-- … -->` template comments, in any language.
4. The final message of the run contains a stage-handoff block (What I did / Review before continuing /
   Run next — the utility variant: resume the backbone stage).

FAIL on these results:

- English-only definitions (the run ignored the setting);
- a translated `## Glossary` heading or translated frontmatter (the switch changed the structure);
- template comments that stay in the file;
- a missing term;
- no handoff block.
