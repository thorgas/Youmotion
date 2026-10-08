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

## Settings design

- Keep the main Settings screen a list of the existing `SettingsActionRow` links. Notification and reminder configuration belongs on a dedicated subpage, like `ReminderSettingsScreen`; never embed a large configuration card directly between Settings sections.
- Reuse the existing reminder page's back button, safe-area, typography and spacing. Open the subpage through the root navigation machine and cover its open/back paths.

## Type and data safety

- TypeScript 7 strict checks are the source of truth. Never add a type assertion or non-null assertion.
- Define external and persisted data with Effect Schema. Do not add Zod or raw `JSON.parse`.
- Prefer branded domain primitives and parse once at boundaries.
- Put domain vocabulary and repeated configuration in `src/constants.ts`.
- Model expected failures as `Schema.TaggedError`; reserve defects for impossible states.
- Prefer guard clauses and shallow control flow. Do not add `switch` statements.
- Target the installed native Hermes runtime, not Node's JavaScript capabilities. Hermes in this project does not support `Array.prototype.toSorted`; use a fresh copy followed by `.sort()` with the existing documented lint exception. The local `architecture/no-unsupported-hermes-apis` rule rejects `toSorted` in application code. Do not accept an autofix to an unsupported API.

## Verification

- Add performance lint restrictions only for measured cases. `architecture/no-slow-english-locale-lowercase` rejects explicit `toLocaleLowerCase("en")` calls, the case measured in Hauswirtschaft's Android ICU profile (`../recipe-manager/docs/ANDROID_PERFORMANCE.md`). Use `toLowerCase` only when its semantics fit; an exception requires correctness tests and Android profiling. Do not extend this restriction to `localeCompare`, other casing methods or other locales without measurements.

- Use pnpm exclusively for dependency management and project scripts.
- Run `pnpm verify` for lint, TypeScript 7, and Jest.
- Run `pnpm test:coverage`; never lower the configured coverage thresholds.
- Before implementing behavior that crosses runtime boundaries, define a user-observable test matrix. Cover each applicable combination of module-initialized state, native or platform inputs, hydration or persistence success and failure, and fallbacks visible before asynchronous initialization completes. Add consumer-boundary tests for every meaningful case rather than testing producers only in isolation.
- Never let a SurrealQL statement reach production covered only by a string assertion against a mocked client. A mocked `query` never parses the statement, so an unsupported construct passes Jest and fails on every device. Execute every migration and every persisted-data transaction against the native runtime with React Native Harness.
- Populate device runs from the committed archive fixture at `src/features/data-safety/__tests__/fixtures/legacy-archive.fixture.json` — 133 moments and 15 guiding beliefs, 12 suggested and 3 authored. It is synthetic by design; never replace it with a personal backup, and never capture screenshots from real journal data.
- Add model-path coverage when changing navigation states or events.
- Add or update a custom Oxlint rule test when changing an architectural invariant.
- Use React Native Harness for device-level component interactions.
- Rerun native consumer checks after every late change to code executed on device, including seemingly small ordering or formatting changes. A prior native pass does not cover later edits. Jest/TypeScript passing does not prove Hermes API support; exercise the actual screen calculation directly in Harness so coordinator error handling cannot hide a runtime exception.

The local Oxlint plugin enforces these rules. A suppression requires an explicit architectural reason and a corresponding test.

## Store releases

- Follow `docs/release/store-release-workflow.md`. Use EAS-managed credentials and explicit build IDs for binary uploads. The local gplay credential successfully validated and committed production build 18 on 2 October 2026; recheck current access rather than assuming the earlier permission failure persists. CLI submission does not require an unlocked Mac.
- After the EAS Android submission finishes, set the exact committed English/German release notes through gplay or Play Console, then read back the exact version code, notes and intended release status. For a Console draft, use **Save as draft**. Do not edit Console during an active EAS upload.
- Send changes for review only with user authorization. If Google rejects `--changes-not-sent-for-review` because review is automatic, omit it only when that authorization already exists. Keep managed publishing enabled when approval must be separate from public rollout. For future Expo review submissions, use production `releaseStatus: "completed"` and `changesNotSentForReview: false`; localized notes still require a separate step. Changing this configuration does not submit an existing draft.
- Distinguish upload, draft creation, review submission and public rollout. Verify actual native-store state; an EAS job finishing alone is insufficient. Permission expansion requires explicit user authorization.

## Release completion

- Follow docs/release/store-release-workflow.md through the requested endpoint. Upload/staging is not review submission. Once review or tester distribution is authorized, finish those steps and read back exact version/build, submission IDs and tester availability gates.
- Prefer asc/gplay mutations and status commands. gplay tracks releases list exposes releaseLifecycleState without an edit; do not infer review or publication from edit completed. Verify managed publishing separately when public rollout is not authorized.
- For TestFlight, fill Beta App Descriptions and beta-review contact/notes through asc before external beta submission. Internal all-build-access groups must not be explicitly attached. No new binary is needed to assign an existing eligible build to testers.
