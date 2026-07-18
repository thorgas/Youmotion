# Database

This document is the source of truth for Youmotion's current database setup, persisted check-in schema, migration behavior, native packaging, and database-related development workflow.

## Overview

Youmotion is local-first. Check-ins are stored in an embedded SurrealDB database backed by SurrealKV inside the app's document directory. The app does not currently connect to a remote database, upload check-ins, or configure database credentials.

The persistence path is:

```text
UI event
  -> root XState navigation machine
  -> Effect repository operation
  -> Effect Schema encode/decode boundary
  -> react-native-surrealdb
  -> embedded SurrealKV files in the app document directory
```

The relevant ownership boundaries are:

- `src/features/check-in/domain/check-in.ts`: canonical persisted check-in schema and types.
- `src/features/check-in/domain/belief-system.ts`: stable belief-system IDs, emotion mappings, and history-based recommendation ranking.
- `src/features/check-in/infrastructure/check-in.repository.ts`: queries, persistence, legacy migration, and typed errors.
- `src/features/check-in/infrastructure/surrealdb.database.ts`: filesystem location and shared native connection.
- `src/features/check-in/application/check-in-history.store.ts`: validated in-memory history projection.
- `src/navigation/app-navigation.machine.ts`: hydration, save, retry, and edit workflows.
- `src/constants.ts`: database, table, retention, and legacy-storage constants.

UI code must not import the infrastructure layer directly. Database work is initiated by the root actor and reported back through schema-typed machine events.

## Runtime configuration

The database configuration is defined in `src/constants.ts`:

| Setting | Current value | Meaning |
| --- | --- | --- |
| Directory | `youmotion-surrealdb` | Child of Expo's platform-specific app document directory |
| Endpoint prefix | `surrealkv://` | Selects the embedded SurrealKV engine |
| Namespace | `youmotion` | SurrealDB namespace |
| Database | `local` | SurrealDB database within the namespace |
| Check-in table | `check_in` | Table containing captured moments |
| History read limit | `30` | Maximum records loaded into the current app history |
| Note limit | `240` | Maximum persisted note length |
| Legacy key | `youmotion.check-ins.v1` | Previous AsyncStorage location, used only for migration |

`surrealdb.database.ts` creates the directory with Expo FileSystem using `Paths.document`. It accepts only a `file://` URI and converts it into a `surrealkv://` endpoint. The exact absolute path is assigned by iOS or Android and must not be hard-coded.

The module caches one connection promise for the JavaScript runtime. Concurrent callers share that connection. A failed connection clears the cached promise so a later call can retry. The app does not currently close the connection explicitly; the native process lifecycle owns cleanup.

## Check-in record schema

The application-level schema is `CheckInSchema` in `src/features/check-in/domain/check-in.ts`.

Each logical check-in contains:

| Field | Application type and constraints | Purpose |
| --- | --- | --- |
| `id` | Branded string | Stable application identity |
| `createdAt` | Branded string | Creation timestamp; newly created values use ISO 8601 UTC |
| `emotionId` | `freude`, `liebe`, `scham`, `ekel`, `trauer`, `wut`, or `furcht` | Locale-independent base emotion |
| `intensity` | Number from `0` through `1` | Normalized radial intensity |
| `level` | Optional non-negative integer | Stable nuance bucket |
| `note` | String of at most 240 characters | Optional reflection text |
| `beliefSystemId` | Optional value from the stable `BELIEF_SYSTEM_IDS` vocabulary | Attached negative core belief, independent of display language |

The SurrealDB record ID is constructed as:

```text
check_in:<application check-in ID>
```

Writes also store `checkInId`, which preserves the application's string ID independently of SurrealDB's intrinsic record ID. Reads project `checkInId AS id` before decoding the result.

The database decoder accepts `level` as either a JavaScript-safe non-negative integer or a non-negative `bigint`. This accounts for SurrealDB's lossless integer transport. It converts valid `bigint` values to numbers and rejects values larger than `Number.MAX_SAFE_INTEGER`.

The following values are deliberately not persisted:

- Localized emotion or nuance labels
- Localized belief-system text
- Display color and wash color
- Derived display copy
- Navigation or transient UI state

Localized labels and colors are derived from stable IDs when rendering. Older records without `level` remain supported; the app derives their level from intensity and clamps it to the emotion's available nuance range. The repository also normalizes integral SurrealDB numbers returned as bigints before domain validation. `beliefSystemId` is optional, so records written before the belief-system feature decode without a data migration. The native SurrealDB client represents a selected-but-absent optional field as `NONE`; the repository schema normalizes that boundary value to an omitted domain property.

### Database schema enforcement

There is currently no SurrealQL `DEFINE TABLE` or `DEFINE FIELD` migration. The `check_in` table is schema-less at the SurrealDB layer. Correctness is enforced at application boundaries with Effect Schema:

- Values are encoded through `CheckInSchema` before an upsert.
- Query results are decoded through the repository's database schema.
- Invalid rows fail loading with `CheckInDataError`; they are not silently accepted.
- XState machine events and the history store validate the same domain shape.

