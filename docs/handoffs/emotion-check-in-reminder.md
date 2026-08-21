# Emotion check-in reminder handoff

## Goal

Make the existing device-local Pulse reminder a clear notification type in Settings: an emotion check-in reminder that invites the user to open Youmotion and notice their emotions.

## Branch and scope

- Branch: `codex/emotion-check-in-reminder`
- Base: `main` at `afc5ce5`
- Preserve the unrelated untracked artifact directories and `recipe-manager-488121-22c7f727efeb.json`.
- Reuse the persisted Pulse assignment, reminder editor, permission flow, time picker, scheduler, and `/today` deep link. Do not add a parallel assignment type or a new UI concept.

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

## Planned cherry-pickable commits

1. Document the emotion check-in reminder contract and test matrix.
2. Add the notification copy and Settings/reminder UI wording with focused tests and screenshots.
3. Add the redacted saved device journey and executable QA documentation.
4. Record final verification evidence and any environment limitations.

## Verification contract

- Focused Jest tests must fail before the implementation and pass afterward.
- `pnpm verify`, `pnpm test:coverage`, and React Doctor must pass.
- React Native Harness must cover the affected native component boundary when applicable.
- The saved device journey must cover creation, outside-tap modal dismissal, activation, test notification, and return to Settings using synthetic data only.
- Every UI-changing commit includes durable screenshots under `docs/screenshots/reminders/`.

## Current status

- Analysis in progress.
- Expo SDK 57 Notifications and UI documentation reviewed.
- Existing Pulse assignment confirmed as the canonical persisted target for this behavior.
- No data migration or fully new UI concept is currently required.
