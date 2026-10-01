# Gentle reminder timing and deactivation

Branch: `codex/gentle-reminder-timing-and-deactivation`.

## User-observable runtime matrix (defined before implementation)

| Case | Expected result |
| --- | --- |
| Hydrated daily / selected-day reminder, one / multiple times | Overview shows all saved days and times; English/German copy follows locale. |
| Disabled reminder | Saved timing remains visible; status is Off. Saving edits preserves Off. |
| No reminder / hydration pending | No invented schedule or deactivation action. |
| Active editor, including unsaved timing edits | Turn off preserves persisted timing and content, discards draft edits, returns to originating overview. |
| Persistence failure / native cancellation failure | Editor stays open with a retryable error; no success navigation. |
| Repeated press while operation pending | Saving state prevents duplicate deactivation. |
| Android / iOS, notifications granted / denied | Disabling needs no permission request; reconciliation cancels only owned requests for the disabled reminder. |
| Reload after disable / subsequent reactivation | Off and original timing survive reload; reactivation uses original saved timing. |

Use the committed synthetic legacy archive for native test data. Verify consumer UI interactions with React Native Harness on Android and iOS; execute the existing persisted assignment transaction on the native database. Capture overview/editor/off evidence. Run `pnpm verify` and `pnpm test:coverage`.

## Delivery status

Base: `adf58e41f08c11b8858840eb66a084a82c9ca9b7` on `main`. Implementation adds a localized schedule summary and a root-machine deactivation event. It reuses the existing assignment persistence and native reconciliation; no dependency, schema, migration, or storage API change.

- `pnpm verify` was run but stops on pre-existing untracked `.opencode/plugins/entire.ts` lint failures. These unrelated files were preserved.
- Equivalent applicable gates passed independently: `pnpm exec oxlint --type-aware --deny-warnings --ignore-pattern '.opencode/**' .`, `pnpm lint:architecture`, `pnpm typecheck`, `pnpm verify:website`, and `pnpm test:coverage` (54 suites / 379 tests; configured thresholds unchanged).
- Android native Harness has passed both English/German paths against real SurrealDB transactions and native notification queues. The final test revision passed 2/2 locale paths in 22.51 seconds; iOS passed 2/2 in 12.889 seconds.
- iOS Debug simulator build and native Harness passed both English/German paths. `pnpm preios` supplies required Tracy headers; follow it with `pnpm prepare:harness:ios` to restore Harness UI in local pods. Grant the test app notification permission on first run so the test can establish scheduled requests before deactivation. The production deactivation action itself does not request permission.
- The native tests reload the disabled assignment from native SurrealDB, verify its original timing remains, verify owned requests are canceled, and verify a foreign notification remains. Screenshot fixtures contain all 133 moments and 15 guiding beliefs from the committed synthetic archive.
- Design guidance: Apple Design and Emil Design Engineering; implementation delivery and React Native Harness skills guide delivery and device verification. No user-only blocker remains for this feature. The user subsequently requested a QA update; see the publication record below.

## Native prerequisites and exact runs

Targets: dedicated `Pixel_9` (`emulator-5554`) and `iPhone 17 Pro`, iOS 26.1 (`8F752138-1669-4549-94F4-F403770FCB30`). Do not use the Play Store emulator. Install the development APK with `ANDROID_SERIAL=emulator-5554 pnpm exec expo run:android --no-bundler --device Pixel_9`.

The iOS Expo Updates fingerprint step spawned recursively nested autolinking processes during this local build. Stop only the task-owned stalled build/process tree and use Expo's supported override for the local Debug test build; this does not validate an OTA fingerprint or a release build:

```sh
pnpm preios
pnpm prepare:harness:ios
EXPO_UPDATES_FINGERPRINT_OVERRIDE=youmotion-local-harness MOBILE_UPDATE_CHANNEL=none xcodebuild -quiet -workspace ios/Youmotion.xcworkspace -scheme Youmotion -configuration Debug -sdk iphonesimulator -destination 'platform=iOS Simulator,id=8F752138-1669-4549-94F4-F403770FCB30' -derivedDataPath /private/tmp/youmotion-harness-derived CODE_SIGNING_ALLOWED=NO build
xcrun simctl install 8F752138-1669-4549-94F4-F403770FCB30 /private/tmp/youmotion-harness-derived/Build/Products/Debug-iphonesimulator/Youmotion.app
pnpm test:harness:ios --runTestsByPath src/features/reminders/__tests__/gentle-reminder.harness.tsx --testTimeout=60000
ANDROID_SERIAL=emulator-5554 RN_HARNESS_ANDROID_AVD=Pixel_9 pnpm test:harness:android --runTestsByPath src/features/reminders/__tests__/gentle-reminder.harness.tsx --testTimeout=60000
```

