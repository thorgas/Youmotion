# Einblick notifications

Branch: `codex/einblick-notifications`. Base: `4997587` on `codex/gentle-reminder-timing-and-deactivation`. Approved visual plan: https://plan.agent-native.com/plans/plan-dfdff6a70bc540fc.

The feature offers optional notifications alongside an available insight and in Settings. Users choose a local time; there is no immediate-delivery mode. Foreground evaluation detects new Leitsatz and pattern identities in all three timeframes. One precomputed, one-shot native notification can arrive while the app is closed. Activation baselines existing insights. Archive restore/deletion cancel stale batches and baseline the resulting dataset. Native requests are owner-scoped, stable and reconciled without duplicates. Lock-screen text is generic.

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

QA upload was rejected by automatic approval review before execution. No update was created. The reviewer requires explicit authorization to upload the private application bundle to Expo/EAS project `@youmotion/youmotion`, channel `qa`, environment `preview`, iOS and Android. User approval is pending.

After approval, run in that clean checkout:

```sh
EXPO_PUBLIC_RELEASE=release-1dd44a9 pnpm --config.verify-deps-before-run=false exec eas update --channel qa --environment preview --platform all --message 'Einblick notifications (1dd44a9)' --non-interactive --json
```

Read back the resulting update groups and QA channel, verify both runtime versions and source commit, then add publication IDs here. Next device step: check `src/features/insight-notifications/ui/insight-notification-controls.tsx` in a compatible QA-control build. Android background delivery remains an acceptance follow-up. The only user-only blocker is the destination-specific QA upload approval.
