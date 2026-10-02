# Local Network permission at first launch

The reported iOS dialog is Local Network access, not App Tracking Transparency.
Youmotion's journal does not require local-network discovery. The installed
Tracy native profiler enables `TRACY_ENABLE` for every build configuration and
starts worker threads and UDP broadcasts during native initialization. Guarding
only `Ottrelite.install` in JavaScript does not prevent that startup.

## Change

- `react-native.config.js` excludes Tracy on both platforms by default. Explicit
  `EXPO_PUBLIC_ENABLE_TRACY=true` enables local/development profiling only; iOS
  additionally limits the pod to Debug. Production/preview profiles pin the flag
  to false, and testing/QA inherit that setting.
- `install-tracing.ts` synchronously loads the native wrapper only in development
  with that flag enabled.
- `verify-ios-store-archive.sh` rejects an executable containing the Tracy native
  wrapper before checking private Harness selectors.
- Android Release builds also omit Tracy. Android targets SDK 36, where this
  local-network permission is not normally requested automatically. Native
  profiling still broadcasts, so release exclusion is needed on both platforms.

## Acceptance matrix

| Build / startup | Expected result | Verification |
| --- | --- | --- |
| iOS Release, fresh install, before welcome/onboarding | No Tracy module or broadcast; no Local Network dialog | New Release binary and fresh physical-device launch required |
| iOS Release, JS startup, native wrapper unavailable | No import or install of the native wrapper | `development-tracing.test.ts` |
| Normal development, native wrapper absent | No import or install | `development-tracing.test.ts` |
| Explicit profiling Debug build, native wrapper available | Load and install Tracy once | `development-tracing.test.ts` |
| Native dependency resolution, both platforms | No Tracy by default or in release EAS profiles, even if flag is true | Expo autolinking JSON and native Release binaries |
| Store archive containing Tracy | Reject before upload | Existing local 1.0.5 build 21 archive rejected |
| Store archive without Tracy and forbidden selectors | Pass archive gate | Build 23 IPA passed |
| Android Release, fresh startup | No Tracy native library or discovery | Release APK and fresh synthetic device check |

There is no new persistence or hydration behavior. No permission rationale or
onboarding screen is added because the shipped app has no feature requiring this
access. A new iOS binary is required; OTA JavaScript cannot remove native threads.
Do not uninstall or replace an existing personal journal to validate this fix.

## Additional native acceptance failure

The fresh Android Release onboarding run exposed an existing worklet assertion:
`Scroll indicator viewport height must be positive`. Android emits zero height
when the onboarding scroll view detaches. The layout boundary already accepts
zero, but the animated indicator rejected it and destroyed the React instance.
Runtime evidence: `/private/tmp/youmotion-local-network-android-startup.log`.
Cover zero viewport, zero content, both zero, and normal/keyboard geometry;
hide the indicator while native measurements are zero, then recover on positive
measurements. Exercise native worklet rendering and repeat full Release onboarding
on both platforms after this late fix. Build 22 must not be submitted because it
predates this additional repair.

## Commands

```sh
pnpm exec expo-modules-autolinking react-native-config --platform ios --json
pnpm verify
pnpm test:coverage
pnpm verify:ios:archive -- /absolute/path/to/new/Youmotion.ipa
```

The current local dependency layout needs
`NODE_PATH="$PWD/node_modules/.pnpm/node_modules"` for Jest to resolve its
existing transitive `babel-jest`. Full verification also encounters unrelated
uncommitted `.opencode/plugins/entire.ts` lint failures. Preserve those files.
The user authorized a new App Store binary and submission for review after
verification. Live readback: 1.0.5 is PREPARE_FOR_SUBMISSION, not under review;
no active or READY_FOR_REVIEW submission exists. Replace its attached build 21
with verified build 23 (completed), then submit after physical-test disposition. Preserve MANUAL release behavior.
Version ID: `2d487ef1-db95-4f40-95a9-c236f1826244`.
App ID: `6807357236`. No Google Play submission was requested.

## Current validation

Runtime candidate: `2cafff48504c89abab05d56bdfbdccdb9f0f1eb5`, pushed to `main`.
Source starting HEAD: `435fc9c580d2cf49ae1ae7c69cb7dcf2c5fe0511`.
Unrelated hook changes remain untouched. The final checks ran from the clean
checkout `/private/tmp/youmotion-local-network-candidate`.

- Full `pnpm verify` passed: Oxlint, ESLint, TypeScript 7, website checks,
  61 Jest suites and 456 tests. `pnpm test:coverage` passed all unchanged thresholds:
  statements 88.52%, branches 79.64%, functions 83.8%, lines 91.41%.
- The installed dependency layout was made by pnpm 12.6.0. Verification used
  `/opt/homebrew/bin/pnpm` with `PNPM_PACKAGE_MANAGER_MANAGE=false` to avoid a
  package-manager self-switch, plus the locked transitive Jest resolution path
  above. No dependency or lockfile change was made.
- Android and iOS Harness each passed both zero-measurement regression tests.
  Harness's existing Reanimated substitution is used; the actual native animation
  worklet was verified separately by the final Release onboarding flows.
