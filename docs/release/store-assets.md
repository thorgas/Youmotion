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

Every History/Verlauf and Insights/Einblicke capture must use the complete
committed archive fixture. The smaller `store-02-today` demo is not valid for
release screenshots. Before each populated capture, replay
`.argent/flows/store-00-restore-fixture.yaml` after making the committed
fixture available to the simulator Files app as
`youmotion-demo-backup.json`:

```sh
argent flow run .argent/flows/store-00-restore-fixture.yaml --device "$E2E_DEVICE"
```

The flow imports only
`src/features/data-safety/__tests__/fixtures/legacy-archive.fixture.json`, a
neutral 133-moment/15-belief archive generated with irregular timing,
intensities, and emotion frequencies for credible release imagery. Regenerate
it with `pnpm generate:store-screenshot-fixture`; never replace it with a
personal backup.

Goldie replays scene flows independently. Do not assume data created or restored
for an earlier scene is available to a later one. Restore and verify the fixture
immediately before each History or Insights capture, select `All time` / `Gesamt`,
and confirm the populated UI before framing.

Build both release artifacts first. Then run the checked-in matrix runner. It
executes every platform, locale, and scene as an independent Goldie invocation,
so a flow cannot accidentally inherit onboarding, locale, or restored data from
an earlier screenshot:

```sh
pnpm exec expo run:ios --configuration Release --no-bundler
RELEASE_APP=$(find "$HOME/Library/Developer/Xcode/DerivedData" -path '*/Build/Products/Release-iphonesimulator/Youmotion.app' -print -quit)
./android/gradlew -p android app:assembleRelease
GOLDIE_APP_PATH="$RELEASE_APP" \
GOLDIE_ANDROID_APP_PATH="$PWD/android/app/build/outputs/apk/release/app-release.apk" \
pnpm capture:store-screenshots
```

Use filters for a bounded repair or a preflight that performs no capture:

```sh
GOLDIE_APP_PATH="$RELEASE_APP" \
GOLDIE_ANDROID_APP_PATH="$PWD/android/app/build/outputs/apk/release/app-release.apk" \
pnpm capture:store-screenshots -- --dry-run

GOLDIE_APP_PATH="$RELEASE_APP" \
pnpm capture:store-screenshots -- --platform ios --locale de-DE --scene insights
```

The portable orchestration lives in
`scripts/store-screenshot-matrix.mjs`. App-specific choices live only in
`store/screenshots/pipeline.config.json`, the Goldie configs, and the Argent
flows. To reuse the runner in another app, copy the script and its test, then
replace the JSON locales, scenes, platform config paths, artifact environment
variables, and capture command. The other app supplies its own deterministic
fixture and flows; no Youmotion flow or test data belongs in the reusable layer.

The runner is deliberately sequential so two emulators never compete for the
same Goldie or Argent state. It rejects missing artifacts and unknown filters
before launching a device. A real run writes `goldie/out/capture-report.json`
with the exact Git commit, capture config hash, release artifact hashes, command,
duration, and result for every attempted matrix cell. Keep this report with the
generated review bundle; it is generated evidence and is not committed.

The runner explicitly uses the `argent` executable on PATH via
`GOLDIE_ARGENT_BIN` (override it with an absolute executable path if needed).
Goldie 0.3.0 otherwise selects its bundled Argent 0.22.1, whereas the flows
were authored with Argent 0.24.0. Check `argent --version` before capture.
Do not run another Goldie/Argent capture concurrently, even on another platform:
Goldie may restart the shared tool-server when changing iOS locale.
Each matrix command has a ten-minute timeout and records command errors.

Fresh-install Settings capture starts with `store-fresh-onboarding`, which
waits for the onboarding screen before skipping it. An immediate optional
`when` after launch races hydration and can skip the setup entirely. The
onboarding Skip ID does exist in the native tree; an unavailable native
devtools connection must be repaired before diagnosing it as a missing ID.

Portability stops at the product boundary. Bundle/application IDs, device
profiles, store copy and frames remain in the Goldie configs. Navigation IDs,
locale switching, fixture import and post-import assertions remain in the app's
Argent flows. Fixture counts and expected output dimensions remain in the app's
provenance policy. A reused runner must replace those inputs rather than copying
Youmotion selectors or its synthetic archive.

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
- Update `store/screenshots/provenance.json` with the final PNG hashes, exact
  signed-build commit, fixture count, and visual approval. Run
  `pnpm verify:store-screenshots`; do not upload while it fails.
