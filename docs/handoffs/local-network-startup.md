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
| Store archive without Tracy and forbidden selectors | Pass archive gate | New archive required |
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
with the verified candidate, then submit. Preserve MANUAL release behavior.
Version ID: `2d487ef1-db95-4f40-95a9-c236f1826244`.
App ID: `6807357236`. No Google Play submission was requested.

## Current validation

Source checkout: `main`, starting HEAD `435fc9c580d2cf49ae1ae7c69cb7dcf2c5fe0511`.
Unrelated hook changes remain untouched.

- Type checking and website verification passed.
- Initial Jest and coverage passed: 61 suites, 452 tests. Coverage: statements 88.52%,
  branches 79.64%, functions 83.8%, lines 91.41%.
- Changed-file Oxlint and whitespace checks passed.
- Full `pnpm verify` stops at unrelated `.opencode/plugins/entire.ts` lint errors.
- Initial native dependency resolution and CocoaPods regeneration passed for
  Debug-only iOS linking. Rerun for the final opt-in behavior on both platforms.
- The existing local build 21 IPA contains Tracy and is rejected by the new gate.
- Synthetic archive checks passed for clean executables and JS-only references;
  correctly rejected native Tracy, private selectors, and missing executables.
- Native build log: `/private/tmp/youmotion-local-network-release-build.log`.
- The first local native build stalled at Expo fingerprint resource generation
  and spawned a runaway config-loader chain. Its task-owned processes were
  stopped. Local scripts now pin child Node commands to Node 22 and have a
  temporary recursive-loader guard for diagnosis. These are ignored local
  environment changes, not release source. A retry failed compiling an Apple
  Foundation module after the process-resource failure; native confirmation is
  pending. Preserve logs and do not treat earlier source checks as device proof.
