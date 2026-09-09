# Store screenshot repeatability

## Verified: render from committed native inputs

From the repository root, install the lockfile dependencies with
`pnpm install --frozen-lockfile`. Goldie 0.3.1 also needs `ffmpeg` on PATH.
Run:

```sh
pnpm exec node scripts/frame-native-store-captures.mjs --input-root store/review-2026-09-09/native --output goldie/out/repeatability-proof
```

This reads committed PNGs, not ignored working captures, and never operates a
device. The normalized input tree is `PLATFORM/LOCALE/DEVICE/SCENE.png`:

- iOS: `ios/{en-US,de-DE}/iphone-6.9/`
- Android: `android/{en-US,de-DE}/phone/`
- Scenes: `pulse`, `history-all-time`, `insights-august-calendar`, `settings-data`;
  Insights uses `insights-chart-full` on iOS and `insights-all-time` on Android.

Each run creates new isolated directories. `render-report.json` lists their
paths. Do not guess a previous run's random suffix. Each output has five PNGs:
iOS 1320×2868 and Android 1080×1920. For each report entry, run
`pnpm exec goldie verify --config <isolated>/goldie.config.mjs`.
Rendering is reproducible from these inputs; pixel-identical output across
different font/OS runtimes is not promised. iPad native images remain separate.

## Experimental: native restore and recapture

`restore-insights-ios-de.mjs` is a bounded failure reproducer, not a validated
release pipeline. Its latest unattended run stopped at the Apple Files picker:
no readable snapshot completed before the fixture wait timed out. Supervised
automation did restore the fixture and capture the complete chart.

Prerequisites:

1. Use a dedicated iPhone 17 Pro Max simulator with the intended Release build.
   Record its build/commit separately; these scripts do not build or install it.
2. Complete onboarding and select German. Set `E2E_DEVICE` to that simulator's
   explicit UDID, not a personal phone or an inferred default device.
3. Stage only `src/features/data-safety/__tests__/fixtures/legacy-archive.fixture.json`
   as `youmotion-demo-backup.json` in the Files picker's current On My iPhone
   folder. The fixture has 133 moments and 15 beliefs. Never use a personal backup.
4. Verify `agent-device --version` reports 0.20.10 in the calling shell. The local
   copy selected by `pnpm exec agent-device` was 0.20.0 during diagnosis. Resolve
   the absolute executable **before** pnpm modifies PATH:

```sh
AGENT_DEVICE_BIN="$(command -v agent-device)" pnpm exec node scripts/store-capture/restore-insights-ios-de.mjs "$E2E_DEVICE" goldie/out/cli-restore-proof --confirm-synthetic-device
```

The script refuses missing acknowledgement, missing absolute executable paths,
and versions other than the tested 0.20.10 before opening a device. Revalidate
before updating that pin. Every command is bounded; a failure stops the run and
closes only its own session. The acknowledgement authorizes replacing the
dedicated simulator's synthetic data. Counts are checked before replacement.

## Findings to preserve

- App rows may expose duplicate wrapper labels: use stable test IDs.
- Verify launch readiness before the first tap and destination identity after it.
- Dismiss the restore-success notice before navigating to Insights.
- Keep one owner per device. An idle daemon may retain an XCTest runner after
  session close; inspect owners before using `agent-device daemon stop --clean`.
  Never clear a daemon while another task uses it.
- Files-picker reads can fail despite successful interactive selection. Do not
  hide that failure with unchecked taps or call an interrupted replay a pass.
- Goldie clears destination PNGs: isolate every render, retain raw inputs.
- Classic layouts need explicit sizing; Android physical bezels clipped emulator
  status-bar corners, so corrected Android output uses unmasked native screens.
- The full chart requires a native scroll before capture, not an image crop.

## Release acceptance

Inspect both languages and platforms visually. Verify populated data, complete
chart labels, Settings data controls, status bars and headline readability.
Reconcile each asset with the exact submitted build and update the canonical
store provenance/approval inventory before uploading. Corrected review candidates
are under `store/review-2026-09-09/framed-corrected/`; no script here submits them.

For another app, reuse the capture/framing split, isolation and version gates;
replace the fixture, bundle ID, selectors, locales, native geometry and Goldie
copy/config. The Youmotion-specific restore path is not a generic app workflow.