This means a schema change is not complete until domain schemas, database decoding, write payloads, migration behavior, and tests have all been updated.

## Operations

### Create

`persistCheckIn` creates an ID from the current timestamp plus a random suffix and creates an ISO timestamp. It trims leading and trailing whitespace from the note, schema-encodes the record, and executes:

```sql
UPSERT $record CONTENT $checkIn
```

The record ID and content are passed as query parameters. The table name is a source-controlled constant, not user input.

### Update

Editing uses the same upsert operation with the existing record. It preserves `id` and `createdAt` while replacing emotion, intensity, level, note, and the optional `beliefSystemId`. Therefore an edit updates one captured moment instead of inserting a duplicate.

### Read and hydrate

At root-machine startup, `loadCheckIns` executes the equivalent of:

```sql
SELECT checkInId AS id, createdAt, emotionId, intensity, level, note, beliefSystemId
FROM check_in
ORDER BY createdAt DESC
LIMIT $limit
```

The result is decoded before it is sent through `HISTORY_HYDRATED` into `checkInHistoryStore`. A failed query or invalid row produces `HISTORY_HYDRATION_FAILED` instead.

ISO timestamps sort correctly as strings when they use the same UTC representation. The current schema brands `createdAt` as a string but does not itself validate ISO syntax, so any future external importer must validate and normalize timestamps before persistence.

### Delete

The edit screen exposes a full-width destructive “Delete moment” action. In History, the same confirmation is available from the visible trailing delete action and by long-pressing the moment row. All three entry points send `DELETE_REQUESTED` to the root actor only after destructive confirmation. `deleteCheckIn` then removes the exact record with:

```sql
DELETE $record
```

The in-memory history entry is removed only after the repository succeeds and emits `DELETED`. Deleting the moment currently open for editing also clears the editing context and returns to History. A failed delete leaves the entry visible and produces `CheckInStorageError` with operation `delete`; the history screen shows a local error message. The app does not currently expose clear-history, export, reset, undo, or data-recovery operations.

### Recommendation data

The 18 belief systems are stored as source-controlled IDs rather than database entities. `domain/belief-system.ts` defines a many-to-many default mapping between emotions and belief systems. Every belief system remains available for every emotion; the mapping changes ordering only.

For a new or edited check-in, ranking uses:

1. How often each belief system was previously attached to the same base emotion in the loaded local history.
2. The source-controlled default order for that emotion.
3. The global catalog order for all remaining belief systems.

No belief system is attached by default. The reflection is persisted first, without a belief system for new records, and the optional second step then offers the first three ranked values as quick suggestions. A clearly labeled catalog button opens every available belief system. Attaching a selection updates the already-saved check-in; skipping leaves the saved reflection unchanged. Recommendation learning is fully local and currently considers the loaded history projection, which is capped at 30 records.

For an existing record, the first save preserves its current belief-system ID while updating the reflection. The optional second step can then retain, replace, or remove that attachment. This prevents the intermediate save from silently discarding an existing belief system.

### Retention

`MAX_CHECK_IN_HISTORY = 30` limits the read query and in-memory history. It does **not** delete older rows from SurrealDB. If physical retention must also be capped, add an explicit, tested pruning operation rather than assuming the history limit performs cleanup.

## Legacy AsyncStorage migration

Before SurrealDB, check-ins were stored as JSON under `youmotion.check-ins.v1` in AsyncStorage. The migration path is:

1. Query the recent SurrealDB check-ins.
2. If SurrealDB returns at least one entry, use those entries and skip legacy migration.
3. If SurrealDB returns no entries, read and schema-decode the legacy JSON.
4. Upsert legacy entries sequentially into SurrealDB.
5. Remove the AsyncStorage key only after all upserts succeed.

Legacy records may contain localized `emotion` and `nuance` fields. The legacy decoder ignores those labels and retains the stable emotion ID and numeric intensity.

Important limitation: migration is currently gated on the recent SurrealDB query being empty. It is not a versioned migration ledger and does not merge legacy data into a partially populated database. Future migrations should use an explicit schema-version record and be idempotent.

## Error model

Expected repository failures remain in the Effect error channel:

- `CheckInStorageError`
  - `read`: native connection or query failure while loading
  - `write`: native upsert failure
  - `delete`: native per-record deletion failure
  - `migrate`: failure removing migrated AsyncStorage data
- `CheckInDataError`
  - `decode`: invalid legacy JSON or invalid database results
  - `encode`: application data fails the persisted schema

The root machine maps failures to user-facing state and supports retrying a failed save. Raw native causes are not displayed to the user.

## Privacy, security, and lifecycle

Current guarantees from the implementation:

- The configured endpoint is embedded `surrealkv://`, not `ws://` or `wss://`.
- No remote host, authentication credentials, synchronization, analytics database, or upload path is configured.
- Database files live in the platform-managed app document directory.
- Persisted labels are locale-independent, minimizing migration problems when the UI language changes.