If Android waits for its bridge after Metro starts, connect the dev client explicitly:

```sh
adb -s emulator-5554 reverse tcp:8084 tcp:8084
adb -s emulator-5554 shell am start -W -a android.intent.action.VIEW -d 'exp+youmotion://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8084' com.youmotion.mobile
```

Harness writes `gentle-reminder-{de-DE,en-US}-{overview,editor,off}.png` in the test app's cache and logs their URIs. Extract Android images with app-scoped `adb exec-out run-as com.youmotion.mobile cat cache/<filename>`; use the simulator app data container for iOS. Evidence belongs in ignored `artifacts/screenshots/gentle-reminder/`, associated with the feature commit. Test screenshots contain only synthetic fixture data.

## Evidence and review

Screenshot folder: `artifacts/screenshots/gentle-reminder/{android,ios}/`, with German and English overview, editor, and disabled-state captures. Android final filenames use the `gentle-reminder-` prefix; iOS filenames begin with the locale. Images are intentionally ignored by Git. iOS result log: `/private/tmp/gentle-reminder-ios-harness-scroll.log`; Android final log: `/private/tmp/gentle-reminder-android-harness-final.log`.

Next step: review the feature commit and the linked screenshots. The branch can be integrated when requested; the QA update has been published; the Git branch has been pushed and PR #33 is open.

## QA publication - 2026-10-01

Published from a clean detached checkout of feature commit `fe2409622e93120f41ac517d04d936e4ca7d064e` to project `@youmotion/youmotion` (`7f37690f-c632-408c-a4ab-1b240610bd12`), channel/branch `qa`, EAS environment `preview`. Bundle release stamp: `release-fe24096`.

- iOS group: `3d460dbc-7dc7-4efe-a3ba-7dfa2b998591`; runtime `47bf1cadbb1b18b824919fc123c77ec60d92b553`.
- Android group: `f986aac3-422e-495c-ad19-5009d001b9b8`; runtime `db6a01a3a019dbc3c78b53dc4294555d1d1580c8`.
- These match the finished 1.0.4 production builds (`20f3b655-a913-4164-aa55-765cc69eb227` iOS, `5ce24210-1169-42c2-b2c5-864faf454731` Android). Existing 1.0.3 testing builds carry different runtimes and cannot receive this update. A compatible QA-control 1.0.4 binary is required to test through the channel menu; a normal production binary has no manual QA controls.
- The committed expected-runtime file still describes the 1.0.3 testing binaries. It was preserved. Verification used a task-local expected JSON populated from the confirmed finished 1.0.4 build metadata, and both clean-checkout fingerprint resolutions matched without any runtime override.

Publication command (after runtime verification):

```sh
EXPO_PUBLIC_RELEASE=release-fe24096 pnpm exec eas update --channel qa --environment preview --platform all --message 'Gentle reminder timing and editor deactivation (fe24096)' --non-interactive --json
```

Logs: `/private/tmp/gentle-reminder-qa-publish-runtime.log`, `/private/tmp/gentle-reminder-qa-publish.log`, `/private/tmp/gentle-reminder-qa-publish.json`. Remote group/channel readbacks are saved alongside them. No production channel update was published.

## Colon formatting follow-up - 2026-10-01

User requested colon and space instead of the centered dot: `Täglich: 09:03`. Commit `1684a226678b642e7c2fb75ab434f95005e05b7e` updates the UI and both localized consumer tests. PR: https://github.com/thorgas/Youmotion/pull/33 (base `main`).

Repeated verification: 54 suites / 379 tests with coverage pass; native Harness passes German and English on Android (2/2, 27.289s) and iOS (2/2, 24.151s). Application lint, architecture lint, and TypeScript pass. Fresh screenshot evidence is associated with the new feature commit in `artifacts/screenshots/gentle-reminder/evidence.txt`. The PR currently reports no configured CI checks. The earlier unrelated plugin lint blocker remains.

Published another clean-source QA update with release stamp `release-1684a22`, same project/channel/environment and verified 1.0.4 runtimes:
- iOS group `b5b1920f-510f-478d-839b-6e9327954b00`.
- Android group `46237f06-a6c9-4999-b592-28af4ddf0c58`.

Logs: `/private/tmp/gentle-reminder-colon-{coverage,android,ios,runtime}.log` and `/private/tmp/gentle-reminder-colon-qa-{publish,ios-readback,android-readback,channel-readback}.json` (publication progress is in `gentle-reminder-colon-qa-publish.log`). Publication checkout: `/private/tmp/youmotion-gentle-reminder-qa`. No production update or merge was performed. Next step: review PR #33 and check the QA update in the compatible test app.
