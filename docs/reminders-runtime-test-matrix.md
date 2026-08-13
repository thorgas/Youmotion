# Local reminder runtime test matrix

This matrix defines the user-visible contract for device-local Pulse and positive-Leitsatz reminders. A persisted reminder assignment is the source of truth. Native scheduled requests are a derived projection that reconciliation may safely rebuild.

| Boundary | Starting condition | Input or transition | User-visible result |
| --- | --- | --- | --- |
| Module initialization | Notification response arrives before the navigation actor binds | Cold launch from a Youmotion reminder | One validated target is buffered, delivered once after binding, and opens the Pulse or positive Leitsatz destination |
| Module initialization | Foreign, malformed, or repeated response | Cold or warm notification open | No navigation occurs for foreign/malformed data; a repeated fingerprint is ignored |
| Focused notification | A Leitsatz notification is tapped before belief or reminder hydration finishes | Cold launch | The app stays on a loading focused-Leitsatz destination, then resolves the one assignment and never falls back to the full Leitsatz library |
| Focused notification | Several supportive Leitsätze exist | User taps one Leitsatz reminder | Only that positive Leitsatz is shown; Back returns to Today and the surface remains available for later per-Leitsatz patterns or analytics |
| Focused reminder edit | The tapped assignment and schedule have hydrated | User taps Edit reminder | Its owned days, times, name, and preview choice open directly without another permission prompt |
| Permission | Undetermined | User accepts the explanatory screen | Native permission is requested before any schedule can be selected or persisted |
| Permission | Denied or permanently denied | Permission check finishes | The saved Leitsatz remains intact, no assignment is created, and repair actions expose system settings and a recheck |
| Permission | Granted | Permission check finishes | Existing schedules and the create-new choice become available |
| Permission reuse | Granted before setup starts | User creates a second reminder or returns from native Settings | The permission explanation and native prompt are skipped; setup continues directly to scheduling |
| Permission history | Granted, then revoked in iOS Settings | User starts reminder setup again | Current native status wins over the earlier grant; setup opens the denied repair path because iOS cannot show the system prompt again |
| Permission history | Denied on Android | User starts reminder setup again | Youmotion asks again only while the native `canAskAgain` flag is true; otherwise setup opens the denied repair path |
| Navigation history | Permission was granted and the schedule picker is visible | User presses Back | Setup exits to reminder Settings or the Leitsatz library without re-entering the permission explanation |
| Persistence | Schedule and assignment storage succeed | User activates an existing or new schedule | The chosen values are copied into a schedule owned by that reminder; the assignment becomes active and native requests reconcile to every selected weekday/time |
| Persistence | Schedule or assignment storage fails | User activates a schedule | Setup reports failure and does not claim success; no unpersisted assignment becomes the source of truth |
| Hydration | Valid persisted schedules and assignments | App starts | Reminders appear in Settings; granted permission triggers idempotent native reconciliation |
| Hydration concurrency | Realistic 133-entry redacted archive and empty reminder tables | App starts and all repositories hydrate | Shared embedded-database queries run one at a time; reminder Settings stays usable instead of losing a concurrent-client race |
| Hydration query boundary | Schedules and assignments exist | Reminder Settings loads | The embedded client receives two serialized single-statement reads without an explicit undefined variables argument |
| Hydration | Malformed reminder data | App starts | Reminder settings expose a load error while the rest of the journal remains usable |
| Hydration recovery | A reminder read fails transiently | User taps Try again | The screen reloads the snapshot and replaces the error with the current reminder list |
| Reminder target | Active custom supportive Leitsätze exist | User starts a new reminder from Settings | The user selects the exact positive Leitsatz to receive; emotions and restrictive Leidsätze are not offered |
| Reminder target | No active custom supportive Leitsatz exists | User starts a new reminder from Settings | An explanatory empty state directs the user to create a supportive Leitsatz first |
| Required name | Reminder name is blank or whitespace | User reaches the schedule editor | Required guidance is visible and Create/Save stays disabled until a nonblank name is entered |
| iOS time input | The native wheel picker is open | User scrolls the hour or minute wheel | The picker remains mounted during the gesture, the displayed value changes, and Done explicitly confirms it |
| Native projection | Owned requests match fingerprints | Reconciliation runs | Matching requests remain; missing requests are added; obsolete or duplicate owned requests are canceled; foreign requests are untouched |
| Native projection | Permission is denied | App starts or foregrounds | Reconciliation does not schedule notifications |
| Content privacy | Positive Leitsatz assignment uses the default preview setting | Notification is delivered | Notification contains neutral copy and a stable identifier, never the restrictive Leidsatz or positive text |
| Content privacy | User enables the full preview for one Leitsatz reminder | Notification is delivered | Only that reminder displays its positive Leitsatz; other reminders retain their own preview choices |
| Content projection | A reminder changes between general and full preview | Native reconciliation runs | Its fingerprint changes, old native requests are replaced, and the new copy is used on every selected day and time |
| Content lifecycle | Positive Leitsatz changes or is archived | App is running or next returns to foreground | Content fingerprint changes or target disappears, so stale native requests are replaced or canceled |
| Schedule lifecycle | Assignment is turned off | User taps Turn off | Persisted assignment becomes disabled and all derived requests for it are canceled |
| Reminder deletion | An active reminder exists | User taps Delete | A native confirmation offers Cancel and a destructive Delete action; Cancel preserves the reminder and its native requests |
| Reminder deletion | The user confirms deletion | Assignment storage succeeds | Only that reminder disappears, its derived native requests are canceled, and an unused owned schedule is removed |
| Legacy schedule deletion | Two assignments still reference one shared schedule | The user deletes one reminder | The selected assignment is removed while the shared schedule and other reminder remain intact |
| Reminder deletion failure | The user confirms deletion | Assignment storage fails | The reminder remains visible and an error is shown instead of claiming that deletion succeeded |
| Schedule ownership | Two reminders were created from the same schedule values | User edits one reminder | Only that reminder's owned copy changes; the other reminder keeps its existing days and times |
| Legacy schedule ownership | Persisted assignments still reference one shared schedule | User edits one of them | A private copy is created for the edited reminder before native requests are reconciled |
| Clock change | Locale, time zone, or UTC offset changes | App next starts or returns to foreground | Fingerprints change and weekly wall-clock requests are rebuilt for the current device context |
| Process death | App is swiped away after scheduling | A selected day/time arrives | The operating system delivers the local notification without JavaScript or a backend running |
| Reboot or app update | Active local requests exist | Android device reboots or the installed app is replaced | `expo-notifications` restores stored requests through its boot/update receiver; opening Youmotion reconciles them again |

## Android device checks

- Fresh install on Android 13 or newer: grant, deny, and permanent-denial repair.
- Schedule two times on several weekdays; verify scheduled-request count and “Send test notification.”
- Force-stop or swipe away the app, then verify a near-future local reminder fires.
- Reboot and install an updated build, then verify reminders remain scheduled.
- Change device locale, time zone, and clock offset; foreground the app and verify requests are rebuilt.
- Tap Pulse and Leitsatz notifications from background and terminated states; verify the relevant action, not a generic landing screen.
- Verify silent/default-importance copy contains neither streak pressure nor the restrictive Leidsatz.

Exact-alarm special access is intentionally not requested. Expo uses exact alarms when Android permits them and falls back to an inexact idle-safe alarm otherwise, which avoids an inappropriate alarm-clock permission for a wellbeing reminder.
