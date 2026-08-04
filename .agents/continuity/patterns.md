# Continuity Patterns

This file records source-of-truth examples and continuity rules for this repo.

## Active Patterns

### Pattern: persisted-data-compatibility-migrations

- **Status:** active
- **Scope:** `src/features/*/infrastructure/migrations/**/*.ts`
- **Enforcement:** changed-files
- **Default check:** changed-files
- **Source of truth:**
  - `src/features/check-in/infrastructure/migrations/database-migration.ts` - canonical migration contract and branded identity.
  - `src/features/check-in/infrastructure/migrations/database-migration.runner.ts` - canonical ledger, ordering, transaction, and failure behavior.
  - `src/features/check-in/infrastructure/migrations/database-migrations.ts` - canonical append-only registry.
  - `src/features/check-in/infrastructure/migrations/occurrence-time.database-migration.ts` - canonical concrete data migration.
  - `docs/migrations/2026-08-03-check-in-occurrence-time.md` - canonical migration rationale and lifecycle documentation.
- **Applies to:**
  - Persisted field changes whose legacy storage representation cannot pass the current domain schema directly.
- **Do not apply to:**
  - `src/features/*/domain/**/*.ts` - domain code must not recognize storage-client sentinel values.
- **Rule summary:** Keep persisted-data upgrades in the owning feature's infrastructure migrations folder. Run ordered pending migrations against a schema-validated durable ledger before repository hydration. Commit each idempotent data change and its ledger entry in one transaction, then keep repository decoding strict to the current domain shape.
- **Required shape:**
  - Direct file import; do not add a barrel file.
  - Immutable, zero-padded migration ID in an append-only ordered registry.
  - Idempotent ledger-table bootstrap must precede the first ledger read on a fresh native database.
  - Effect Schema validates external or persisted input.
  - `Schema.TaggedError` models ledger reads, ledger decoding, and application failures.
  - Runner tests cover pending, already-applied, malformed-ledger, and failure/retry cases; repository tests cover the consumer boundary.
  - Native Harness coverage is required when native serialization differs from JavaScript mocks.
  - Lifecycle docs list owned files, startup flow, archive behavior, verification, addition procedure, and compaction criteria.
- **Allowed variations:**
  - Temporary read-time normalization may be used only as an incident bridge and must have an explicit replacement/removal plan.
  - Independently versioned external formats, such as backup archives, migrate at their decode boundary and do not import the database ledger.
- **Severity:**
  - high: persisted legacy input can make hydration fail or data appear unavailable.
  - medium: migration behavior lacks direct or consumer-boundary tests.
  - low: lifecycle documentation lacks a removal criterion.
- **Baseline exceptions:**
  - `src/features/check-in/infrastructure/check-in.repository.ts` - the older AsyncStorage-to-SurrealDB migration predates this folder pattern.
- **Violation signals:**
  - Storage-client sentinel checks in domain or UI code.
  - New legacy normalization implemented inline in a repository.
  - A repository query can run before pending database migrations finish.
  - A shipped migration ID is reordered, renamed, reused, or given new meaning.
- **CI behavior:** Fail changed migration files that violate the required shape; legacy files outside the changed scope are advisory.
- **Fix strategy:** Add an idempotent migration definition, append its immutable ID to the registry, rely on the shared runner transaction, make current-schema repository decoding strict, add boundary/native tests, and document lifecycle expectations.
