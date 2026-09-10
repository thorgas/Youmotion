# Building and releasing Youmotion

Youmotion uses Expo Application Services (EAS) for cloud builds, signing, internal distribution, TestFlight, Google Play uploads, and optional over-the-air updates. Use the project-local EAS CLI through the pnpm scripts below; no global installation is required.

EAS has plan-dependent build quotas and pricing. Store distribution also requires paid Apple Developer and Google Play Console accounts.

## One-time setup

1. Sign in and link this repository to an Expo project:

   ```bash
   pnpm eas:login
   pnpm eas:whoami
   pnpm eas:init
   ```

   `eas init` adds the Expo project ID to the app configuration. Commit that change.

2. Let EAS create or import signing credentials:

   ```bash
   pnpm eas:credentials:ios
   pnpm eas:credentials:android
   ```

3. Create the application records before the first store release:

   - App Store Connect: create an app using bundle ID `com.youmotion.mobile`.
   - Google Play Console: create an app using package `com.youmotion.mobile`.
   - Complete the privacy, content-rating, export-compliance, pricing, tester, screenshot, and store-listing forms in each portal.
   - Use the engineering drafts in [`docs/legal/`](docs/legal/) and [`docs/release/`](docs/release/) as preparation only; replace placeholders and obtain legal review before publishing.

4. Keep secrets in EAS rather than Git:

   ```bash
   pnpm exec eas env:create --environment production --name NAME --value VALUE --visibility sensitive
   pnpm exec eas env:pull --environment development
   ```

   The build profiles use EAS's `development`, `preview`, and `production` environments.

## Verify before building

```bash
pnpm install --frozen-lockfile
pnpm verify
pnpm test:coverage
pnpm doctor:expo
```

Change the user-facing version in `app.json` for a new release. EAS stores iOS build numbers and Android version codes remotely and increments them for production builds.

```bash
pnpm version:ios
pnpm version:android
```

## Development clients

Development clients include developer tools and are not store binaries.

```bash
pnpm build:dev:android
pnpm build:dev:ios
pnpm build:simulator:ios
```

For a physical iOS device, register it when EAS prompts. After installing the client, start Metro and scan its QR code:

```bash
pnpm start
# Use this if the device cannot reach the computer over the LAN:
pnpm start:tunnel
```

## Internal preview builds

Preview builds are release-like binaries shared through an EAS install link. Android produces an installable APK. iOS uses internal/ad hoc distribution and requires registered devices.

```bash
pnpm build:preview
# Or one platform:
pnpm build:preview:android
pnpm build:preview:ios
```

## Production builds

Production Android builds are AAB files for Google Play. Production iOS builds are signed App Store archives.

```bash
pnpm build:production
# Or one platform:
pnpm build:production:android
pnpm build:production:ios
```

Monitor cloud builds with `pnpm eas:builds`. Open the EAS dashboard with `pnpm eas:open` to inspect builds, submissions, updates, and credentials.

## TestFlight + Play testing release

Use this path when you want a release-ready binary for both app stores' testing paths.

```bash
pnpm build:testing
```

An iOS `testing` build exposes the hidden release footer and manual channel
selector, so it can switch among `testing`, `qa`, and `production`. Build and
submit that TestFlight variant in one command:

```bash
pnpm release:testflight:qa-controls
```

Submit the latest successful `testing` build from the terminal:

```bash
pnpm submit:testflight:testing
pnpm submit:play:testing
```

These commands query EAS for the latest finished store build with the `testing` profile, print its commit and ID, and submit that exact ID. The iOS command downloads the selected IPA and runs `verify:ios:archive` before submitting. No browser or manual ID lookup is needed. Use `--dry-run` to print the selected build without downloading or submitting, or `--id EXACT_BUILD_ID` to select an earlier testing build. `--latest` is accepted explicitly as well.

To list build IDs yourself:

```bash
pnpm exec eas build:list --platform ios --build-profile testing --status finished --limit 5
pnpm exec eas build:list --platform android --build-profile testing --status finished --limit 5
```

Queue both testing builds without waiting or submitting:

```bash
pnpm release:testing
```

Wait for both builds to finish, then run the submit commands above. When builds overlap, use their printed IDs to select the intended revision. iOS uploads enter TestFlight processing; Android uses Play internal testing. EAS holds and increments store build numbers remotely.

For an ordinary production-only TestFlight/App Store candidate, use:

```bash
pnpm release:testflight:production
```

