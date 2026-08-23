# Argent E2E migration handoff

## Goal

Replace the remaining Maestro development and release journeys with deterministic Argent QA flows, dedicated E2E commands, and executable documentation. Preserve all current behavior coverage and require two unchanged Argent passes per flow.

## Branch

- Branch: `codex/audit-code-architecture-design-system`
- Starting commit: `f54c84dfa62a412c4b0f99324d9827622530804b`
- Existing user-owned untracked artifacts under `artifacts/how-we-feel-*`, `artifacts/pre-rebase-untracked/`, and `recipe-manager-488121-22c7f727efeb.json` must remain untouched.

## Plan and status

1. Complete: add dedicated Metro and Argent orchestration. The live-authored navigation smoke flow passes twice unchanged on iOS.
2. Complete: all eight Maestro journeys are now live-authored Argent flows and pass twice unchanged (`navigation-smoke`, `reflection-cancel`, `language-switching`, `emotion-label-modes`, `check-in-journey`, `emotion-check-in-reminder`, `reminder-owned-timing`, and the German/English release-onboarding locale pair).
3. Pending: repair the existing onboarding Argent flow. The stale standalone CRUD flow was replaced by the deterministic check-in journey.
4. Complete: Android release-locale execution uses Argent, requires an explicit emulator, accepts a valid first-choice locale followed by the supported fallback, installs from a clean app-data state, and retries while Android finishes booting.
5. Complete: remove active Maestro configuration and update executable documentation. The historical comparison benchmark remains intact as archived decision evidence, not as an application test runner.
6. Pending: run two unchanged passes for every flow plus full repository verification.
7. Pending: simplify, rebase onto `origin/main`, verify history, and push.

## Runtime contract

- Development E2E Metro: dedicated port `8091`, `EXPO_PUBLIC_E2E=true`. Port `8082` was already serving other agents' devices and must not be reused or stopped.
- App ID: `com.youmotion.mobile`.
- Every command must target a dedicated device explicitly through `E2E_DEVICE`.
- Default QA proof is two consecutive unchanged passes, with Argent services recycled before pass one.
- Flow failure artifacts go under ignored `artifacts/argent/`.
- The runner calls `argent flow run` and recycles only the explicitly named device's Argent services before pass one. Never point `E2E_DEVICE` at a simulator another task is using.

## Copy-paste smoke run

Prerequisites: install the repository dependencies with the pinned pnpm version, install Argent, boot one dedicated simulator or emulator, and install the Youmotion development client once.

```sh
corepack pnpm install --frozen-lockfile
argent --version
argent run list-devices --json
```

Keep Metro running in terminal A:

```sh
pnpm start:e2e
```

Run the two-pass smoke proof in terminal B, replacing the placeholder with the dedicated device ID returned above:

```sh
export E2E_DEVICE='<dedicated iOS UDID or Android emulator serial>'
export E2E_PLATFORM='ios'
pnpm test:e2e:smoke
```

Use `E2E_PLATFORM=android` for an Android emulator. The runner exits before touching a device when the ID or Metro server is missing.

## Current evidence

- The historical benchmark commit is already in `origin/main` and recommends Argent for the measured local iOS onboarding replay.
- Maestro YAML could not be executed directly by Argent; each journey was re-authored and validated through the app. Historical benchmark inputs remain only under `benchmarks/e2e-maestro-vs-argent/`.
- Both Android release locale checks passed before migration, but the locale precondition rejects a valid German-first locale list with an English fallback.
- Existing picker modals already dismiss on backdrop press through `ConfirmedPickerModal`, with a focused component test.
- The first explicit-device rebuild failed with `No space left on device`. `mo clean` freed roughly 7.1 GiB of caches/logs without system-cache cleanup; the targeted iOS build and installation then passed.
- Mole's pnpm cache cleanup exposed an interrupted `node_modules`. The broken directory was moved to `/private/tmp`, dependencies were restored from the exact lockfile with pnpm 11.18.0, and Metro bundled `react-native-surrealdb` successfully.
- `.argent/flows/e2e/navigation-smoke.yaml` was authored from a live walkthrough, repaired to handle the optional Expo development-tools overlay, then passed two unchanged runs with no warnings.
- The settings/interaction batch was live-authored and replayed twice unchanged. `emotion-label-modes` uses a reusable fragment for the repeated drag-and-cancel path; all flows restore English and Emoji defaults.
- `check-in-journey` creates only the fixed synthetic note `ArgentCheckInMoment`, exercises the new core-belief and guiding-belief sequence, proves persistence in History, deletes its own record through the native confirmation alert, and checks state-independent Analytics content. It passed twice unchanged on iOS. The superseded CRUD flow depended on stale navigation and exact global totals, so it was removed.
- `emotion-check-in-reminder` creates and removes only its synthetic reminder. It proves the shared picker closes when its backdrop is pressed without changing the time, sends a test notification, and passed twice unchanged on iOS.
- `reminder-owned-timing` creates the fixed synthetic moment and beliefs `ArgentOwnedTimingMoment`, `ArgentOwnedTimingCore`, and `ArgentOwnedTimingGuide`; exercises full-preview and general reminder timing, turn-off and removal paths; then removes every owned record. It passed twice unchanged on iOS with 84 assertions per pass.
- The release-locale runner was validated on dedicated AOSP emulator `emulator-5556`. German-first with English fallback and English-first with German fallback each passed twice from a fresh release install. The test deliberately keeps language ordering as an explicit Android Settings prerequisite: property-level locale mutation changed Android configuration but did not reproduce the process locale delivered to Expo.

## Verification remaining

- `pnpm verify`
- `pnpm test:coverage`
- `pnpm lint:rules`
- `pnpm test:harness`
- `pnpm test:harness:ios`
- `pnpm test:harness:android`
- `pnpm test:e2e`
- `pnpm test:e2e:release:android:locale:de`
- `pnpm test:e2e:release:android:locale:en`
