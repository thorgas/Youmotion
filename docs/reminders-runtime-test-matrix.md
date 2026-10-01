# Local reminder runtime test matrix

This matrix defines the device-local emotion check-in (internally Pulse) and positive-Leitsatz reminder contract. A persisted reminder assignment is the source of truth and owns its weekdays and times. A Leitsatz assignment additionally owns `notificationContent: "general" | "leitsatz"`. Native scheduled requests are a derived projection that reconciliation may safely rebuild.

| Boundary | Starting condition | Input or transition | User-visible result |
| --- | --- | --- | --- |
| Module initialization | Notification response arrives before the navigation actor binds | Cold launch from a Youmotion reminder | One validated target is buffered, delivered once after binding, and opens the Pulse or positive Leitsatz destination |
| Module initialization | Foreign, malformed, or repeated response | Cold or warm notification open | No navigation occurs for foreign or malformed data; a repeated fingerprint is ignored |
| Focused notification | A Leitsatz notification is tapped before hydration finishes | Cold launch | A loading focused-Leitsatz destination resolves that assignment and never falls back to the full library |
| Focused reminder edit | The assignment has hydrated | User taps Edit reminder | Its own days, times, and notification-content choice open directly without another permission prompt |
| Overview timing | Saved active or disabled Leitsatz reminder | Open guiding-belief overview | Localized weekdays and every saved time appear beneath the reminder heading; daily schedules use Daily / Täglich |
| Editor deactivation | Active saved reminder, possibly with unsaved edits | Tap Turn off reminder | Saved timing and content remain, draft edits are discarded, native requests are canceled, and the originating overview shows Off |
| Editor deactivation failure | Storage or native cancellation fails | Tap Turn off reminder | Editor shows a retryable error and does not navigate to success |
| Disabled editing | Saved disabled reminder | Edit timing and save | Updated timing is saved and the reminder stays Off |
| Concurrent input | Deactivation is already saving | Repeated deactivation event | No second operation starts |
| Permission | Undetermined | User accepts the explanation | Native permission is requested before a reminder can be persisted |
| Permission | Denied or permanently denied | Permission check finishes | The Leitsatz remains intact, no assignment is created, and repair actions expose system settings and a recheck |
| Permission | Granted | Setup starts | The reminder editor opens directly |
| Permission reuse | Granted before setup starts | User creates another reminder or returns from native Settings | The explanation and prompt are skipped; setup continues directly to the editor |
| Navigation history | Reminder editor is visible | User presses Back | Setup returns to reminder settings, Leitsatz management, or the completed reflection that opened it |
| Persistence | Assignment storage succeeds | User activates or edits a reminder | Weekdays, times, enablement, and content choice persist together; native requests reconcile for every selected weekday and time |
| Persistence | Assignment storage fails | User activates or edits a reminder | Setup reports failure and does not claim an unpersisted reminder is active |
| Hydration | Valid version-2 assignments exist | App starts | Reminders appear in their owning Pulse or Leitsatz surface; granted permission triggers idempotent reconciliation |
| Hydration query boundary | Assignments exist | Reminder data loads | The embedded client receives one serialized assignment read without an explicit undefined variables argument |
| Hydration | Malformed reminder data | App starts | Reminder surfaces expose a load error while the journal remains usable |
| Hydration recovery | A reminder read fails transiently | User taps Try again | The app reloads and replaces the error with current assignments |
| Emotion check-in management | No Pulse assignment exists | User opens Emotion check-in reminder from Settings | Create reminder opens an editor containing only timing controls and reuses the shared notification-permission flow |
| Existing Pulse compatibility | A version-2 Pulse assignment exists | User opens Emotion check-in reminder after updating | The same assignment appears under the clearer user-facing name without migration or duplicate scheduling |
| Emotion check-in content | An enabled Pulse assignment is scheduled | Notification is delivered | Neutral copy explicitly invites the user to open Youmotion and check in with their emotions without exposing journal data |
| Leitsatz management | A supportive custom Leitsatz exists | User opens Manage Leitsätze | Its card owns Add/Edit reminder, Turn on/off, and Remove actions plus timing/content summary |
| Leitsatz independence | Two Leitsätze have equal initial timing | User edits one reminder | Only that assignment changes; the other keeps its own days and times |
| Check-in completion | A saved reflection has a positive Leitsatz without an assignment | Success appears | The reflection stays primary and offers an optional reminder for that exact Leitsatz |
| Check-in completion | The positive Leitsatz already has an assignment | Success appears | The reminder offer is omitted because that reminder is managed with the Leitsatz |
| Post-flow content choice | Permission is granted after a reflection | User chooses Plan reminder | The editor immediately offers General message or Show Leitsatz together with days and times |
| Post-flow navigation | Offer, denied repair, or editor is visible | User presses Back or Not now | The completed reflection remains intact |
| iOS time input | Native wheel picker is open | User scrolls a wheel | The picker remains mounted, the displayed value changes, and Done confirms it |
| Modal dismissal | A time picker or confirmed picker is open | User taps its backdrop | The modal closes without changing the confirmed value |
| Native projection | Owned requests match fingerprints | Reconciliation runs | Matching requests remain; missing requests are added; obsolete or duplicate owned requests are canceled; foreign requests are untouched |
| Native projection | Permission is denied | App starts or foregrounds | Reconciliation schedules nothing |
| Content privacy | Leitsatz assignment uses `general` | Notification is delivered | Neutral copy appears and neither restrictive belief nor Leitsatz is exposed on the lock screen |
| Content privacy | Leitsatz assignment uses `leitsatz` | Notification is delivered | Only that reminder displays its positive Leitsatz; other reminders retain their choices |
| Content projection | Content changes | Native reconciliation runs | The fingerprint changes, old requests are replaced, and new copy is used for every selected day/time |
| Content lifecycle | Positive Leitsatz changes or is archived | App runs or foregrounds | Stale native requests are replaced or canceled |
| Assignment lifecycle | Assignment is turned off | User taps Turn off | It becomes disabled and all derived requests are canceled |
| Reminder deletion | An active reminder exists | User taps Remove | Native confirmation offers Cancel and destructive Remove; Cancel preserves assignment and requests |
| Reminder deletion | User confirms removal | Storage succeeds | Only that assignment disappears and its derived requests are canceled |
| Reminder deletion failure | User confirms removal | Storage fails | The reminder remains visible and an error appears |
| Clock change | Locale, time zone, or UTC offset changes | App starts or foregrounds | Fingerprints change and weekly wall-clock requests rebuild |
| Process death | App is swiped away after scheduling | Selected time arrives | The operating system delivers the local notification without JavaScript or a backend |
| Reboot or update | Active local requests exist | Android reboots or app is replaced | `expo-notifications` restores requests; opening Youmotion reconciles them again |

