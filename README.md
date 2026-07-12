# Youmotion

Youmotion is a private, local-first Expo app for noticing and recording emotions with a seven-direction German `Gefühlsstern`. Dragging from the center chooses an emotion; distance chooses nuance and intensity. Releasing opens a short reflection, and a confirmed check-in is schema-validated before local persistence.

This is a self-reflection tool, not a substitute for psychotherapy, medical advice, diagnosis, or emergency support.

## Stack

- Expo SDK 57, React Native 0.86, React 19.2, and Expo Router
- TypeScript 7.0 as the authoritative compiler
- XState 6 alpha for the complete app and navigation state graph
- XState Store for reactive check-in history
- Effect and Effect Schema for workflows, validation, errors, and JSON persistence
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

## Development

```bash
corepack enable
pnpm install
pnpm start
```

The repository pins pnpm 11.12.0 through the `packageManager` field and commits a pnpm lockfile. Do not generate npm or Yarn lockfiles.

Open iOS, Android, or web from Expo's terminal UI. Useful commands:

```bash
pnpm lint
pnpm lint:rules
pnpm typecheck
pnpm typecheck:compat
pnpm test
pnpm test:coverage
pnpm verify
pnpm test:harness
pnpm doctor:react
```

`pnpm typecheck` invokes TypeScript 7 directly. `typecheck:compat` checks the compatibility compiler used by editor and lint integrations.

## Developer tooling

The repository includes Callstack's project-local React Native, navigation, upgrade, GitHub, and GitHub Actions agent skills. The tooling dependencies are pinned in the pnpm lockfile rather than installed globally.

Use a development build when working with native tooling. Expo Go cannot load Inspector, React Native Grab, Nitro Modules, or the Ottrelite Tracy backend.

```bash
pnpm start:tools
pnpm devtools:react
pnpm devtools:inspector
```

`start:tools` enables Rozenite with its Metro require profiler and performance monitor. React Native Grab is available from the development menu and is wrapped around every native route. `devtools:react` exposes the React tree and profiler to agent tooling. Inspector is opt-in for release profiling: start its server, then run a release development build with `WITH_INSPECTOR=true`.

Ottrelite installs the Tracy backend only in development JavaScript. Native development builds include the backend and Nitro Modules. Start Tracy 0.12.2 on the host; for Android, run `pnpm tracy:android` to forward port 8086 before recording. Tracy does not support Ottrelite async events, so use synchronous events and counters for Tracy sessions.

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
- Repository tests execute Effect programs against mocked native storage, including typed decode and storage failures.
- Navigation tests drive the actual root actor through event paths and assert the projected route.
- Screen tests render the painterly star and exercise reflection, persistence, history, success, and settings.
- React Native Harness is configured for web, iOS, and Android device-level component testing.

The current Jest coverage gate is enforced globally and must not be lowered.

## Local Codex skills

Project-local skills are installed under `.agents/skills`, including Software Mansion's React Native debugging workflows, Emil Kowalski's design and animation reviews, Builder.io's visual planning workflow, and Callstack's React Native Harness guidance.

## Source material

The interaction language and emotion vocabulary were derived from the supplied `Youmotion.pdf` and `Gefühlsstern.pdf`. The implementation also follows the linked vertical-codebase, self-contained-component, TigerStyle, XState 6 alpha, and custom-linting references.
