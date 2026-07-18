# Youmotion

Build, internal distribution, TestFlight, Google Play, and App Store release instructions are in [BUILD.md](./BUILD.md). Database setup, persisted schema, migration behavior, and native SurrealDB packaging are documented in [DB.md](./DB.md).

Youmotion is a private, local-first Expo app for noticing and recording emotions with a seven-direction German `Gefühlsstern`. Dragging from the center chooses an emotion; distance chooses nuance and intensity. Releasing opens a short reflection that is saved before a separate, optional belief-system step. Individual history entries can be edited or permanently deleted after confirmation from the edit screen, the visible History action, or a long press on the History row.

This is a self-reflection tool, not a substitute for psychotherapy, medical advice, diagnosis, or emergency support.

## Stack

- Expo SDK 57, React Native 0.86, React 19.2, and Expo Router
- TypeScript 7.0 as the authoritative compiler
- XState 6 alpha for the complete app and navigation state graph
- XState Store for reactive check-in history
- Effect and Effect Schema for workflows, validation, errors, and JSON persistence
- fbtee 2 with English source strings and a German BCP 47 translation catalog
- Jest, React Native Testing Library 14, and React Native Harness
- Oxlint with TypeScript-7-powered type-aware linting and a project-local architecture plugin

`typescript-7` runs application type checks. Oxlint's type-aware engine uses `oxlint-tsgolint`, which is based on TypeScript 7. TypeScript 6 remains under the standard package name for Expo compatibility and the isolated custom-rule test parser.

## Architecture

The root XState machine is the single source of truth for tabs, nested check-in interaction, reflection, persistence, success, and failure. Expo Router routes are only a declarative projection of the current machine state. That makes every destination reachable by an event path and keeps the graph serializable for later persistence and model-based testing.

Persistence and hydration run as root-machine entry effects and report back through schema-typed machine events. This avoids an XState 6 alpha React Native defect where invoked `createAsyncLogic` children remain active after their promises resolve. Navigation model tests cover persistence success, storage failure, and retry so the workaround can be removed safely when the upstream alpha behavior is fixed.

```text
src/
  app/                       Expo Router route views
  navigation/                root navigation machine and router projection
  features/check-in/
    domain/                  Effect Schemas and pure emotion geometry
    application/             XState Store
    infrastructure/          Effect-based local repository
    ui/                      self-contained screens and Gefühlsstern
  features/settings/ui/
  constants.ts               shared configuration and domain vocabulary
oxlint-rules/                tested local architecture plugin
```

The main graph contains these navigable states:

```text
tabs.today.idle → tabs.today.exploring → reflection → saving → success
                                                ↘ failure → saving
tabs.today ↔ tabs.history ↔ tabs.settings
```

Persistence uses `Schema.parseJson` and typed `Schema.TaggedError` failures. There is no application dependency on Zod and no raw JSON parsing.

## Belief-system suggestions

The app contains 18 stable, locale-independent belief-system IDs derived from the supplied source material. Each belief system can be associated with multiple emotions. The selected emotion provides an initial recommendation order, and repeated attachments to the same emotion promote that belief system in later check-ins. Learning and persistence remain entirely on-device.

After the reflection has been persisted, the optional belief-system step shows three readable quick suggestions. A neutral, full-width “Browse all core beliefs” button opens the complete catalog; selecting an item returns to the suggestions before the user finishes. No belief system is attached unless the user explicitly selects one. The success screen ends the completed flow with “Done” and returns to Today. Persisted check-ins store only the stable ID; localized wording is resolved when the UI renders.

### Belief-system flow

<p>
  <img alt="Reflection text before it is saved" src="docs/screenshots/belief-flow-01-reflection.png" width="240">
  <img alt="Optional core-belief suggestions after the reflection is saved" src="docs/screenshots/belief-flow-02-optional-belief.png" width="240">
  <img alt="Complete core-belief catalog" src="docs/screenshots/belief-flow-03-catalog.png" width="240">
</p>
<p>
  <img alt="Selected core belief ready to attach" src="docs/screenshots/belief-flow-04-selected-belief.png" width="240">
  <img alt="Completed check-in screen with Done action" src="docs/screenshots/belief-flow-06-done.png" width="240">
</p>

### Deleting a moment

The edit screen provides a full-width destructive action. History keeps a visible action on every row, and long-pressing the row opens the same confirmation.

