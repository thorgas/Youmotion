# Continuity Patterns

This file records source-of-truth examples and continuity rules for this repo.

## Active Patterns

### Pattern: destructive-action-confirmation

- **Status:** active
- **Scope:** `src/features/*/ui/*.{ts,tsx}`
- **Enforcement:** changed-files
- **Default check:** changed-files
- **Source of truth:**
  - `src/features/settings/ui/belief-library-removal.ts` - canonical native confirmation for removing one user-owned item.
  - `src/features/settings/ui/belief-library-screen.tsx` - canonical visible destructive action beside a primary edit action.
  - `src/features/check-in/ui/check-in-deletion.ts` - canonical permanent-delete wording and destructive alert role.
- **Applies to:**
  - User-triggered deletion or removal of one locally persisted item.
- **Do not apply to:**
  - `src/features/data-safety/ui/data-safety-controls.tsx` - deleting all journal data uses an actor-owned inline confirmation because its scope and recovery guidance are larger.
- **Rule summary:** Show an explicit, clearly labeled destructive action, then require a native confirmation alert with Cancel first and a destructive final action. Explain the concrete local consequence before dispatching the persistence event.
- **Required shape:**
  - The visible action uses `palette.danger` and the same restrained outlined hierarchy as nearby actions.
  - The alert provides a cancel button with `style: 'cancel'` before the final button with `style: 'destructive'`.
  - Only the confirmed callback dispatches the domain or navigation event that mutates storage.
  - Copy names the item and states what disappears or remains.
- **Allowed variations:**
  - High-impact bulk deletion may use an actor-owned inline confirmation surface instead of `Alert.alert`.
- **Severity:**
  - high: deletion occurs without confirmation or the destructive action is visually ambiguous.
  - medium: consequence copy is vague or the destructive button role is missing.
  - low: action spacing differs from the nearest card pattern.
- **Baseline exceptions:**
  - `src/features/check-in/ui/history-screen.tsx` - long-press is retained for dense history rows, with an accessibility hint and the same native confirmation.
- **Violation signals:**
  - A delete/remove event is sent directly from a visible button without a confirmation boundary.
  - An `Alert.alert` delete action lacks `style: 'destructive'` or Cancel is absent.
- **CI behavior:** Fail changed destructive flows that bypass confirmation; existing exceptions are advisory.
- **Fix strategy:** Extract localized confirmation copy into the owning UI feature, route the confirmed callback through the existing actor event, and reuse the nearest outlined destructive-button styles.
- **Open questions:**
  - None.

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
