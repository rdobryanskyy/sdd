# Changelog — <slug>

<!-- instruction: write what changed and why, not a file list. Link the spec and the key ADRs.
Include the operational note (migrations, feature flags) that the deployer must have. Write it so
that a person who did not write the feature can read it. Write English prose in ASD-STE100. -->

## <slug> — <one-line summary>

**What:** <the user-facing capability that now exists, in plain language>.

**Why:** <the problem it solves — link [spec](../spec.md) §1/§2; cite the key decision(s) — [ADR-NNNN](../adr/NNNN-...md)>.

**How to use:** <the endpoint/flow + an example, from [openapi.yaml](../contracts/openapi.yaml)>.

**Operational notes:**
- Migration: <e.g. "adds 000023_create_notification_preferences — applied on deploy; reverts cleanly">, or `<!-- none -->`.
- Feature flag / config: <any>, or `<!-- none -->`.
- Rollback: <how to back out — usually `migrate down` + revert the deploy>.

**Acceptance criteria delivered:** <AC-01 … AC-NN — the business outcomes now guaranteed>.