## Version-1 migration matrix

| Persisted legacy state | Required version-2 result |
| --- | --- |
| No reminder assignments | Migration records success and leaves no assignments or schedule rows |
| One assignment with a valid schedule row | It receives that row's weekdays/times and drops `scheduleId` |
| Multiple assignments sharing one schedule row | Every assignment receives an independent timing copy before the legacy row is deleted |
| Guiding assignment with `showFullText: true` | `notificationContent` becomes `leitsatz` |
| Guiding assignment with `showFullText: false` | `notificationContent` becomes `general` |
| Pulse assignment | It remains valid without `notificationContent` |
| Missing legacy schedule row | Migration throws and records no partial version-2 assignment; verify with `pnpm test -- --runTestsByPath src/features/check-in/__tests__/database-migration.runner.test.ts` |
| Malformed migrated data | Strict Effect Schema decoding fails closed and schedules nothing |

## Android device checks

- Fresh install on Android 13 or newer: grant, deny, and permanent-denial repair.
- Configure two times on several weekdays for one reminder; verify scheduled-request count and Send test notification.
- Create two Leitsatz reminders with different times, edit one, and verify the other remains unchanged.
- Complete a reflection with a Leitsatz and choose notification content before leaving the flow.
- Open Manage Leitsätze and exercise Add/Edit, Turn on/off, and Remove reminder actions.
- Open each modal, tap its backdrop, and verify it closes without applying an unconfirmed value.
- Force-stop the app, then verify a near-future reminder fires.
- Reboot and install an updated build, then verify reminders remain scheduled.
- Change locale, time zone, and clock offset; foreground and verify requests rebuild.
- Tap Pulse and Leitsatz notifications from background and terminated states; verify the relevant destination.
- Verify default copy contains neither streak pressure nor the restrictive belief.

Exact-alarm special access is intentionally not requested. Expo uses exact alarms when Android permits them and otherwise falls back to an inexact idle-safe alarm.
