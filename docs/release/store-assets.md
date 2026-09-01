# Store asset package

These files are prepared for store review and use synthetic app data only.

## Google Play

- Feature graphic: [`google-play-feature-graphic.png`](../../artifacts/release-store/google-play-feature-graphic.png)
  - 1024×500 PNG, RGB, no alpha channel.
- Phone screenshots: [`01-history.png`](../../artifacts/release-store/01-history.png),
  [`02-history-filters.png`](../../artifacts/release-store/02-history-filters.png),
  [`03-settings-privacy.png`](../../artifacts/release-store/03-settings-privacy.png),
  and [`04-export.png`](../../artifacts/release-store/04-export.png). These
  four 1290×2796 RGB PNGs are the valid phone set. The separate
  [`05-analytics-pattern.png`](../../artifacts/release-store/05-analytics-pattern.png)
  is a 1074×1104 supplemental analytics visual, not a phone screenshot; use it
  only where Google Play accepts a non-phone listing image.

## Apple App Store

The Goldie-generated five phone captures below can be used for the supported
iPhone sizes; App Store Connect can scale down the highest-resolution upload.
Because `app.json` enables `ios.supportsTablet`, App Store Connect also needs
the iPad family populated. The raw iPad set is archived in
[`apple-ipad/`](../../artifacts/release-store/apple-ipad/) at 2064×2752, the
13-inch iPad portrait size.

The configured locales are `en-US` and `de-DE`. A localized set is valid only
when both the Goldie captions and the underlying app UI use that locale. For
`de-DE`, set the simulator to German, reinstall the app so its locale is
initialized from the system, verify German accessibility labels, and only then
capture the German scenes. Never ship German captions around an English app.

## Goldie screenshot capture

The store screenshot set is defined in `goldie/goldie.config.ts` and driven by
the flows in `.argent/flows/store-*.yaml`. Goldie captures the app as a Release
iOS Simulator build, then frames the raw captures for App Store Connect.

For populated History and Insights captures, the `store-02-today` flow first
creates four neutral, synthetic moments through the normal check-in journey.
Replay it from a clean install when recapturing. The optional archive restore
flow can also be used when a larger fixture is needed:

```sh
argent flow run .argent/flows/store-02-today.yaml --device "$E2E_DEVICE"
```

For the larger fixture, first replay
`.argent/flows/store-00-restore-fixture.yaml` after making the committed
fixture available to the simulator Files app as
`youmotion-demo-backup.json`:

```sh
argent flow run .argent/flows/store-00-restore-fixture.yaml --device "$E2E_DEVICE"
```

The flow imports only
`src/features/data-safety/__tests__/fixtures/legacy-archive.fixture.json`, a
neutral 133-moment/15-belief archive. It must never be replaced with a
personal backup.

Build the simulator app first, then capture and verify the assets:

```sh
pnpm exec expo run:ios --configuration Release --no-bundler
RELEASE_APP=$(find "$HOME/Library/Developer/Xcode/DerivedData" -path '*/Build/Products/Release-iphonesimulator/Youmotion.app' -print -quit)
GOLDIE_CONFIG="$PWD/goldie/goldie.config.ts" GOLDIE_APP_PATH="$RELEASE_APP" npx -y goldie@0 all
```

The framed PNGs are written under `goldie/out/` at 1320×2868 pixels for the
6.9-inch iPhone store slot. `goldie/out/` is intentionally ignored because it
contains generated capture output; copy approved files into the release asset
archive when they are ready for upload.

## Capture guardrails

- Captures contain no development overlay, notifications, fingers, or personal
  data.
- Keep the final binary and listing claims aligned with the current local-only
  behavior. Do not claim cloud sync, diagnosis, treatment, or AI features.
- Re-capture from the signed production build before submission if the UI or
  version changes.
- For every localized set, inspect at least one raw capture and confirm that
  the app controls, headings, navigation labels, dates, and empty/populated
  states are localized before framing or uploading it.