<p>
  <img alt="Edit moment screen with full-width delete action" src="docs/screenshots/delete-flow-edit-moment.png" width="240">
  <img alt="Saved history entry with its attached core belief and delete action" src="docs/screenshots/belief-flow-05-history.png" width="240">
</p>

## Development

```bash
corepack enable
pnpm install
pnpm start
```

The repository pins pnpm 11.12.0 through the `packageManager` field and commits a pnpm lockfile. Do not generate npm or Yarn lockfiles.
`pnpm start` targets the Youmotion development client and displays a QR code. Use `pnpm start:tunnel` when a physical device cannot reach the computer over the local network.

Install a development client once on each physical device before scanning Metro QR codes. Android internal builds produce an installable APK. iOS device builds require an Apple Developer account and a registered device:

```bash
pnpm dlx eas-cli@latest login
pnpm dlx eas-cli@latest init
pnpm dlx eas-cli@latest build --platform android --profile development
pnpm dlx eas-cli@latest build --platform ios --profile development
```

After installing the resulting build, open Youmotion and scan the QR code printed by `pnpm start`. Rebuild the client only when native dependencies or native configuration change; ordinary TypeScript, styling, and translation changes load through Metro.

Native fingerprints make that rebuild decision explicit. These local commands use Expo's pinned SDK 57 fingerprint implementation and require no Expo account; an unchanged platform hash means the installed development client is still compatible:

```bash
pnpm fingerprint:android
pnpm fingerprint:ios
```

For simulators and emulators, EAS CLI can find and install an existing development build with the same fingerprint, or create one when no match exists:

```bash
pnpm dlx eas-cli@latest build:dev --platform android
pnpm dlx eas-cli@latest build:dev --platform ios
```

EAS dependency caches remain enabled by default, and the development profile enables the EAS compiler cache. Local iOS builds compile React Native from source because the SDK 57 precompiled React framework does not contain a development symbol required by `expo-dev-launcher`; the native project is ccache-ready, and `brew install ccache` enables that cache on this Mac. Do not cache `node_modules` separately because pnpm and EAS already restore dependencies from the lockfile and package caches.

Build and launch the native development apps, or open web from Expo's terminal UI:

```bash
pnpm ios
pnpm android
pnpm web
pnpm lint
pnpm lint:rules
pnpm typecheck
pnpm typecheck:compat
pnpm test
pnpm test:coverage
pnpm test:maestro
pnpm test:maestro:smoke
pnpm verify
pnpm test:harness
pnpm doctor:react
```

`pnpm typecheck` invokes TypeScript 7 directly. `typecheck:compat` checks the compatibility compiler used by editor and lint integrations.
The pnpm patches for `expo-modules-core` and `expo-modules-jsi` keep Expo SDK 57 buildable with the repository host's Xcode 26.1 Swift compiler. They only replace invalid immutable weak references with mutable weak references and can be removed after moving to Expo's supported Xcode 26.4 or newer toolchain.

The `expo-dev-launcher` patch backports Expo's Android `onUserLeaveHint` fix for the launcher delegate. Remove it after upgrading to an Expo SDK 57 package that includes [expo/expo#47347](https://github.com/expo/expo/pull/47347).

## Internationalization

fbtee compiles inline translator-aware source strings through Babel. English (`en-US`) is the source language, German (`de-DE`) is maintained in `translations/de-DE.json`, and the initial locale follows the device preference from `expo-localization`. The language can be changed from Settings.

```bash
pnpm i18n:collect
pnpm i18n:prepare
pnpm i18n:compile
pnpm i18n:all
```

`i18n:prepare` adds new phrases to the editable German catalog with a `new` status. Translate those entries and remove the status before committing. The compact runtime catalog under `src/translations` is generated during `pnpm install` and intentionally ignored.

Persisted check-ins store stable emotion IDs, intensity, nuance levels, and an optional `beliefSystemId` rather than localized labels. Existing German-label records and records without a belief system remain readable and are projected into the active locale at render time.

## Developer tooling

The repository includes Callstack's project-local React Native, navigation, upgrade, GitHub, and GitHub Actions agent skills. The tooling dependencies are pinned in the pnpm lockfile rather than installed globally.

Pressto provides consistent press feedback for the app's tap controls. A shared configuration uses subtle scale compression, a near-critically damped spring, and the system reduced-motion preference; direct-manipulation gestures such as the emotion star keep their gesture-specific feedback.

