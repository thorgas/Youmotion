# Apple Guideline 2.1 review notes

This is the sanitized App Review Information note used for Youmotion's first-submission Guideline 2.1 information request. It intentionally excludes reviewer contact details, phone numbers, email addresses, credentials, API identifiers, and private file links so it is safe to keep in the public repository.

Before reusing it, verify the app version, build number, supported flow, external services, regional behavior, and recording status against the submitted binary.

## Submitted note

```text
GUIDELINE 2.1 INFORMATION

1. A screen recording captured on a physical device, running the latest operating system, demonstrating the app's functionality.
The requested physical-device recording and final QA are pending. Before resubmission, I will attach a recording that starts with a fresh launch of build 1.0.3 (18) on a physical iPhone running the latest available iOS and shows the typical flow below. If needed, I can also provide a separate video demonstrating data-dependent Insights with a larger synthetic journal.

2. A description of the app's purpose and target audience, including the problem it solves and the value it provides
Youmotion is a private self-reflection journal for general-audience users who want to understand their feelings. Users select a feeling and intensity with the Feeling Pulse, may add a note and optional beliefs, and revisit locally calculated history, calendar, and insights. It helps capture emotional moments without an account or journal upload. Youmotion supports self-awareness; it is not a medical device, diagnostic tool, therapy, crisis service, or substitute for medical or psychotherapeutic treatment.

3. Instructions for setting up and accessing the app's main features, including any required login credentials or sample files
No account, login credentials, subscription, purchase, or sample file is required. On first launch, complete or skip onboarding. On Today, drag from the center of the Feeling Pulse toward a feeling; distance represents intensity, and positions between feelings capture nuance. Release, optionally enter a note, and continue. The core-belief and guiding-belief steps are optional and may be skipped. Save the moment, then use History and Insights in the tab bar to view the saved entry and locally calculated patterns. Insights reveals additional analyses as more moments are recorded; the App Store screenshots demonstrate this populated state. Settings provides language selection, optional on-device reminders, backup export/restore, legal information, and data deletion.

4. A list of the external services, tools, or platforms the app uses to deliver its core functionality (for example, data providers, authentication services, payment processors, or AI services)
Core journal functionality is on-device and does not use a Youmotion backend. There is no authentication provider, payment processor, advertising SDK, analytics service, tracking, social/UGC service, or AI service. The app is built with Expo/React Native and uses an embedded local database. EAS Update may contact Expo-hosted update infrastructure over HTTPS to check for and download compatible app-code updates; journal entries, notes, and beliefs are not sent. Apple App Store/TestFlight distributes the binary. Optional reminders use local iOS notifications only, not remote push. User-initiated backup sharing and feedback use iOS system share/email interfaces. Legal/support links open the public Youmotion website; the website is not required for core functionality.

5. Describe any regional differences in the app’s features or content, or confirm that the app functions consistently across all regions
The app functions consistently in all regions. The same features and content are available everywhere. Users can select German or English; this changes only the interface language.

6. If the app operates in a highly regulated industry or includes protected third-party material, provide any relevant documentation or credentials to demonstrate you are authorized to provide these services or protected material
Youmotion does not operate in a regulated medical or financial industry, provide regulated professional services, or include protected third-party content requiring credentials or authorization. It makes no diagnosis or treatment claims. The app's branding and product content are supplied by the developer; software dependencies are used under their applicable licenses.
```

## Public-repository safety

Keep App Review contact information only in App Store Connect or a private secret store. Never add personal phone numbers, personal email addresses, login credentials, API keys, App Store Connect identifiers, or recording links containing private tokens to this file.
