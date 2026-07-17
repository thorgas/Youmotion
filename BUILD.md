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
