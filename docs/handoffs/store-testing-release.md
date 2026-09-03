# Store testing release handoff

## Goal

Queue an exact-source release for TestFlight and the Google Play internal testing track.

## Configuration

- EAS build profile: `testing`
- EAS Update channel: `testing`
- iOS destination: App Store Connect / TestFlight
- Android destination: Google Play `internal`, release status `completed`
- Combined command: `pnpm release:testing`

The combined command uses `--no-wait`: EAS continues both builds and their automatic submissions after the local command exits.

Build numbers use EAS remote versioning and `autoIncrement`. If a manual Play upload moves Google's versionCode ahead of EAS, run `pnpm version:android:set`, enter at least Play's current maximum, and rebuild. EAS then increments from the synchronized value.

## Preconditions

```bash
pnpm install --frozen-lockfile
pnpm eas:whoami
pnpm exec eas project:info
pnpm version:ios
pnpm version:android
```

The Expo account must have access to `@youmotion/youmotion`. Store credentials and application records must already exist in App Store Connect and Google Play Console.

## Verification

Before dispatch:

```bash
pnpm verify
pnpm test:coverage
pnpm doctor:expo
```

After dispatch, capture the exact source commit and EAS build URLs here. Verify processing and tester availability in both store consoles.

Before iOS submission, download the IPA and run `pnpm verify:ios:archive -- /absolute/path/to/Youmotion.ipa`. This is the artifact-level guard against Apple 90338 regressions from private HarnessUI touch selectors.

## Current release

- Branch: `codex/feeling-pulse-contours`
- iOS source commit: `c14d6e24f314150fc5e5e3e6d3c8a3f56b4472f0`
- iOS build 7: [`b94c129c-4a67-4fa7-a1b2-54c6e9d43efa`](https://expo.dev/accounts/youmotion/projects/youmotion/builds/b94c129c-4a67-4fa7-a1b2-54c6e9d43efa)
- iOS submission: [`1a9ddd7c-5d4c-4116-b206-87034ff7a877`](https://expo.dev/accounts/youmotion/projects/youmotion/submissions/1a9ddd7c-5d4c-4116-b206-87034ff7a877), uploaded successfully and processing in [TestFlight](https://appstoreconnect.apple.com/apps/6807357236/testflight/ios)
- Android source commit: `3b36265075689b8e93c4a6334eba480b587375dc` (pre-rebase equivalent)
- Android versionCode 6: [`29a7a042-96f8-4185-8a7c-d14d4e84600a`](https://expo.dev/accounts/youmotion/projects/youmotion/builds/29a7a042-96f8-4185-8a7c-d14d4e84600a)
- Android submission: [`f6cddce3-44cb-4af2-bba2-01aa504e6763`](https://expo.dev/accounts/youmotion/projects/youmotion/submissions/f6cddce3-44cb-4af2-bba2-01aa504e6763), finished on the Play internal track

## Release evidence

- Rebased onto future-main `codex/store-assets` at `c299e93c8fe3e6024a132bba65eac635edd99453`.
- Clean `pnpm install --frozen-lockfile` succeeded after resolving the committed pnpm build-approval placeholders.
- `pnpm verify`: 46 suites and 308 tests passed.
- `pnpm test:coverage`: 46 suites and 308 tests passed; all configured thresholds passed.
- Generated iOS autolinking for `testing` and `production` excludes `@react-native-harness/ui`; 38 other native modules remain resolved.
- The rejected build 5 IPA reproduces Apple 90338 and contains all six forbidden selectors.
- `pnpm verify:ios:archive -- /private/tmp/youmotion-ios-build-7.ipa` passes for replacement build 7.
- `pnpm doctor:expo` still reports pre-existing Expo SDK patch-version drift and duplicate native-module versions. No dependency upgrades were made because they require a separate approved dependency change.
