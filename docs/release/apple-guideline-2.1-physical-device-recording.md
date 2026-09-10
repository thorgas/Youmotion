# Apple Guideline 2.1 physical-device recording

Use this shot list when App Review asks for a recording of the submitted app on
a physical device. It is deliberately manual: simulator recordings and desktop
mirroring do not satisfy Apple's request for a physical-device capture.

## Before recording

- Use the exact TestFlight build selected for review. For the current submission,
  that is Youmotion `1.0.3 (18)`.
- Use a physical iPhone running the latest available iOS. Record the model and
  iOS version for the Resolution Center reply.
- Use a test device or export any journal you need to retain before deleting the
  app. Deleting Youmotion removes its local journal.
- Install the submitted build from TestFlight. For the clearest first-launch
  flow, delete and reinstall it only on a device that contains no needed data.
- Set the device to portrait, enable Do Not Disturb, close notification banners,
  and use English so the recording matches the primary `en-US` listing.
- Do not show personal journal text, email, phone number, Apple ID, notifications,
  passwords, the app switcher, or the hidden update-channel menu.
- Start iOS screen recording from Control Center, then return to a clean Home
  Screen with the Youmotion icon visible. Do not trim away the app launch.

## Recording script (about 90 seconds)

Record one continuous clip without edits. Narration is optional.

| Time | Action | What the recording proves |
| --- | --- | --- |
| 0:00–0:05 | From the Home Screen, tap Youmotion and wait for the first screen to finish loading. | Physical-device launch and a complete, stable build. |
| 0:05–0:15 | Move through onboarding briefly, showing the local-data/no-account message, then complete or skip it. | No registration, login, credentials, or account deletion flow exists. |
| 0:15–0:30 | On Today, drag from the center of the Feeling Pulse toward one emotion and release at a medium intensity. | The app's primary emotion and intensity interaction. |
| 0:30–0:45 | Enter a short synthetic note such as `A quiet moment after a walk`, then continue. | Optional reflection using non-personal test data. |
| 0:45–0:55 | Skip the optional core-belief step and create or select one harmless guiding belief, such as `I can take one step at a time`. Save the moment. | Optional steps are accessible and not required. |
| 0:55–1:08 | Open History, open the newly saved moment, and briefly show that it can be edited. Return without adding personal data. | Saved local content is accessible and editable. |
| 1:08–1:18 | Open Insights and show the available locally calculated view. If a single entry is insufficient for a pattern, show the valid empty/early-state explanation rather than importing a sample file. | Insights handle a new user's state without a server or demo data. |
| 1:18–1:28 | Open Settings. Show the local-data section, backup/export controls, privacy policy and terms, and optional reminders. Do not long-press the release footer. | Data controls, legal access, and local-only reminders. |
| 1:28–1:35 | Return to Today and stop the recording from Control Center. | The typical flow completed successfully. |

If onboarding has already been completed and reinstalling would risk data, start
with the normal Today screen and use Settings to replay onboarding only if that
control is available in the submitted build. Do not substitute a simulator.

## Review the clip before uploading

- The first visible interaction is launching Youmotion from the Home Screen.
- The clip shows the exact submitted TestFlight build on a physical iPhone.
- There are no freezes, crashes, debug overlays, development menus, placeholders,
  personal entries, credentials, or unrelated notifications.
- Text remains readable; avoid rapid taps and allow each screen to settle.
- The typical flow includes Pulse selection, optional reflection, saving,
  History, Insights, and Settings/data controls.
- The clip does not imply accounts, social/user-generated-content sharing,
  purchases, subscriptions, medical treatment, diagnosis, or remote storage.
- Play the complete exported video once and confirm that it has picture for the
  entire duration and opens as an `.mp4` or `.mov` file.

## After recording

Provide the recording file path to the release operator. The file can be attached
without resubmitting by using the exact review-detail ID:

```sh
asc review attachments-upload \
  --review-detail "$REVIEW_DETAIL_ID" \
  --file "/absolute/path/to/youmotion-physical-device-review.mp4"
```

Read the attachment back with `asc review attachments-list`, replace the pending
recording sentence in App Review Notes with the tested device/build facts, and
only then send the Resolution Center reply. Sending the reply or resubmitting is
a separate, explicit external action.

## Resolution Center response template

Replace the bracketed physical-device facts and confirm the attachment before
sending:

```text
Hello App Review Team,

Thank you for your feedback regarding Guideline 2.1. We have completed QA of
Youmotion 1.0.3 (18) on a physical [DEVICE MODEL] running [IOS VERSION]. A
continuous physical-device screen recording is attached. It begins with launching
the app and demonstrates onboarding, the Feeling Pulse, an optional reflection,
saving a moment, History, Insights, and Settings/data controls.

PURPOSE AND AUDIENCE
Youmotion is a private self-reflection journal for adults and general-audience
users who want to notice, name, and better understand their feelings. It helps
users capture emotional moments consistently without an account or uploading
their journal. It is not a medical device, diagnostic tool, therapy, or crisis
service.

ACCESS
No account, login credentials, subscription, purchase, or sample file is needed.
On first launch, complete or skip onboarding. On Today, drag from the center of
the Feeling Pulse toward a feeling; distance represents intensity. Release,
optionally add a note, then skip or complete the optional core- and guiding-belief
steps. Save the moment and use History and Insights from the tab bar. Settings
contains language, local reminders, backup/export, legal information, and data
deletion.

EXTERNAL SERVICES
Core journal functionality is on-device and uses no Youmotion backend. There is
no authentication, payment, advertising, analytics, tracking, social/UGC, or AI
service. The app is built with Expo/React Native and an embedded local database.
EAS Update may check Expo-hosted infrastructure over HTTPS for compatible app-code
updates; journal content is not transmitted. App Store/TestFlight distributes
the binary. Reminders are local iOS notifications. User-initiated backup sharing
and feedback use iOS system interfaces. Legal/support links open the public
Youmotion website, which is not required for core functionality.

REGIONS
The app functions consistently in all regions. German and English change only
the interface language.

REGULATED SERVICES AND THIRD-PARTY MATERIAL
Youmotion does not provide regulated medical or financial services and does not
include protected third-party material requiring authorization. It makes no
diagnosis or treatment claims. Product content and branding are supplied by the
developer; software dependencies are used under their applicable licenses.

The same information has been added to App Review Information notes for future
submissions. Please let us know if anything further is required.

Thank you.
```
