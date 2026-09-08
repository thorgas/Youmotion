# Store submission checklist

## Completed in the repository

- [x] App identifiers configured as `com.youmotion.mobile`.
- [x] Expo project ID configured.
- [x] App version set to `1.0.3` in `app.json`.
- [x] iOS non-exempt-encryption flag declared.
- [x] Android AAB production profile exists in `eas.json`.
- [x] iOS production build and TestFlight commands exist.
- [x] English/German listing draft created.
- [x] Privacy-policy and terms drafts created.
- [x] Controller, address, register, and contact placeholders replaced from
  `https://thorgas.com/`; bilingual legal drafts completed.
- [x] Google Play 1024x500 feature graphic prepared.
- [ ] Fresh synthetic-data phone screenshots captured and approved against the
  signed release build. The reused set is currently blocked by
  `pnpm verify:store-screenshots`.
- [ ] Fresh Apple 13-inch iPad screenshots captured and approved for the
  tablet-capable build.
- [x] Production Android version 13 and iOS build 17 finished from release
  commit `d44bddc5c61c2c74173660baac43e13ffcec75a7`.
- [x] Production Pages deployment created for commit `afc6f58`; custom-domain
  DNS remains pending.

## Publisher/legal-owner actions

- [ ] Obtain legal review of the completed drafts.
- [ ] Publish the app privacy policy and terms over stable HTTPS URLs and add
  those final URLs to the store listings.
- [ ] Create/verify App Store Connect and Google Play app records.
- [ ] Accept agreements and complete tax/banking/account verification.
- [ ] Configure and verify Apple distribution credentials.
- [ ] Configure and verify Google Play App Signing/upload credentials.
- [ ] Confirm production version `1.0.3` and unique build/version numbers.
- [ ] Complete Apple App Privacy, age rating, category, content-rights, and
  export-compliance forms.
- [ ] Complete Google Data safety, content rating, target audience, ads,
  category, and app-access declarations.
- [ ] If applicable, complete Google's 12-tester/14-day closed-test gate.
- [ ] Confirm all screenshots against the signed production build and upload
  the matching iPhone, iPad, and Google Play assets.
- [ ] Require `pnpm verify:store-screenshots` to pass before any screenshot
  upload or final review submission.
- [ ] Confirm each localized screenshot set shows the app UI in that same
  language, especially the German App Store set.
- [ ] Test final production binaries on real devices and store testing tracks.
- [ ] Give reviewers instructions explaining that no account is required.

## Do not submit yet if

- a legal placeholder remains or the privacy URL is unavailable;
- the production binary is signed with a debug/local key;
- screenshots contain development overlays or personal data; or
- the listing promises cloud sync, encryption, medical treatment, diagnosis,
  AI analysis, or other functionality absent from the submitted build.
