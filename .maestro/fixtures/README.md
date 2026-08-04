# Synthetic power-user backup fixture

## What it is for

`youmotion-power-user-backup-v2-redacted.json` is a fully synthetic archive modeled only on the structural scale of a real power-user export:

- 133 moments
- 15 saved beliefs, including three custom beliefs
- dense history, optional notes and belief links, and guiding-belief snapshots

Use it to exercise behavior that small hand-written examples do not stress: native document selection, whole-archive validation, atomic replacement, a long History list, relationships between moments and beliefs, search near the end of the dataset, and the current `occurredAt` model. It is test data, not a sample journal for demos or screenshots.

## Privacy boundary

No value from the private source archive is copied. Names and original free text are not retained. IDs, timestamps, emotion order, intensities, levels, notes, belief assignments, and statement text are generated deterministically by `scripts/generate-power-user-e2e-fixture.mjs`. The private backup is not an input to the generator and must never be added to the repository.

The fixture uses the current archive version and includes explicit `occurredAt` values, including synthetic moments whose occurrence time differs from their creation time. `power-user-e2e-fixture.test.ts` decodes the committed file through the production Effect Schema and verifies its scale, relationships, and synthetic text boundary.

## Keeping it current

Regenerate it with:

```bash
node scripts/generate-power-user-e2e-fixture.mjs
```

Run the focused schema regression after changing the archive model or generator:

```bash
pnpm test -- --runInBand src/features/data-safety/__tests__/power-user-e2e-fixture.test.ts
```

Commit the regenerated JSON together with the generator and schema test. If the archive version or persisted fields change, update all three so CI validates the same file the device test imports.

## E2E usage

The power-user restore is part of the normal Maestro suite; it does not have a separate test command. Keep the Maestro development server running in another terminal:

```bash
pnpm start:maestro
E2E_ALLOW_DATA_REPLACEMENT=true pnpm test:maestro
```

The runner exercises every booted platform: it runs the existing flows on iOS and Android when one simulator of each is available. Set `IOS_SIMULATOR_UDID` or `ANDROID_SERIAL` when multiple devices for a platform are booted. The `android-only` power-user flow is excluded on iOS because its fixture is delivered through Android's Downloads provider.

On Android, the acknowledgement is required because the suite intentionally replaces the selected emulator's Youmotion data. The runner configures the Metro reverse port, pushes the fixture to Downloads, restores through the native picker, verifies the 133/15 preview, confirms replacement, and searches History for the final synthetic moment. The shared Downloads copy is removed after the suite; the restored synthetic journal remains in the test app for inspection. An iOS-only run does not require the acknowledgement.

Do not run this command against a personal device or an emulator whose local journal you need. `pnpm test:maestro:smoke` remains the non-destructive short navigation gate and does not prepare or restore this fixture.
