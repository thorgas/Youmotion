# Reminder-owned timing handoff

## Goal

Replace reusable named reminder schedules with reminders that directly own their weekdays and times. A Leitsatz reminder also owns an explicit notification-content choice: a general message or the exact supportive Leitsatz.

## Branch and scope

- Branch: `codex/reminder-owned-timing`
- Base: `main` at `cd9dd6c`
- Preserve the unrelated untracked artifact directories and `recipe-manager-488121-22c7f727efeb.json`.
- Use existing Leitsatz cards, reminder timing controls, notification-content radio choices, and modal patterns. Do not introduce a new UI concept without user approval.

## Cherry-pickable commits

1. `fc62af1` restores pnpm command execution.
2. `6a8f208` keeps pinned pnpm scripts available offline.
3. `3683d326` makes fresh check-in database migration bootstrap safe.
4. `f67c15d` makes confirmed picker modals dismiss from their backdrop and includes its UI screenshot.
5. `d601eef` migrates reminders to assignment-owned timing/content, moves Leitsatz management, and includes the UI screenshots and redacted E2E flow.
6. The final documentation commit records executable QA setup and verification results.

## Public test seams

- Database migration and repository hydration.
- Root navigation actor events and observable state paths.
- Rendered reminder and Leitsatz-management interactions.
- Native React Native Harness persistence/component behavior.
- Saved redacted Argent journey plus structural screen tests and reviewed screenshots.

## User-observable migration matrix

| Existing state | Expected result |
| --- | --- |
| No reminders | Hydration returns no reminders and schedules nothing. |
| One legacy assignment with a valid schedule row | The reminder keeps its target, enablement, days, times, timestamps, and privacy choice. |
| Multiple legacy assignments sharing one schedule row | Each reminder receives an independent copy of the timing. |
| Legacy guiding reminder with `showFullText: true` | Persisted `notificationContent` becomes `leitsatz`. |
| Legacy guiding reminder with `showFullText: false` | Persisted `notificationContent` becomes `general`. |
| Pulse reminder without preview fields | Pulse remains valid without a content choice. |
| Missing or malformed legacy schedule reference | The migration fails closed and no native request is scheduled. |
| Disabled reminder | It remains disabled and schedules nothing. |
| Archived or removed Leitsatz | Reconciliation removes its owned native requests. |
| Permission denied or revoked | Persisted intent is retained, but no native request is scheduled. |

## Verification contract

- Focused Jest tests after every red/green slice.
- `pnpm verify` and `pnpm test:coverage` before completion.
- React Native Harness for native migration/component behavior.
- Deterministic redacted device flow; a saved Argent QA flow requires two consecutive unchanged passes.
- Durable screenshots under `docs/screenshots/reminders/` for every UI-changing commit.
- Continuity and simplification audit against the merge base.

## Current status

- Analysis complete.
- Expo SDK 57 Notifications and Router documentation reviewed.
- Relevant domain, continuity, design, TDD, React, testing, Harness, simplification, commit, and Argent workflow skills loaded.
- Environment inspection confirmed Expo SDK 57, React Native 0.86, iOS/Android projects, Argent, and Harness support.
- pnpm is pinned to 11.18.0 and the workspace permits an installed compatible binary when registry signature verification is unavailable.
- `3683d326` fixes fresh SurrealDB bootstrap by defining `check_in` before migration 0001 updates it.
- Assignment schema version 2, timing migration, repository/coordinator/scheduler changes, navigation/UI changes, focused tests, and screenshots are implemented locally.
- Full verification passes: Oxlint, TypeScript, 39 Jest suites, and 260 tests.
- Coverage passes at 87.28% statements, 74.76% branches, 83.08% functions, and 90.72% lines.
- Translations are current and React Doctor reports 100/100 with no findings.
- The version-2 migration was exercised against in-memory SurrealDB 3.1.2: both privacy modes and schedule cleanup passed, and a missing schedule rolled the transaction back without partial updates.
- Redacted Android walkthrough passed for immediate notification-content choice, timing editor, outside-tap time-modal dismissal, activation, and Leitsatz-management actions.
- Screenshots: `leitsatz-reminder-editor.png`, `reminder-time-modal.png`, and `leitsatz-management-reminder-actions.png` under `docs/screenshots/reminders/`.

## Known documentation corrections

- `CONTEXT.md` and the runtime matrix now describe assignment-owned timing and per-Leitsatz notification content.
- README documents pnpm, Android device selection, ports, and reminder-specific device evidence.

## Remaining verification

- Run the component gate with `pnpm test:harness:android --runTestsByPath src/features/beliefs/__tests__/belief-library.harness.tsx` on a dedicated Android emulator.
- The emulator-only Harness retry did not start any tests because its runner reported every port in 8084-8093 unavailable, even though a preceding `lsof` check found no listeners. Do not substitute the connected physical Pixel without permission.
- The former Maestro blocker is resolved: `.argent/flows/e2e/reminder-owned-timing.yaml` passed twice unchanged on dedicated iOS simulator `9D5C1782-C1C3-458B-9416-6311D03AD1B9`, with 84 assertions per pass and complete synthetic-data cleanup. Run it with `pnpm start:e2e` in one terminal and `E2E_DEVICE='<dedicated device>' E2E_PLATFORM=ios pnpm test:e2e --flow reminder-owned-timing.yaml` in another.
- The initial Android devices failed before migration 0003 because fresh database bootstrap migration 0001 updated an undefined table. The bootstrap fix is committed; the isolated API 33 AVD then failed to cold-boot, so a clean native migration replay still needs another healthy disposable device.
- The invalid one-step Argent recording produced while its prerequisite was false was deleted and replaced by the complete two-pass flow.
