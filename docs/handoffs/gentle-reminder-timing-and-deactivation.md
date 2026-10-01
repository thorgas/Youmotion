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
- Design guidance: Apple Design and Emil Design Engineering; implementation delivery and React Native Harness skills guide delivery and device verification. No user-only blocker remains for this feature. Remote publication and releases were not requested.

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

Next step: review the feature commit and the linked screenshots. The branch can be integrated when requested; no release or remote branch has been published.
