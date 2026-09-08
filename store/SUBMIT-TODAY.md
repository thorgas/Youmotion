# Youmotion submission handoff — 8 September 2026

This is the shortest path from this branch to review. Do not enter a URL in a
store until it resolves publicly over HTTPS.

## 1. Deploy the website

Deploy `website/` to Cloudflare Pages and attach the `youmotion.app` domain.

Verify these URLs:

- Marketing: `https://youmotion.app/`
- App privacy (English): `https://youmotion.app/privacy/app/`
- App privacy (German): `https://youmotion.app/de/privacy/app/`
- Support (English): `https://youmotion.app/support/`
- Support (German): `https://youmotion.app/de/support/`
- Terms (English): `https://youmotion.app/terms/`
- Terms (German): `https://youmotion.app/de/terms/`
- Website privacy: `https://youmotion.app/privacy/website/`
- Impressum: `https://youmotion.app/de/impressum/`

The App Store and Google Play buttons on the website intentionally remain
non-clickable “Coming soon” labels until public store URLs exist.

## 2. Build from the release commit

Use the final pushed commit of this branch. The production profiles already use
automatic build-number/version-code increments and the `production` EAS Update
channel.

```sh
pnpm build:production
```

Do not publish a production EAS Update with major new functionality after review
starts. Apple permits downloaded code only within the reviewed app's intended
purpose; use store binaries for material feature changes.

## 3. App Store Connect

Use the copy in:

- `metadata/apple/en-US.md`
- `metadata/apple/de-DE.md`

Upload screenshots from:

- `screenshots/ios/en-US/iphone-6.9/`
- `screenshots/ios/de-DE/iphone-6.9/`
- `screenshots/ios/en-US/ipad-13/`
- `screenshots/ios/de-DE/ipad-13/`

Recommended declarations:

- Primary category: Health & Fitness
- Sign-in/demo account: not required
- Encryption export compliance: no non-exempt encryption
- Tracking: no
- Advertising: no
- User-generated journal content: not collected by the developer
- EAS installation identifier: conservatively review as an unlinked device ID
  used only for app functionality; it is not used for tracking
- Age rating: answer from actual self-reflection content; no medical-treatment claim
- Release: manual release after approval

Reviewer path: skip or complete onboarding → complete a Feeling Pulse check-in →
optionally reflect → open History and Insights → open Settings for local reminder,
backup, deletion, feedback, privacy, and terms controls.

## 4. Google Play Console

Use the copy in:

- `metadata/google-play/en-US.md`
- `metadata/google-play/de-DE.md`

Use the 1024×500 graphic at `assets/google-play-feature-graphic.png` and the
current framed phone sets at:

- `../artifacts/release-store/google-play/en-US/`
- `../artifacts/release-store/google-play/de-DE/`

Recommended declarations:

- Category: Health & Fitness
- Ads: no
- App access: all functionality available without login
- Data deletion: journal data is local and deletable in-app; uninstall removes
  app-scoped data, subject to platform backup behavior
- Data encrypted in transit: yes for technical HTTPS update requests
- User content: not collected or shared by the developer
- Device or other IDs: conservatively declare the pseudonymous EAS installation
  ID as collected, not shared, required for app functionality, not used for ads
  or tracking
- Remote push: no; notifications are locally scheduled
- Release status: draft/manual rollout until approval and final owner check

## 5. Owner checks that cannot be done in this repository

- Confirm the company register number shown in the Impressum is exactly correct.
- Obtain legal approval for privacy policy, website privacy, terms, and Impressum.
- Confirm App Store Connect agreements, paid developer membership, review contact,
  copyright owner, age rating, and privacy answers.
- Confirm Play Console identity verification, app signing/upload key, content
  rating, target audience, Data safety answers, and any testing-track requirement.
- Install and test the exact processed TestFlight and Play artifacts on physical
  devices before pressing Submit for Review.
