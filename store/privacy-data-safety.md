# Release privacy and data-safety inventory

Audit date: September 8, 2026

This is a technical inventory and a draft declaration aid, not legal advice. The store-account owner must attest to the final answers after reviewing the signed production binaries and the production services.

## Product data flow

| Data or capability | Release behavior | Leaves the device? |
|---|---|---|
| Emotion check-ins, notes, beliefs, history, and insights | Stored in the app's local SurrealDB files; legacy check-ins may be migrated from AsyncStorage | No app code path found |
| App language, label preference, and onboarding state | Stored in the same local database | No app code path found |
| Device language | Read with `expo-localization` to choose the initial locale | No app code path found |
| Code updates | `expo-updates` checks Expo's configured update service using platform, runtime, and channel/build request metadata | Yes; no journal content is sent |
| Haptics | Uses platform vibration/haptic APIs | No |
| Local notifications | Scheduled on-device after permission; the app does not obtain a remote push token | No |
| Accounts, ads, attribution, analytics, crash reporting, location, camera, contacts, and health data | No production feature or SDK configuration found | No |

Development tracing is guarded by `__DEV__`. The production Settings UI now omits update-channel and Git diagnostics.

## Release platform surface

### Android

The freshly generated release manifest removes legacy storage and overlay permissions. The final packaged AAB still needs to be inspected before upload. Expected operational permissions include:

- `android.permission.INTERNET` for Expo Updates;
- `android.permission.ACCESS_NETWORK_STATE` for network-aware update behavior;
- `android.permission.VIBRATE` for haptic feedback;
- notification permission and boot handling required for locally scheduled reminders;
- Android's app-scoped dynamic-receiver permission.

Legacy external-storage and `SYSTEM_ALERT_WINDOW` permissions are explicitly blocked with manifest-removal directives.

### iOS

- No tracking-transparency key is configured.
- No camera, microphone, photo, contacts, location, health, or other sensitive-data usage description is configured.
- The existing non-Debug build phase must strip Expo Dev Launcher's Bonjour service and local-network usage description from the archive.
- A fresh Expo prebuild on September 8 produced an empty app entitlements file: no `aps-environment` entitlement was present.
- `ITSAppUsesNonExemptEncryption` is `false`.

## Draft App Store privacy answers

Subject to owner verification:

- Data used to track you: **No**
- Data linked to the user: **No**
- User content collected by the developer: **No**
- Identifiers collected by the developer: **No known app-level identifier**
- Diagnostics or usage analytics collected by the developer: **No analytics or crash SDK configured**

Before selecting “Data Not Collected,” confirm how Expo retains operational request logs for EAS Update and whether Apple treats that service metadata as collected data for this account and configuration.

## Draft Google Play Data Safety answers

Subject to owner verification:

- Does the app collect or share required user-data categories? **No journal or profile data is collected or shared**
- Is all transmitted data encrypted in transit? **Yes for the configured HTTPS Expo Updates endpoint**
- Can users request deletion? **Entries are stored locally and can be edited or deleted in-app; uninstalling removes app-scoped data**
- Is account creation required? **No**
- Does the app contain ads? **No**

The owner must still complete Play's exact questionnaire, confirm the final SDK set, and link the public privacy policy.

## Final verification checklist

1. Build the exact signed production archive and Android App Bundle from the release commit.
2. Inspect their final privacy manifests, Info.plist, entitlements, permissions, and bundled SDKs.
3. Capture network traffic for first launch, update check, a complete check-in, History, Insights, and deletion.
4. Confirm Expo service retention and subprocessors for the production account.
5. Reconcile those facts with the public privacy policy, App Store privacy nutrition label, and Play Data Safety form.
