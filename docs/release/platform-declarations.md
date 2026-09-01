# Platform declaration worksheet

Complete this worksheet in the store portals after checking the exact
production binary and all bundled SDKs. It is an engineering aid, not a legal
determination.

## Current app behavior to disclose

- No account or sign-in flow.
- Journal, belief, reminder, language, and insight data are stored locally.
- No Youmotion backend receives journal data.
- No advertising or analytics feature is intentionally configured.
- Local notifications are optional and scheduled on-device.
- User-initiated feedback can open the system email composer.
- User-initiated screenshot feedback captures only after consent.
- User-initiated backup export creates a file that the user may share.

## Apple App Privacy questions to resolve

- Confirm whether the final binary and every third-party SDK collect any data
  sent off-device, including diagnostics or identifiers.
- If no data is collected from the app, select Apple's no-data path only after
  verifying the production binary and SDK documentation.
- Publish the real privacy-policy URL.
- Complete the age-rating questionnaire.
- Answer export-compliance questions for the submitted build.
- Declare the selected category and content rights.

## Google Play declarations to resolve

- Complete Data safety for the complete distributed app and all SDKs.
- Link the published privacy policy.
- Complete content rating and target-audience forms.
- Declare whether ads are present.
- Declare app access; state that no account is required and provide the review
  path through onboarding, Feeling Pulse, reflection, History, and Insights.
- Complete the health-related declaration if Play Console classifies the app as
  a health app or requests it.

## Reviewer instructions draft

Youmotion does not require an account or network connection for its core flow.
Open the app, complete onboarding, use the Feeling Pulse, save a reflection,
and open History or Insights from the tab bar. Optional reminders are available
in Settings and require notification permission. The app's journal data is
local-first; no demo credentials are required.
