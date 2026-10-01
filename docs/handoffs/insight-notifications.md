# Einblick notifications

Branch: `codex/einblick-notifications`. Base: `4997587` on `codex/gentle-reminder-timing-and-deactivation`. Approved visual plan: https://plan.agent-native.com/plans/plan-dfdff6a70bc540fc.

The feature offers optional notifications alongside an available insight and in Settings. Users choose a local time; there is no immediate-delivery mode. Foreground evaluation detects new Leitsatz and pattern identities in all three timeframes. One precomputed, one-shot native notification can arrive while the app is closed. Activation queues current insights once at the next selected time; reactivation preserves handled identities. Weekly and four-week notifications renew for the actual local reporting range, while all-time notifications keep semantic identities. Archive restore/deletion cancel stale batches and baseline the resulting dataset. Native requests are owner-scoped, stable and reconciled without duplicates. Lock-screen text is generic.

The new vertical feature under `src/features/insight-notifications/` persists an Effect-validated AsyncStorage preference/identity ledger and pending intent independently from archive settings. No dependency or database migration was added. Root navigation owns preference events and cold/warm notification targets. The existing shared notification bridge is retained. See `docs/qa/insight-notifications.md` for the user-observable boundary matrix and verification commands.

## Verification and evidence

- Feature commit: `1dd44a9`. Final Jest run: 58 suites / 411 tests pass; coverage is 88.26% statements, 78.85% branches, 83.80% functions and 91.17% lines. Native Harness passes two locale paths on each platform. Screenshot evidence under `artifacts/screenshots/insight-notifications/` corresponds to this feature commit.
- `pnpm verify` was run and stops at pre-existing, untracked `.opencode/plugins/entire.ts` Oxlint errors. Those files and other unrelated working-tree edits were preserved.
- Full applicable checks pass independently: `pnpm exec oxlint --type-aware --deny-warnings --ignore-pattern '.opencode/**' .`, `pnpm lint:architecture`, `pnpm typecheck`, `pnpm verify:website`, and `pnpm test:coverage`. Coverage thresholds are unchanged.
- Native Harness passes both German and English paths on iOS and Android. It verifies actual AsyncStorage persistence, permission/activation, owner-scoped native registration, duplicate reconciliation, deactivation and unrelated-notification preservation.
- Harness uses the repository's inline-modal adapter for the component interaction check because separate native modal windows are not reliably targeted by Harness. A separate actual iOS native-picker check found and tapped the accessibility `Fertig` button with Argent and observed the modal close.
- Actual iOS one-shot background delivery was observed on the home screen without reopening. The native queue subsequently showed the request consumed; the diagnostic Harness test passed. Android native registration is confirmed; its separate background-delivery diagnostic remained unconfirmed after dev-client/bridge timeouts. OS scheduling is best effort, including Android inexact-alarm fallback.
- Synthetic screenshot evidence: ignored `artifacts/screenshots/insight-notifications/{ios,android}/`, with German/English offer, enabled and disabled states. Device checks decode the committed 133-moment / 15-belief synthetic archive. No personal journal data was used.
- Exact permanent device commands: `pnpm test:harness:ios --runTestsByPath src/features/insight-notifications/__tests__/insight-notifications.harness.tsx --testTimeout=60000` and `ANDROID_SERIAL=emulator-5554 HARNESS_APP_PATH= pnpm test:harness:android --runTestsByPath src/features/insight-notifications/__tests__/insight-notifications.harness.tsx --testTimeout=60000`. Metro requires local-network access outside the filesystem sandbox. First-run native notification permission and the Android dev-menu onboarding must be cleared before execution.
- Targets: `8F752138-1669-4549-94F4-F403770FCB30` iPhone 17 Pro / iOS 26.1; `emulator-5554` Pixel_9. The Play Store emulator and personal phone were not used.

Logs: `/tmp/insight-final-*.log`, `/tmp/insight-harness-{ios,android}.log`, `/tmp/insight-native-window-ios.log`. Diagnostic background tests were task-local and removed; permanent native tests remain in the feature.

## QA runtime compatibility