- Final iOS simulator Release build succeeded and its executable has no native
  Tracy wrapper. Android arm64 Release APK succeeded and has no Tracy libraries,
  classes or DEX references.
- Fresh final Release installs completed all onboarding steps into a usable
  Today screen on iOS 26.5 and Android API 36. No permission dialog appeared.
  Both are dedicated, empty QA targets; no journal data was used.
- The existing local build 21 IPA contains Tracy and the new archive gate rejects it.
  Synthetic archives verify acceptance of clean executables/JS-only references
  and rejection of native Tracy, private Harness selectors and missing executables.
- Physical iPhone permission validation remains pending: both connected iPhones
  are locked. Neither existing install was inspected, replaced or erased. The
  user was asked to unlock and identify a safe/disposable QA device, or explicitly
  skip the physical test. A simulator launch alone is not physical permission proof.

Evidence:

- `/private/tmp/youmotion-final-verify.log`
- `/private/tmp/youmotion-final-coverage.log`
- `/private/tmp/youmotion-local-network-scroll-harness-final.log`
- `/private/tmp/youmotion-local-network-scroll-harness-ios.log`
- `/private/tmp/youmotion-local-network-release-build-scroll-fix.log`
- `/private/tmp/youmotion-local-network-android-build-scroll-fix.log`
- `/private/tmp/youmotion-local-network-ios-welcome.png`
- `/private/tmp/youmotion-local-network-android-welcome.png`
- `/private/tmp/youmotion-local-network-ios-final-main.png`
- `/private/tmp/youmotion-local-network-android-final-main.png`

The first local iOS build spawned a runaway Expo config-loader chain; only this
build's processes were stopped. Child tooling was pinned to Node 22. The final
rebuild passed without the temporary recursive-loader guard. The ignored local
`ios/.xcode.env.local` keeps its original Node path and the matching child PATH.

## Reproducible release onboarding

`e2e/agent-device/first-launch-ios.ad` and `first-launch-android.ad` record the
verified journey from welcome to Today. They require agent-device 0.20.0 and a
fresh Release install on a **disposable** QA target named Youmotion Local Network
QA. Never clear an existing user's journal to meet this prerequisite. Change the
context device name only to another confirmed disposable target. Both committed
replays passed on the final Release artifacts: iOS 10.3 seconds, Android 7.68
seconds. The scripts stop at the working Today screen and write a synthetic-data
screenshot. The iOS replay is simulator evidence, not a physical permission check.

```sh
mkdir -p artifacts
pnpm exec agent-device test e2e/agent-device/first-launch-ios.ad --platform ios
pnpm exec agent-device test e2e/agent-device/first-launch-android.ad --platform android
```

## App Store replacement

- Version: 1.0.5, manual release, existing draft ID above. No active review existed.
- Superseded build 22: `bbdcf018-d2db-40ed-86f3-b8b7bf525658`, source `680a039`,
  finished before cancellation could run. It was not uploaded or submitted.
- Final build 23: `fd3128fd-b8c2-4e8c-8aee-6f0b88d0deb0`, source `2cafff4`.
  Managed credentials were frozen; production profile, no auto-submit.
- English and German What's New were updated and read back exactly from
  `store/releases/1.0.5-notes.json` (329/379 characters).
- App Privacy publication could not be read via the public API; no cached web
  session is available and the browser is signed out. Existing declarations were
  not changed. Current readiness reports no blocking errors; this remains an
  advisory, not a proven published-state readback.
- Build 23 FINISHED and its downloaded IPA passed the native archive gate.
  Bundle/version/build and production channel were verified. Runtime fingerprint:
  `edb767a52c8607524dce180629b617ccd39ddac6`.
  IPA SHA256: `89882a50f50d1a6cb5c84020784714564f762ecbdd3360a3f045e3a4edc97e0a`.
- Explicit-ID EAS upload `606d4cef-19c2-4e20-bc91-d01950f06343` FINISHED.
  Apple build `cca46c28-ec25-4cc0-9155-13239e68acc9` is VALID and App Store eligible.
- Draft 1.0.5 now references Apple build 23. Readback remains
  PREPARE_FOR_SUBMISSION. Readiness has zero errors/blockers, three inherited
  non-blocking metadata warnings. Manual release is preserved. Review dry run
  reports `wouldSubmit: true` and `alreadyAttached: true`.
- Pending: physical iPhone permission validation or an explicit user decision
  to skip it. Both connected phones were locked. Do not infer consent to erase
  journal data or overwrite either install. This is a validation decision, not
  a new request for App Review authorization; review was already authorized.
  After disposition, submit with the exact IDs below and read back actual review
  state. No review submission or public rollout has happened yet.

```sh
asc review submit --app 6807357236 \
  --version-id 2d487ef1-db95-4f40-95a9-c236f1826244 \
  --build-id cca46c28-ec25-4cc0-9155-13239e68acc9 --confirm
asc versions view --version-id 2d487ef1-db95-4f40-95a9-c236f1826244 \
  --include-build --include-submission
```

- Preserve manual release and live 1.0.4 (20). No Google Play release is authorized.
