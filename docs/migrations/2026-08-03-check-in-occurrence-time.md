# Check-in occurrence-time compatibility migration

## Summary

The editable moment-time feature added `occurredAt` to check-ins so a person can record when an emotion happened and change that value later from History. Check-ins created by older app versions do not contain the field.

When SurrealDB selects an absent field, the native client returns its `NONE` sentinel as `{ kind: "none" }`. Treating `occurredAt` as an ordinary optional JavaScript property was therefore insufficient: one legacy row could fail the Effect Schema decode for the complete query result and make History appear empty even though the local records were still intact.

## Source location

The compatibility migration lives in:

```text
src/features/check-in/infrastructure/migrations/
  legacy-occurrence-time.migration.ts
```

It is deliberately inside check-in infrastructure because SurrealDB's `NONE` representation is a storage-boundary concern. Domain and UI code continue to receive only valid `CheckIn` values with a string `occurredAt`.

## Behavior

| Stored `occurredAt` | Application value |
| --- | --- |
| Valid timestamp string | Preserve the stored value |
| SurrealDB `NONE` | Use `createdAt` |
| Field omitted by a mock, importer, or alternate client | Use `createdAt` |

The migration runs while database results are decoded. It is non-destructive and idempotent: it does not rewrite or delete the original row, and reading an already migrated check-in preserves its explicit occurrence time. The next normal save writes `occurredAt` through `CheckInSchema`.

This read-time approach is required for the hotfix because it restores access before any write can occur. It also avoids mutating a private journal merely to upgrade its representation.

## Incident and data evidence

The issue appeared after the editable moment-time EAS Update. The supplied exported backup contained 133 valid check-ins with `createdAt` values and no `occurredAt` fields, matching the legacy shape. The rollback restored the previous app behavior and confirmed that journal data had not been deleted.

The same feature commit also used `Array.prototype.toSorted` when ordering moments. The app's Hermes runtime does not provide that method, so startup could fail before hydration. The hotfix keeps the sort immutable with `entries.slice().sort(...)` and covers that path in `check-in-history.store.harness.ts` on the device runtime.

The failing path was:

```text
legacy row without occurredAt
  -> SurrealDB SELECT returns NONE
  -> query-result schema rejects the row
  -> history hydration fails
  -> History renders without the stored entries
```

The migration changes the decode path to:

```text
legacy row without occurredAt
  -> SurrealDB SELECT returns NONE
  -> migration maps NONE to createdAt
  -> CheckInSchema receives a complete value
  -> History hydrates normally
```

## Verification

Coverage is split across three boundaries:

- `legacy-occurrence-time.migration.test.ts` verifies missing, `NONE`, and already-migrated values directly.
- `check-in.repository.test.ts` verifies the complete repository decode with the native sentinel shape.
- `check-in.repository.harness.ts` inserts a legacy row into native SurrealKV and verifies that History data loads with `occurredAt` equal to `createdAt`.
- `check-in-history.store.harness.ts` verifies occurrence-time sorting on the app's native JavaScript runtime.

Run:

```bash
pnpm verify
pnpm test:coverage
pnpm test:harness:ios
```

## User interface

During creation, the compact time control stays beside the selected emotion and opens the native date/time editor only when requested:

![Native moment-time editor during creation on iOS](../screenshots/moment-time-create.png)

Android uses the same modal hierarchy and delegates date and time selection to separate native platform dialogs:

![Native moment-time editor during creation on Android](../screenshots/moment-time-create-android.png)

The same control is available while editing a saved History entry, with the existing occurrence time preselected:

![Native moment-time editor while editing History](../screenshots/moment-time-history-edit.png)

## Removal criteria

Do not remove this migration based on an app release date alone. Youmotion is local-first and users can return with records created by much older binaries or restore an older export. Removal is safe only after a durable, versioned, idempotent database migration has backfilled every legacy row and backup import independently normalizes missing occurrence times.
