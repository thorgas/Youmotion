# Youmotion engineering rules

Read the exact Expo SDK 57 documentation at https://docs.expo.dev/versions/v57.0.0/ before changing Expo or React Native code.

## Architecture

- Organize by vertical feature: `domain`, `application`, `infrastructure`, and `ui`.
- Domain code may import Effect Schema but no UI, storage, navigation, or platform framework.
- UI must communicate through actors and stores. It must not import infrastructure.
- Expo Router is a view of the root XState navigation machine. Never create a second navigation state.
- Components own their events and subscriptions. Do not add `useEffect`, `useState`, or inline JSX callbacks.
- Keep one XState actor hook per component and derive all related state from its snapshot.
- Do not create barrel files. Use direct imports, including Effect subpath imports.

## Type and data safety

- TypeScript 7 strict checks are the source of truth. Never add a type assertion or non-null assertion.
- Define external and persisted data with Effect Schema. Do not add Zod or raw `JSON.parse`.
- Prefer branded domain primitives and parse once at boundaries.
- Put domain vocabulary and repeated configuration in `src/constants.ts`.
- Model expected failures as `Schema.TaggedError`; reserve defects for impossible states.
- Prefer guard clauses and shallow control flow. Do not add `switch` statements.

## Verification

- Run `npm run verify` for lint, TypeScript 7, and Jest.
- Run `npm run test:coverage`; never lower the configured coverage thresholds.
- Add model-path coverage when changing navigation states or events.
- Add or update a custom Oxlint rule test when changing an architectural invariant.
- Use React Native Harness for device-level component interactions.

The local Oxlint plugin enforces these rules. A suppression requires an explicit architectural reason and a corresponding test.
