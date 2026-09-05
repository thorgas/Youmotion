# Combined PR 26, 27, 28 testing release

## Source

- Branch: `codex/combined-pr-26-27-28-testing`
- Base: `2b648e107441fd255a1b3230be0c02b17ae3be08` (`origin/main`, fetched 2026-09-05).
- PR 26: `24edfba20cbdcb4340ed5b6f2e307656cf920d39` (already based on main).
- PR 27: replayed as `028eeda`, `a66f3f8`, `c36465f`.
- PR 28: replayed as `37b0112d6e0d16cb456113f216e47a7e114d315d`.
- Original PR branches and primary checkout were preserved. Import conflicts retain PR 26's `features/beliefs` ownership and PR 27's positive surfaces. Range-diff confirms the documentation/screenshot commits and PR 28 are unchanged patches.

## Environment and commands

Isolated checkout: `/private/tmp/youmotion-combined-pr-26-27-28`.
Expo SDK 57 / React Native 0.86; pnpm 11.18.0 pinned; iOS and Android native targets.
E2E Metro: 8091; Harness iOS: 8083; Harness Android: 8084.
Use `pnpm_config_verify_deps_before_run=false` for test execution after the frozen install to avoid host pnpm 11's automatic concurrent dependency recreation. The `npm_config_` prefix is ineffective for this setting.

Device assignments: iPhone 17 Pro (`8F752138-1669-4549-94F4-F403770FCB30`) for iOS Harness; Youmotion Expo Map (`9D5C1782-C1C3-458B-9416-6311D03AD1B9`) for iOS E2E/map; Pixel_9 (`emulator-5554`) for Android. Never use Hauswirtschaft simulators or personal journal exports. Populate captures only with the committed synthetic 133-moment/15-belief archive fixture.

## Verification

- `pnpm verify` initially passed 47 suites / 332 tests; final release-script rerun is completing.
- `pnpm test:coverage`: passed 47 suites / 332 tests; 87.65% statements, 77.07% branches, 82.96% functions, 90.57% lines. Thresholds unchanged.
- `pnpm lint:rules`: passed 2 suites / 59 tests.
- iOS Harness: passed 18 suites / 29 tests. Six Android-only visual tests skipped. Native migration, transaction, and archive tests ran against the native runtime. Fixed stale Harness setup for navigation hydration, localized screenshots, feedback provider, and locale selection after export initialization.
- iOS Argent E2E: all 11 flows passed twice (22 runs). Pulse animation can produce non-failing idle warnings; destination assertions passed.
- Android development-mode checks are incomplete: Argent `getHierarchy` timed out after 15 seconds; Harness subsequently failed to observe a Metro bundle request after three launches. No full Android pass is claimed. Standalone Android release-locale checks are being attempted separately.
- Expo Doctor: 17/21 checks passed; remaining categories are the existing local EAS CLI dependency, duplicated Expo native dependencies, the SDK 57.0.6 Hermes warning, and version mismatches versus newer SDK 57 patch versions. No broad dependency upgrade was added to this integration.
- React Doctor: 11 raw-text findings reviewed as localized ReactNode props rendered inside Text.
- Expo map: `.expo-map/Youmotion-2026-09-05.appmap` contains 18 routes, 31 screenshots and 23 flows. Seven affected captures refreshed from the synthetic fixture. New combined flow replay passed 45 actions with no failures. Existing captures and bare-deep-link limitations retain explicit provenance in `capture-status.json`.
- Testing submit commands select the latest finished EAS testing build by default, print its exact ID/commit, verify the iOS IPA, then submit that ID. `--dry-run` and `--id` are supported. Both live dry runs passed; malformed selection/empty results/project guards were tested without submission.

## Release destination

Use EAS `testing` build and submit profiles, which select TestFlight app `6807357236`, Play `internal` / `completed`, and the `testing` OTA channel. Account access verified. Build only from the final pushed source SHA. Inspect the iOS IPA with `pnpm verify:ios:archive -- <path>` before submission. Record exact build/submission IDs and remote state here when available.

## Next executable work

Finish the final verify rerun and standalone Android locale checks. Build both platforms with EAS testing, submit the exact build IDs, and record final remote status below.
