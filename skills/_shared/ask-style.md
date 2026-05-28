# Ask-style — junior-friendly bilingual `AskUserQuestion`

> **Reference-only.** Not a skill. Every skill that calls `AskUserQuestion` reads this for the
> canonical shape of questions and options. The rule: an **option label is the next mechanical
> step the skill takes**, not just a name; the **description explains, in plain words, what will
> happen** — written so a first-year junior can pick correctly without a senior beside them.

## Shape

- **`question`** — 3–4 sentences in three blocks:
  - **CONTEXT** — why this decision, what scenario to picture, what exactly we're deciding (one sentence with a concrete example).
  - **WHY IT MATTERS** — which quality goal / NFR / spec vector it touches; reversibility (irreversible? multi-module? affects performance / security / UX?); the main trade-off in play.
  - **READ OPTIONS** — a nudge to read the descriptions before choosing.
- **Each option**:
  - `label` — 1–5 words, **action form** = the next mechanical step: «Прийняти», «Виправити», «Винести у відкрите питання», «Викинути», «Зафіксувати як ADR». Add «(Recommended)» to the first option when you recommend it.
  - `description` — 3–5 sentences with four mandatory elements (below).

## The four mandatory elements of a `description`

1. **What technically happens** — concrete names: tables / endpoints / files / ADR numbers. Not «modify the API» but «add field `is_active BOOLEAN` to table `members` and a new route in the module's handler».
2. **What you gain / what you lose** — the trade-off in plain words, **every technical term glossed**:
   - not «backfill migration» → «a script that walks every existing row and fills the new field; while it runs the rows are read-locked for writes»
   - not «cursor pagination» → «the client sends the last id it saw so the next page starts after it; avoids `OFFSET`, which slows down on large pages»
   - not «GIN index» → «a special index type that lets you search inside JSON columns, but takes 3–5× more space and writes slower»
3. **The skill's next mechanical step** — «I spawn ADR-NNNN titled X, add a row to the §9 ADR table, the schema is locked for the data-model stage».
4. **Hidden trade-off** — if there's a condition under which the choice breaks («only works if Redis is already in your stack», «in 6 months you'll need downtime for a backfill», «existing users have to re-login»), state it **right in the description**, not in a follow-up. A junior won't see that trigger on their own.

## Language

- **Ukrainian throughout** — labels + descriptions. Technical identifiers stay in their original form (ADR, JSONB, JWT, UUID, FK, OpenAPI) — they are names. The *actions* are Ukrainian («Прийняти», «Відредагувати», «Винести у §11 OQ», «Видалити»).
- Glossary roles and domain-invariant **names** (natural-language phrases like «no published lessons») are allowed — they are business terms.

## Forbidden

- Terse English labels («Approve», «Edit», «Drop», «Reword»).
- One-line descriptions.
- Technical terms without a gloss (UNION, backfill, GIN, cursor, idempotent, transactional…).
- Trade-offs hidden in a follow-up («if you pick this I'll later ask about X, which has complexity Y»).

## Counter-example (deprecated) vs correct

```
# DON'T — opaque next step, no gloss
- label: "Approve"
  description: "Apply decision."

# DO — action-form label, description names the concrete step + glossed trade-off
- label: "Прийняти JSONB-колонку (→ spawn ADR-0002)"
  description: "Одна колонка `body` типу jsonb зберігає весь масив блоків як JSON. ПЛЮСИ: редагування уроку одним UPDATE; новий тип блоку не потребує schema-migration. МІНУСИ: валідація блоків лягає на app-layer (БД не знає типів); пошук всередині body потребує GIN-індексу (спеціальний індекс Postgres для пошуку в JSON — у 3–5× більше місця, повільніший запис). НАСЛІДОК: спавню ADR-0002 з 3 розглянутими варіантами, додаю рядок у §9, схема фіксується для stage data-model."
```

## The 4-state actions, phrased this way (canonical set)

```
- label: "Прийняти як є"
  description: "Лишаю рішення дослівно, запускаю наступну перевірку (gate, якщо є для цієї секції)."
- label: "Виправити"
  description: "Ти даєш нове формулювання/значення; я регенерую рішення під нову умову і питаю ще раз (один раунд — друга відповідь фінальна)."
- label: "Винести у відкрите питання"
  description: "Прибираю рішення з секції і додаю рядок у таблицю Open-Questions з owner+due (питаю наступним кроком). Без обох — рішення стає Drop."
- label: "Викинути"
  description: "Прибираю рішення. Якщо воно обов'язкове — переформулюю опції і питаю ще раз; якщо опціональне — лишаю без заміни."
```

## Why (feedback, 2026-05-23)

The user is a PM, methodist, or junior dev opening the repo for the first time. Terse English questions give them neither the substance of the decision nor the difference between options. Verbatim: «Треба щоб пояснення були ще більш зрозумілими для людей котрі буквально джуни в розробці».
