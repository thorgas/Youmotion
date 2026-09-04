# Continuity Patterns

This file records source-of-truth examples and continuity rules for this repo.

## Active Patterns

### Pattern: positive-leitsatz-semantic-surface

- **Status:** active
- **Scope:** `src/features/**/ui/*.tsx`
- **Enforcement:** changed-files
- **Default check:** changed-files
- **Source of truth:**
  - `src/features/check-in/ui/history-screen.tsx` - canonical compact positive-Leitsatz card.
  - `src/features/check-in/ui/success-screen.tsx` - canonical prominent positive-Leitsatz card.
- **Applies to:**
  - Read-only and editable surfaces whose primary content is a positive Leitsatz.
- **Do not apply to:**
  - Restrictive Leidsatz content, explanatory copy, reminder metadata, status notices, or mixed educational examples.
- **Rule summary:** The supportive Leitsatz itself owns the calm green semantic surface. Nearby descriptions and operational status use neutral surfaces so green never implies that metadata is the positive content.
- **Required shape:**
  - Use `palette.selectionWash` with a moss border and moss label for a positive-Leitsatz surface.
  - Keep the Leitsatz text at normal high-contrast ink color.
  - Keep explanatory and status surfaces neutral even when they refer to a positive Leitsatz.
- **Allowed variations:**
  - Analytics may use one green insight hero around the Leitsatz and its evidence instead of nesting another card.
- **Severity:**
  - medium: green emphasis is attached to explanation or status while the positive Leitsatz remains neutral.
  - low: border strength or radius varies to match the surrounding hierarchy.
- **Baseline exceptions:**
  - `src/features/onboarding/ui/onboarding-example-step.tsx` - a mixed educational example, not a user-owned positive-Leitsatz surface.
- **Violation signals:**
  - `guidingStatement` is rendered on `palette.paper` or `palette.paperRaised` while adjacent description or reminder metadata uses `palette.selectionWash`.
- **CI behavior:** Fail changed positive-Leitsatz surfaces that invert the semantic emphasis.
- **Fix strategy:** Move the selection wash and moss border to the statement container or editor, then return adjacent explanation and status containers to a neutral surface.
- **Open questions:**
  - None.

### Pattern: leitsatz-owned-reminder-configuration

- **Status:** active
- **Scope:** `src/features/reminders/**`, `src/features/beliefs/ui/belief-library-screen.tsx`, `src/navigation/app-navigation.machine.ts`
- **Enforcement:** changed-files
- **Default check:** changed-files
- **Source of truth:**
  - `src/features/reminders/domain/reminder-assignment.ts` - one assignment owns its timing and notification content.
  - `src/features/reminders/ui/leitsatz-reminder-screen.tsx` - configures timing and content immediately after a Leitsatz or from Leitsatz management.
  - `src/features/beliefs/ui/belief-library-screen.tsx` - exposes each Leitsatz reminder's status and actions beside that Leitsatz.
- **Applies to:**
  - Gentle reminders attached to one Leitsatz.
- **Do not apply to:**
  - Pulse reminder configuration, which remains a general setting.
- **Rule summary:** A Leitsatz reminder is an assignment with private timing and content preferences, not a reference to a named reusable schedule. Create and manage it in the Leitsatz flow; keep Settings focused on the general Pulse reminder.
- **Required shape:**
  - Persist weekdays, local times, and notification content on the reminder assignment.
  - Offer general or full-Leitsatz notification content when the assignment is first configured and when it is edited.
  - Manage assignment status, timing, content, and removal from the owning Leitsatz card.
- **Violation signals:**
  - A schedule picker or schedule name is introduced for Leitsatz reminders.
  - Leitsatz reminder management is available only from the general Settings reminder screen.
- **CI behavior:** Fail changed Leitsatz reminder flows that reintroduce shared schedule ownership.
- **Fix strategy:** Move timing and content into the assignment boundary and project its actions through Leitsatz management.
- **Open questions:**
  - None.

### Pattern: destructive-action-confirmation

- **Status:** active
- **Scope:** `src/features/*/ui/*.{ts,tsx}`
- **Enforcement:** changed-files
- **Default check:** changed-files
- **Source of truth:**
  - `src/features/beliefs/ui/belief-library-removal.ts` - canonical native confirmation for removing one user-owned item.
  - `src/features/beliefs/ui/belief-library-screen.tsx` - canonical visible destructive action beside a primary edit action.
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
  - `src/infrastructure/database/migrations/database-migration.ts` - canonical migration contract and branded identity.
  - `src/infrastructure/database/migrations/database-migration.runner.ts` - canonical ledger, ordering, transaction, and failure behavior.
  - `src/infrastructure/database/migrations/database-migrations.ts` - canonical append-only registry.
  - `src/infrastructure/database/migrations/occurrence-time.database-migration.ts` - canonical concrete data migration.
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

### Pattern: actor-owned-global-ui-flow

- **Status:** active
- **Scope:** `src/features/*/application/*.machine.ts`, `src/features/*/ui/*.tsx`, `src/app/_layout.tsx`
- **Enforcement:** changed-files
- **Default check:** changed-files
- **Source of truth:**
  - `src/features/startup/application/animated-splash.machine.ts` - models a root-level UI flow and runtime work as an XState machine.
  - `src/features/startup/ui/animated-splash-screen.tsx` - renders a root-level overlay from one actor snapshot without component state or effects.
  - `src/app/_layout.tsx` - composes global UI providers and overlays around the app navigator.
- **Applies to:**
  - `src/features/*/application/*.machine.ts`
  - `src/features/*/ui/*.tsx`
  - `src/app/_layout.tsx`
- **Do not apply to:**
  - `src/app/(tabs)/_layout.tsx` - tab presses project into the existing root navigation actor and do not own a separate flow.
- **Rule summary:** Root-level UI flows belong in a feature-local XState machine. The UI component owns its events, reads one actor snapshot, and is composed once at the root without creating navigation state.
- **Required shape:**
  - Put durable flow state and transitions in an application machine.
  - Render the overlay from one `useMachine` actor hook in the feature UI component.
  - Keep runtime adapters behind the application or infrastructure boundary; UI must not import infrastructure.
  - Compose the global feature once in `src/app/_layout.tsx` without adding routes or navigation state.
- **Allowed variations:**
  - Pure presentation components may receive narrow callbacks from the actor-owning component.
- **Severity:**
  - high: UI imports infrastructure or introduces a second navigation state.
  - medium: local component state or effects duplicate machine state.
  - low: a presentation helper can be made more leaf-local.
- **Baseline exceptions:**
  - None.
- **Violation signals:**
  - `src/features/*/ui/*` imports `../infrastructure`.
  - Root-level flow UI uses `useState` or `useEffect`.
- **CI behavior:** Fail when a changed file contains a high- or medium-severity violation.
- **Fix strategy:** Move flow state into a feature-local machine, keep runtime work behind application/infrastructure, and derive the overlay from a single actor snapshot.
- **Open questions:**
  - None.
