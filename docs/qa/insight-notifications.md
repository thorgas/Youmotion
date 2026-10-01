# Insight notifications

Notifications are optional and independent of guiding-belief reminders. The insight screen offers activation when it has an insight; Settings always offers activation, deactivation, and a local delivery time (initially 19:00). Activation queues available insights once at the next selected local time. Already handled insights remain in the ledger when disabling and re-enabling. Foreground evaluation compares guiding beliefs and patterns in all three windows. Weekly and four-week identities include the local reporting range and renew each Monday; all-time identities remain semantic. Counts, locale changes, and tab changes do not create new identities. Settings shows the next scheduled date and local time, or that nothing is scheduled; busy, permission and error states never claim successful registration.

A newly detected identity joins one pending batch. A one-shot native notification is registered for the next chosen local time, today or tomorrow. The OS can deliver that scheduled notification while Youmotion is closed; the app does not calculate insights in the background. Notification text is generic and does not include journal content. Tapping opens the matching analytics timeframe and tab, with a first-pattern fallback when the original pattern is unavailable.

Preferences, the handled-identity ledger, and the pending batch are device-local, validated with Effect Schema, and stored independently in AsyncStorage. Pending intent is persisted before native registration. Registration uses a stable identifier and content fingerprint so retries retain one request. Time changes replace the feature's pending request; deactivation cancels only requests owned by this feature. Archive restore and data deletion cancel pending alerts and establish a baseline from the resulting data.

## Boundary test matrix

| Initial state or input | Observable expectation |
| --- | --- |
| Module initialized, archive or preferences still loading | Settings shows loading; activation disabled; no evaluation or notification |
| Archive hydration fails | No evaluation from partial data |
| Preference hydration fails or data is malformed | Error and retry; preferences are not overwritten |
| Preference persistence fails | Error; native registration does not run before durable intent |
| Disabled, foreground, valid data | No new notification; existing feature-owned requests cancelled |
| First enable, granted native permission, existing insights | One introductory batch at next chosen time; Settings shows its date and time |
| First enable, granted native permission, empty data | Enabled; Settings explains that no notification is scheduled yet |
| Delivered introduction, disable and re-enable | Already handled identities are not sent again |
| Same weekly or four-week insight, next reporting period | Eligible again, once per period; all-time identity remains deduplicated |
| Existing legacy ledger or pending request after update | Period identities become eligible; replace only the owned request, retain its future deadline |
| Enable, denied permission | Remains disabled; system-settings and permission-recheck actions available |
| Enabled, foreground, new Leitsatz or pattern in each timeframe | One pending batch at next selected local time |
| Enabled, background | No new insight evaluation |
| Registered pending batch, app closed | OS retains the one-shot request |
| Restart, persisted pending batch and matching native request | No duplicate request |
| Native registration fails after persistence | Error; later evaluation retries the same persisted batch |
| Busy, permission unknown/denied, hydration failure, or native scheduling failure | Never claim a notification is scheduled |
| Locale change, same identities | No new identity; pending text updated to current locale |
| Counts, selected tab or cycle change | No repeated identity notification |
| Time changes with pending batch | Same batch identifier with new fire time; unrelated requests retained |
| Disable and restart | Disabled preference and cancellation survive restart |
| Restore or delete, success or failure | Cancel stale pending batch; baseline resulting foreground dataset |
| Cold or warm notification tap | Root navigation selects Analytics timeframe and tab; resolves after history hydration |
| Foreign, malformed, duplicate response | Ignored; reminder bridge remains functional |

## Verification

Use `pnpm verify` and `pnpm test:coverage`. Native consumer checks are in `src/features/insight-notifications/__tests__/insight-notifications.harness.tsx`; run `ANDROID_SERIAL=emulator-5554 pnpm test:harness:android --testPathPattern insight-notifications` with the configured development application, or the equivalent iOS Harness command. Device tests use the committed synthetic archive, never personal journal data.

QA publication uses `pnpm eas:update:qa --environment preview --message "Insight notifications" --non-interactive`. Its runtime preflight must pass before uploading; a runtime mismatch requires a compatible QA build.

## Upgrade and delivery semantics

The existing persisted schema remains valid. Legacy weekly/four-week IDs have no reporting range, so the current report becomes eligible once after the update. All-time IDs remain unchanged. A legacy future batch keeps its identifier and deadline while its targets are reconciled to current period IDs. No global notification cancellation or database migration is used.

A passed delivery deadline marks a batch handled; this is not an OS delivery acknowledgement. Disabling or changing time after that deadline cannot resurrect the introduction. Delivery still depends on system notification settings and OS behavior. Reports are calculated on foreground/data changes, not in the background; the selected time is a delivery time for detected insights, not a repeating daily report.
