# Emotion check-in reminder handoff

## Goal

Make the existing device-local Pulse reminder a clear notification type in Settings: an emotion check-in reminder that invites the user to open Youmotion and notice their emotions.

## Branch and scope

- Branch: `codex/emotion-check-in-reminder`
- Base: `main` at `afc5ce5`
- Preserve the unrelated untracked artifact directories and `recipe-manager-488121-22c7f727efeb.json`.
- Reuse the persisted Pulse assignment, reminder editor, permission flow, time picker, scheduler, and `/today` deep link. Do not add a parallel assignment type or a new UI concept.
- Permission handling remains DRY: the feature uses the existing reminder actor states plus `getReminderPermission`, `requestReminderPermission`, denied-permission repair actions, and Expo Notifications boundary. It adds no permission helper or prompt state.

## Public test seams

- Notification scheduling through the Expo Notifications request passed to the native boundary.
- Root navigation actor state reached from Settings and a notification tap.
- Rendered Settings, reminder-management, permission, editor, modal-dismissal, and active states.
- Saved redacted device journey starting from Settings.

## User-observable test matrix

| Starting condition | Input or transition | Expected result |
| --- | --- | --- |
| No check-in reminder exists | User opens Settings and selects Emotion check-in reminder | The existing reminder-management screen explains the feature and offers setup. |
| Notification permission is undetermined | User starts setup | A contextual explanation appears before the native permission prompt. |
| Notification permission is denied | Permission resolution finishes | No assignment is persisted; repair actions remain available. |
| Notification permission is granted | User selects days and times and activates | One Pulse assignment persists and weekly native requests are derived from it. |
| Time picker is open | User taps outside the modal | The modal closes without changing the confirmed time. |
| Check-in reminder is active | User sends a test notification | The notification explicitly invites an emotion check-in without exposing journal data. |
| Check-in notification is tapped | App is backgrounded or terminated | The root navigation actor opens `/today`; malformed or foreign payloads do nothing. |
| Existing Pulse assignment is present | Updated app hydrates | The same assignment appears under the new user-facing name without migration or duplicate scheduling. |

## Cherry-pickable commits

1. `4e5e10d` documents the emotion check-in reminder contract and test matrix.
2. `ecf49c4` adds localized notification copy and Settings/reminder UI wording with focused tests and English/German screenshots.
3. `671e11f` adds the redacted installed-app Maestro lifecycle.
4. `6d4260b` records executable QA commands and verification evidence.
5. `6375ed5` routes bounded command work to the optional Spark worker.
6. The final app-map commit refreshes the mapped Settings and Reminders states without changing the route graph.

## Verification contract

- Focused Jest tests must fail before the implementation and pass afterward.
- `pnpm verify` and `pnpm test:coverage` must pass. React Doctor must introduce no finding in changed feature files; any repository-wide baseline failure must be recorded rather than hidden.
- React Native Harness should cover an affected native component boundary when its native query tree exposes it; use the shared modal unit test plus saved installed-app E2E when iOS presents the modal in a separate native root.
- The saved device journey must cover creation, outside-tap modal dismissal, activation, test notification, and return to Settings using synthetic data only.
- Every UI-changing commit includes durable screenshots under `docs/screenshots/reminders/`.
- The Expo app map keeps its 18-route graph and refreshes the Settings and Reminders captures, including empty and active emotion check-in reminder states, in `.expo-map/Youmotion-2026-08-21.appmap`.

## Reproduce the verification

Install the pinned dependencies, compile both locales, and run the repository gates:

```bash
pnpm install --frozen-lockfile
pnpm i18n:all
pnpm test -- --runInBand src/features/reminders/__tests__/leitsatz-reminder-screen.test.tsx src/features/reminders/__tests__/reminder-settings-screen.test.tsx src/features/reminders/__tests__/local-reminder.scheduler.test.ts src/features/check-in/__tests__/screens.test.tsx
pnpm verify
pnpm test:coverage
```

For installed-app E2E, install the Expo development client once with `pnpm ios` or `pnpm android`. Keep the dedicated server running in terminal A:

```bash
pnpm start:maestro
```

In terminal B, choose a dedicated device rather than another agent's target, then replay twice unchanged:

```bash
argent run list-devices --json
export YOUMOTION_DEVICE_ID='<iOS UDID or Android emulator serial>'
maestro --device "$YOUMOTION_DEVICE_ID" test .maestro/flows/emotion-check-in-reminder.yaml
maestro --device "$YOUMOTION_DEVICE_ID" test .maestro/flows/emotion-check-in-reminder.yaml
```

The flow selects English itself and cleans up the reminder it creates. It does not clear storage or read/write journal records.

## Current status

- Implementation, rendered review, repository-wide gates, saved E2E, and final rebase verification are complete.
- Expo SDK 57 Notifications and UI documentation reviewed.
- Existing Pulse assignment confirmed as the canonical persisted target for this behavior.
- No data migration, type/interface addition, duplicate permission code, or fully new UI concept was required.
- Intentional vocabulary edge: the public name is Emotion check-in reminder, while persisted/runtime identifiers remain `PULSE`, `PulseReminderAssignment`, `PulseReminderCard`, and the shared `leitsatz-reminder-screen.tsx`. Renaming those would add migration/API churn without changing behavior.
- Focused Jest: 4 suites and 56 tests passed.
- `pnpm verify`: Oxlint, TypeScript 7, and 40 Jest suites / 273 tests passed.
- `pnpm test:coverage`: 40 suites / 273 tests passed; 87.13% statements, 75.60% branches, 83.15% functions, and 90.42% lines.
- Final `git rebase origin/main` was a no-op because the branch already descends from current `origin/main`; post-rebase `pnpm verify`, coverage, and locale compilation passed again.
- The saved Maestro flow passed twice unchanged on dedicated iOS simulator `9D5C1782-C1C3-458B-9416-6311D03AD1B9`.
- Argent device QA verified native delivery with “How are you feeling?”, Settings creation/edit/delete, and outside-tap modal dismissal without changing `09:00`.
- English and German screenshots are under `docs/screenshots/reminders/`.
- React Doctor reported no finding in changed feature files. Its repository-wide failure is from pre-existing issues, including the unrelated untracked `recipe-manager-488121-22c7f727efeb.json`, which remains untouched.
- Focused iOS Harness booted and ran, but `@react-native-harness/ui` could not discover the React Native `Modal` subtree/test IDs in its native query tree. No failing Harness test is committed; the existing shared-modal unit test, two unchanged Maestro passes, and Argent interaction provide the dismissal evidence.
- The durable screenshots come from a development client and include its floating React Native Grab gear; the feature layout and copy remain visible, but these are verification captures rather than clean release marketing images.
- Task-owned generated Maestro run output and temporary Expo documentation downloads were removed; the committed replayable flow and durable screenshots remain.