`pnpm release:testflight` remains an alias for this production-only path. The
binary has no manual channel selector, but it automatically checks the
`production` channel on launch. Because launch waiting is zero, a compatible
update downloaded during one cold launch is applied on the next; allow up to
two cold launches when verifying a new production OTA.

The archive guard must print `iOS archive is free of the known HarnessUI private selectors.` It can also be run manually with `pnpm verify:ios:archive -- /absolute/path/to/Youmotion.ipa`.

If Play reports that a versionCode was already submitted, its counter is ahead of EAS (usually after a manual or differently sourced upload). Resynchronize once, entering a value at least as high as Play's current maximum, then rebuild; `autoIncrement` will use the next value:

```bash
pnpm version:android:set
pnpm build:testing:android
pnpm submit:play:testing --id EXACT_BUILD_ID
```

## Local iOS Harness testing

Use the local native Harness recipe when running the React Native Harness suites on an iOS simulator. Run `preios` first. If the `ios/` directory is absent, generate it without installing dependencies:

```bash
pnpm preios
pnpm exec expo prebuild --platform ios --no-install
```

Then prepare the local HarnessUI pods and restore the package exclusion:

```bash
pnpm prepare:harness:ios
```

Build the app for the running simulator, replacing `ACTUAL_UDID` with the device UDID:

```bash
pnpm exec xcodebuild \
  -workspace ios/Youmotion.xcworkspace \
  -scheme Youmotion \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'id=ACTUAL_UDID' \
  build
```

Reinstall the resulting `.app` on the simulator with Argent, then run:

```bash
pnpm test:harness:ios
```

Do not use an Expo run command that can replace the prepared test binary from its cache. Do not run EAS while temporary Harness preparation is in progress. With pnpm 11, disable automatic dependency recreation for concurrent scripts:

```bash
pnpm_config_verify_deps_before_run=false pnpm --config.verify-deps-before-run=false SCRIPT
```

## iOS: TestFlight and App Store

Always test a release in TestFlight first:

```bash
# Build and upload in one command:
pnpm release:testflight

# Or upload the latest existing production build:
pnpm submit:testflight
```

EAS uploads the binary to App Store Connect, where it appears in TestFlight after Apple processes it. Add internal testers first, then external testers if needed.

EAS Submit does not perform the final App Store release. In App Store Connect, select the tested build, complete the version metadata and screenshots, answer the review questions, and submit it for App Review. Choose manual, scheduled, or phased release there.

## Android: Google Play

Google requires the first AAB to be uploaded manually in Play Console before service-account/API submissions work. Build that AAB with:

```bash
pnpm build:production:android
```

Upload it to Play Console's internal testing track. Then configure a Google Play service account for EAS Submit. Keep its JSON key out of Git and use EAS credentials or a file-type EAS environment variable.

For later uploads:

```bash
# Safest default: internal testing track
pnpm submit:play:internal

# Upload the latest build as a draft production release
pnpm submit:play:production
```

The production submission profile deliberately creates a draft. Review the release in Play Console, use a staged rollout when appropriate, and publish it there.

## Optional EAS Update setup

EAS Update can deliver compatible JavaScript and asset changes without another store build. Initialize it only after `pnpm eas:init`:

```bash
pnpm eas:update:configure
```

Commit the generated `expo-updates` dependency and app configuration. The EAS build profiles already assign `preview` and `production` channels. Expo currently recommends the `appVersion` runtime policy for production use.

Publish only changes that do not alter native code or native configuration:

```bash
pnpm exec eas update --channel preview --environment preview --message "Describe the update"
pnpm exec eas update --channel production --environment production --message "Describe the update"
```

Adding a native dependency, changing a config plugin or permission, or otherwise changing the native runtime requires a new EAS Build instead of an OTA update.

## Status and troubleshooting

```bash
pnpm eas:builds
pnpm eas:open
pnpm eas:credentials:ios
pnpm eas:credentials:android
```

- Remote versioning and `autoIncrement` prevent duplicate iOS build numbers and Android version codes.
- If App Store Connect cannot find the app, verify its record and `com.youmotion.mobile` bundle ID.
- If Play submission fails, verify the first manual upload and the service account's Play Console permissions.
- If a build fails, inspect its EAS dashboard logs before changing native configuration or clearing caches.

## Official references

- [EAS Build](https://docs.expo.dev/build/introduction/)
- [Build profiles](https://docs.expo.dev/build/eas-json/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [App version management](https://docs.expo.dev/build-reference/app-versions/)
- [EAS environment variables](https://docs.expo.dev/eas/environment-variables/)
- [EAS Update deployment](https://docs.expo.dev/eas-update/deployment/)
