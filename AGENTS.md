# Youmotion engineering rules

Read the exact Expo SDK 57 documentation at https://docs.expo.dev/versions/v57.0.0/ before changing Expo or React Native code.

## Subagents

- Use the `spark_worker` subagent for clear, repetitive, low-judgment work such as running tests, lint, coverage, E2E flows, command verification, log summarization, and narrow mechanical audits.
- Keep architecture, implementation strategy, debugging decisions, security review, and ambiguous work with the primary model.
- If `spark_worker` reports an unclear failure, the primary model must investigate it.
- If `spark_worker` or GPT-5.3-Codex-Spark is unavailable in the current runtime, use the cheapest available subagent model for the same bounded work and report the substitution.

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

- Use pnpm exclusively for dependency management and project scripts.
- Run `pnpm verify` for lint, TypeScript 7, and Jest.
- Run `pnpm test:coverage`; never lower the configured coverage thresholds.
- Before implementing behavior that crosses runtime boundaries, define a user-observable test matrix. Cover each applicable combination of module-initialized state, native or platform inputs, hydration or persistence success and failure, and fallbacks visible before asynchronous initialization completes. Add consumer-boundary tests for every meaningful case rather than testing producers only in isolation.
- Never let a SurrealQL statement reach production covered only by a string assertion against a mocked client. A mocked `query` never parses the statement, so an unsupported construct passes Jest and fails on every device. Execute every migration and every persisted-data transaction against the native runtime with React Native Harness.
- Populate device runs from the committed archive fixture at `src/features/data-safety/__tests__/fixtures/legacy-archive.fixture.json` — 133 moments and 15 guiding beliefs, 12 suggested and 3 authored. It is synthetic by design; never replace it with a personal backup, and never capture screenshots from real journal data.
- Add model-path coverage when changing navigation states or events.
- Add or update a custom Oxlint rule test when changing an architectural invariant.
- Use React Native Harness for device-level component interactions.

The local Oxlint plugin enforces these rules. A suppression requires an explicit architectural reason and a corresponding test.