Use a development build when working with native tooling. Expo Go cannot load Inspector, React Native Grab, Nitro Modules, or the Ottrelite Tracy backend.

```bash
pnpm start:tools
pnpm devtools:react
pnpm devtools:inspector
```

`start:tools` enables Rozenite with its Metro require profiler and performance monitor. React Native Grab is available from the development menu and is wrapped around every native route. `devtools:react` exposes the React tree and profiler to agent tooling. Inspector is opt-in for release profiling: start its server, then run a release development build with `WITH_INSPECTOR=true`.

Ottrelite installs the Tracy backend only in development JavaScript. Native development builds include the backend and Nitro Modules. `pnpm ios` prepares the pinned Tracy 0.12.2 sources before CocoaPods runs. Start Tracy 0.12.2 on the host; for Android, run `pnpm tracy:android` to forward port 8086 before recording. Tracy does not support Ottrelite async events, so use synchronous events and counters for Tracy sessions.

Reassure has a first domain performance scenario and keeps measurements under the ignored `.reassure` directory:

```bash
pnpm perf:baseline
pnpm perf:measure
pnpm perf:stability
```

React Doctor is available through `pnpm doctor:react`. Cali is available through `pnpm cali:review`; its device QA and performance review roles additionally require a built app artifact, provider credentials, and the relevant local device tooling.

Later TODO: evaluate `callstackincubator/eas-agent-device` after an EAS preview-build and secrets strategy exists. It is intentionally not installed or configured yet.

## Enforced code boundaries

The local Oxlint JavaScript plugin rejects framework imports in domain code, infrastructure imports from UI, implicit feature APIs, React state/effect hooks, multiple actor hooks, inline JSX callbacks, multi-parameter application functions, type assertions, switches, synchronous Schema parsing, barrels, comments, and Effect barrel imports. Oxlint also runs native React, TypeScript, Import, Promise, Jest, accessibility, cycle, depth, and complexity checks.

The rule suite lives beside the plugin and should be extended whenever a new invariant is introduced.

## Testing strategy

- Pure tests cover vector-to-emotion selection and intensity thresholds.
- Repository tests execute Effect programs against mocked native storage, including typed decode, deletion, and storage failures.
- Navigation tests drive the actual root actor through persistence, belief-system attachment, deletion, and route event paths.
- Screen tests render the painterly star and exercise reflection, belief-system selection, persistence, history deletion, success, and settings.
- Harness tests execute belief-system ranking inside the React Native runtime so Node-only JavaScript APIs cannot silently pass the standard Jest suite.
- Maestro tests exercise tab navigation, reflection cancellation, a persisted check-in save-and-delete journey, and language switching through the installed development app.
- React Native Harness is configured for web, iOS, and Android device-level component testing.

The current Jest coverage gate is enforced globally and must not be lowered.

Use `pnpm test:harness:ios` for the native iOS gate. It starts Harness on its dedicated port and launches the Expo development client directly into that server. `pnpm test:harness` uses the default web runner and must not be treated as evidence that Hermes or native bindings work.

### Maestro end-to-end tests

Install the [Maestro CLI](https://docs.maestro.dev/getting-started/installing-maestro), boot an iOS simulator or Android emulator, and install the Youmotion development client with `pnpm ios` or `pnpm android`. Keep Metro running in another terminal:

```bash
pnpm start:maestro
pnpm test:maestro
```

The dedicated Metro mode disables the development-only React Native Grab inspection overlay so iOS and Android expose the application accessibility tree to the test runner. Run `pnpm test:maestro:smoke` for the short tab-navigation gate. The flows connect the development client to Metro at `127.0.0.1:8082`; on Android, first run `adb reverse tcp:8082 tcp:8082`. Failure output is written to the ignored `artifacts/maestro` directory.

## Local Codex skills

Project-local skills are installed under `.agents/skills`, including Software Mansion's React Native debugging workflows, Emil Kowalski's design and animation reviews, Builder.io's visual planning workflow, and Callstack's React Native Harness guidance.

## Source material

The interaction language and emotion vocabulary were derived from the supplied `Youmotion.pdf` and `Gefühlsstern.pdf`. The belief-system catalog was transcribed from the supplied `Leitsätze.pdf` and `Mögliche-Leitsätze.pdf`; near-identical statements were normalized while preserving the 18 distinct beliefs across both documents. The implementation also follows the linked vertical-codebase, self-contained-component, TigerStyle, XState 6 alpha, and custom-linting references.