Current non-guarantees and limitations:

- The app does not add application-level database encryption or manage an encryption key.
- Platform sandboxing and device storage protection are relied upon; their effective behavior depends on OS and device configuration.
- Backup inclusion/exclusion is not explicitly configured or tested in this repository.
- There is no user-facing export, delete-all, undo, or data recovery flow.
- Uninstall, restore, and OS backup behavior is platform-managed and should be tested before making stronger product claims.

Any change to the statement that data stays exclusively on the device requires a security and product review of every new transport, backup, telemetry, and remote-storage path.

## Native package setup

`react-native-surrealdb` is currently consumed from:

```json
"react-native-surrealdb": "link:vendor/react-native-surrealdb"
```

The vendored package is pinned in `vendor/README.md` to upstream commit `13cf061bbeca15fe5cfd3e3089146dbedbb2f61b`. It uses the official Rust SDK through generated UniFFI/Hermes JSI bindings and requires a native development build. Expo Go cannot load it.

Required ignored native artifacts are:

```text
vendor/react-native-surrealdb/SurrealDbRnFramework.xcframework/
vendor/react-native-surrealdb/android/src/main/jniLibs/arm64-v8a/libsurrealdb_rn_core.so
vendor/react-native-surrealdb/android/src/main/jniLibs/armeabi-v7a/libsurrealdb_rn_core.so
vendor/react-native-surrealdb/android/src/main/jniLibs/x86/libsurrealdb_rn_core.so
vendor/react-native-surrealdb/android/src/main/jniLibs/x86_64/libsurrealdb_rn_core.so
```

The large binaries are excluded from normal Git history. `.easignore` explicitly includes local copies in EAS upload archives. `eas-build-pre-install` runs the vendor verification script and fails early when the artifacts required for the target platform are missing or empty.

Validate the local vendor before a native build:

```bash
pnpm verify:surrealdb-vendor
```

To refresh the vendor, build release artifacts in the source package repository, copy the publishable package into `vendor/react-native-surrealdb`, update the pinned commit in `vendor/README.md`, and rerun verification. After the package is published, replace the `link:` dependency with an exact compatible package version and remove vendor-only build plumbing.

## Development and testing

Because the database module contains native code, use a development client:

```bash
pnpm android
pnpm ios --device
pnpm start
```

Use `pnpm start:tunnel` when a physical device cannot reach Metro over the local network. Rebuild the development client after changing the native package or native artifacts; ordinary TypeScript repository changes can reload through Metro.

Database coverage is split across:

- `surrealdb.database.test.ts`: directory creation, singleton connection, URI rejection, and retry after failure.
- `check-in.repository.test.ts`: encode/decode, create, update, delete, legacy migration, integer transport, and tagged failures using a mocked client.
- `belief-system.test.ts`: catalog completeness, many-to-many defaults, and history-based ranking.
- `belief-system.harness.ts`: recommendation ranking inside the React Native runtime, guarding against JavaScript-engine API mismatches.
- `app-navigation.machine.test.ts`: hydration, persistence, failure, retry, edit, belief-system attachment, and delete event paths.
- `check-in.repository.harness.ts`: real persistence and reload through the native SurrealKV engine, with record cleanup.

Run the standard gates:

```bash
pnpm verify
pnpm test:coverage
pnpm verify:surrealdb-vendor
```

Run `pnpm test:harness:ios` to exercise the React Native runtime and native engine on the configured iOS simulator. The script reserves port 8083 and passes it to the Expo development client at launch, so an existing Metro server does not make Harness wait at the development-server chooser. A plain web environment cannot validate Hermes or the native SurrealDB binding.

## Schema-change checklist

For every persisted-schema or database-behavior change:

1. Update the domain schema in `domain/check-in.ts`.
2. Update the database result schema and write payload in `check-in.repository.ts`.
3. Decide how existing rows and missing fields decode.
4. Add an explicit, idempotent migration when old data cannot decode directly.
5. Preserve stable record IDs unless the change intentionally creates a new entity.
6. Keep localized strings and UI-only values out of persisted records.
7. Model expected failures with `Schema.TaggedError`.
8. Add repository tests for new, old, invalid, and failure cases.
9. Add or update the native Harness path when native query behavior changes.
10. Add navigation model coverage when persistence events or states change.
11. Run all database and repository verification commands.
12. Update this document in the same change.

## Known gaps to resolve before expanding persistence

- Introduce a durable schema-version record and ordered migration system.
- Decide whether the 30-entry product limit should also prune physical rows.
- Add delete-all, export, undo, and reset semantics with corresponding privacy copy.
- Validate timestamp syntax rather than branding any string.
- Replace timestamp-plus-`Math.random` IDs if cryptographically strong or cross-device identities become necessary.
- Define and test OS backup policy and data-protection expectations.
- Decide whether and when the shared connection should close during app lifecycle transitions.
- Add database-level table and field definitions if storage-level enforcement becomes a requirement.