The current native fingerprints match the finished 1.0.4 builds and latest QA updates: iOS `47bf1cadbb1b18b824919fc123c77ec60d92b553`, Android `db6a01a3a019dbc3c78b53dc4294555d1d1580c8`. EAS build readbacks: iOS `20f3b655-a913-4164-aa55-765cc69eb227`, Android `5ce24210-1169-42c2-b2c5-864faf454731`.

The committed `expected-ota-runtimes.json` still names older 1.0.3 testing binaries and was preserved. Publication follows the existing QA workflow: verify a clean feature checkout against a task-local expected JSON from those confirmed 1.0.4 build records, then publish only `qa` in the `preview` environment, without overriding the computed runtime. Existing 1.0.3 testing builds cannot receive the update; manual channel-menu testing requires a compatible 1.0.4 QA-control binary. A new binary build or store submission is outside this task.

Skills: visual-plan, implementation-delivery, Apple Design, React coding style, React Native Harness, Argent device interaction and Expo EAS Update. Spark was unavailable; bounded mechanical checks used the available substitute agent.

## Publication status

Feature commit `1dd44a9` is pushed to `origin/codex/einblick-notifications`. The clean detached checkout at `/private/tmp/youmotion-insight-qa` passed both runtime checks against `/tmp/insight-confirmed-qa-runtimes.json`; log: `/tmp/insight-clean-runtime.log`. Its dependency directory is a filesystem clone of the installed repository dependencies. Use `--config.verify-deps-before-run=false` with pnpm in this checkout to prevent automatic dependency reinstallation. Source and lockfile are unchanged.

Published on 2026-10-01 at 17:06:22 UTC to Expo/EAS project `@youmotion/youmotion` (`7f37690f-c632-408c-a4ab-1b240610bd12`), channel/branch `qa`, environment `preview`, after the user's explicit destination approval. Both groups point to feature commit `1dd44a9a165e71508e26e9b352c7223c0912df00` and the verified 1.0.4 runtimes. The active QA channel maps to the QA branch; its update list shows these as the newest platform groups. Production was not published.

