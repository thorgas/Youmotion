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

- Source commit: pending
- iOS build: pending
- Android build: pending
- Submission status: pending