- [iOS group `97bc704d-1df2-49a4-9832-8893248dea6a`](https://expo.dev/accounts/youmotion/projects/youmotion/updates/97bc704d-1df2-49a4-9832-8893248dea6a), update `01a0f86e-6ed0-77f4-9a58-4b5a6ad87184`.
- [Android group `71d40c3f-ba69-4761-887f-23a56e4a8967`](https://expo.dev/accounts/youmotion/projects/youmotion/updates/71d40c3f-ba69-4761-887f-23a56e4a8967), update `01a0f86e-6ed0-7edc-b262-8ccd26b839da`.
- Bundle stamp: `release-1dd44a9`; manifest release tag: `release-1dd44a9a165e71508e26e9b352c7223c0912df00`.
- Receipt logs: `/tmp/insight-qa-publish.log`, `/tmp/insight-qa-{ios,android}-readback.json`, `/tmp/insight-qa-channel-readback.json`, `/tmp/insight-qa-list-readback.json`.

The first approved export stopped before publication because generated translations were absent in the clean checkout. Generate them before publishing:

```sh
pnpm_config_verify_deps_before_run=false pnpm i18n:all
EXPO_PUBLIC_RELEASE=release-1dd44a9 pnpm --config.verify-deps-before-run=false exec eas update --channel qa --environment preview --platform all --message 'Einblick notifications (1dd44a9)' --non-interactive --json
```

Next device step: check `src/features/insight-notifications/ui/insight-notification-controls.tsx` in a compatible 1.0.4 QA-control build. Android background delivery remains an acceptance follow-up. No user-only blocker remains for the completed implementation and QA publication.

## Analytics crash and Settings correction

The user reported that opening Analytics crashed the TestFlight app and that the inline Settings card did not match the existing reminder layout. App Store Connect authentication was configured, but read-only app/crash queries stalled for several minutes without returning data and were stopped. No Apple crash report was retrieved.

Native iOS Harness reproduced the calculation failure directly: the installed Hermes runtime reports `Array.prototype.toSorted` as undefined. This sorting change had been made after the previous native checks. Analytics evaluated it during rendering; the coordinator caught the same exception and displayed the notification error in Settings. Candidate ordering now uses supported `slice().sort()`. A permanent native assertion computes candidates from the committed synthetic archive before coordinator exception handling.

Main Settings now uses an existing `SettingsActionRow` to open `/insight-notifications`, a dedicated page following `ReminderSettingsScreen` back button, safe-area, heading and spacing. Root-machine open/back paths are covered. German translations are included. Native tests render the dedicated page and exercise preferences in both locales.

`AGENTS.md` now documents matching Settings subpages, Hermes compatibility and rerunning native consumer checks after late changes. `architecture/no-unsupported-hermes-apis` rejects direct, computed and optional `toSorted` access in application source; permanent rule tests cover it.

Final checks: 58 suites / 417 tests and coverage thresholds pass; statements 87.28%, branches 77.77%, functions 83.14%, lines 90.08%. TS7, architecture lint, website and Oxlint excluding pre-existing `.opencode/**` pass. Full `pnpm verify` still fails only at those unrelated untracked plugin errors. Final native Harness: iOS 2/2, Android 2/2. Logs: `/tmp/insight-fix-final-*.log`, `/tmp/insight-fix-{ios,android}-harness.log`, `/tmp/insight-crash-harness-diagnostic.log`. The direct native runner used a main-checkout `NODE_PATH` to avoid publication-copy pnpm CLI shims resolving to the temporary checkout. No native dependency or runtime change.

Fix commit: `6e47432cb213d52f9d8b94cec618eb4b157d4e3f`, pushed on the feature branch. Native `insight-notification-fix-*` screenshots correspond to this commit: eight iOS images and five validated Android images under the ignored artifact directories. Remaining Android image export stopped when its emulator went offline; both locale tests had already passed. Task-owned partial exports were removed and scoped Argent services cleaned up. The clean QA checkout was advanced to this commit, translations regenerated, and both runtime checks passed again (`/tmp/insight-fix-clean-runtime.log`).

The user explicitly approved the replacement payload after automatic approval review required fresh authorization. Published to the same Expo/EAS project, QA channel/branch and preview environment at 2026-10-01 17:41:16 UTC:

- [Fixed iOS group `8d856c8f-d18a-4bbf-9950-ab7626c98536`](https://expo.dev/accounts/youmotion/projects/youmotion/updates/8d856c8f-d18a-4bbf-9950-ab7626c98536), update `01a0f88e-651c-7c06-a76c-5a1e45ad44b3`.
- [Fixed Android group `af68982e-4363-4ae5-ae81-2fd133e7ace2`](https://expo.dev/accounts/youmotion/projects/youmotion/updates/af68982e-4363-4ae5-ae81-2fd133e7ace2), update `01a0f88e-651c-79fd-8dc4-3acc02963cb4`.

Both remote group readbacks confirm the fix commit and verified runtimes. The active QA channel maps to the QA branch and its update list shows these as the newest updates for each platform/runtime. The earlier groups remain historical; compatible QA clients receive these replacements. Receipt: `/tmp/insight-fix-qa-{publish.log,ios-readback.json,android-readback.json,channel-readback.json,list-readback.json}`.

Publication command:

```sh
EXPO_PUBLIC_RELEASE=release-6e47432 pnpm --config.verify-deps-before-run=false exec eas update --channel qa --environment preview --platform all --message 'Fix Analytics Hermes crash and notification settings (6e47432)' --non-interactive --json
```

Next acceptance step: reopen Analytics and the Settings subpage in a compatible 1.0.4 QA-control build; Android background delivery remains the prior documented follow-up. No user-only blocker remains for the crash fix, Settings correction, repo guidance or replacement QA publication.

## Measured locale-casing lint rule

At the user's request, `architecture/no-slow-english-locale-lowercase` flags only explicit `toLocaleLowerCase("en")` calls in application source. Rule tests cover direct, computed and optional calls, and verify that `localeCompare`, uppercasing, unspecified/other locales and tooling remain outside the restriction. There is no autofix because casing semantics must be checked. The evidence is Hauswirtschaft's `../recipe-manager/docs/ANDROID_PERFORMANCE.md`: its physical Pixel 6a profile attributed about 8.7 seconds to repeated English locale lowercasing in Android ICU; 500 conversions took about 663 ms versus 27 ms for `toLowerCase`. No measurement was found establishing that `localeCompare` is slow, so no rule or runtime change was made for it.

The user also requested fixing existing Youmotion `toLocaleLowerCase` use. Both calls were in history search and now use `toLowerCase`. Permanent Jest and native Harness tests validate mixed-case English and German umlaut matching against entries derived from the committed 133-moment archive. No other application code or native dependency changed. AGENTS guidance requires measurement before extending performance rules.

Verification: 59 suites / 432 tests and coverage thresholds pass; scoped full Oxlint, architecture, TS7 and website checks pass. Full `pnpm verify` retains only the existing untracked `.opencode/plugins/entire.ts` failure. Native iOS history casing test passes (1/1, English and German). Android test did not execute: Pixel 9 adb transport timed out and one controlled restart failed before boot. The owned runner was stopped and scoped services cleaned up; no data wipe or other-device change was made. This is a runner gap, not an assertion failure. Logs: `/tmp/locale-rule-final-*.log`, `/tmp/locale-rule-{ios,android}-harness.log`. This lint/search change is separate from the published crash-fix QA payload `6e47432`; no further OTA upload has been requested or performed.


## Activation and reporting-period follow-up (2026-10-01)

Implements the approved follow-up on `codex/einblick-notifications`, starting from `58f3351`:

- Activating notifications queues available insights for the next chosen local time instead of silently baselining them. Empty data leaves the preference enabled with no scheduled batch. Re-enabling preserves handled IDs.
- Last-week and four-week candidate IDs include their local calendar start/end dates. The same Leitsatz or pattern is eligible once for each new reporting period. All-time IDs remain unchanged. The persisted schema still accepts existing data; legacy period targets are reconciled while preserving a future batch's ID and deadline.
- The existing dedicated Settings page shows the next notification date/time or an explicit empty state, in German and English. Busy work, denied/unknown permission and errors never claim successful native registration. Copy explains the introduction, report renewal and foreground computation.
- Completing a passed deadline is shared by evaluation and preference commands. Changing time or disabling after a deadline cannot resurrect the same introduction. This records a handled deadline, not a native delivery acknowledgement.

Final automated checks: 60 suites / 450 tests; coverage 88.52% statements, 79.64% branches, 83.80% functions, 91.41% lines. Applicable Oxlint excluding only `.opencode/**`, architecture lint, TypeScript 7 and website verification pass. Full `pnpm verify` still stops on the existing unrelated untracked `.opencode/plugins/entire.ts` findings. Logs: `/tmp/insight-activation-final-*.log`.

Native regression coverage was updated for empty-data feedback, existing-data activation, formatted scheduled delivery, direct Hermes report identity calculation, deadline completion, reactivation deduplication and owner-scoped cancellation using the committed synthetic fixture. Neither native runner reached an assertion for this follow-up: Android's package probe failed and both bounded boot recoveries failed; iOS booted but app launch stalled for more than five minutes, and the Argent launch recovery also stalled. The task-owned runner/launch processes and scoped services were stopped. No data wipe or changes to other devices were made. There are no new screenshots or native passes for these edits; earlier crash-fix evidence does not validate this follow-up. Logs: `/tmp/insight-activation-{ios,android}-harness.log`.

Next executable action: restore responsive test devices and run `src/features/insight-notifications/__tests__/insight-notifications.harness.tsx` on iOS and Android with the documented main-checkout NODE_PATH/direct CLI setup; capture the scheduled and empty states, then perform exact-source QA publication only after the release gates pass. The previously published QA payload remains `6e47432`. No dependency, database migration or native runtime change is introduced. No user-only blocker remains; device launch/transport availability is the outstanding verification blocker.

Skills used for this follow-up: implementation-delivery, Apple Design, React Native Testing, React Native Harness, Argent device interaction/RN workflow and Metro debugger. Exact Expo SDK 57 documentation was read before editing React Native code.
