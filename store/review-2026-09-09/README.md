# Native screenshot review — 9 September 2026

Fresh agent-device captures from Youmotion Release builds, using the committed
synthetic archive (133 moments, 15 beliefs). No personal journal data was used.
These are review candidates, not uploaded or approved store assets.

Upload status update: the owner subsequently requested upload of the corrected
sets. See [the dated upload record](../../docs/handoffs/store-upload-2026-09-09.md)
for completed Apple uploads and saved Google drafts. The capture-time notes
below describe their original review state, not current remote listing status.

## Native images

- `native/ios/de-DE/iphone-6.9/` and `native/ios/en-US/iphone-6.9/`: 1320×2868.
- `native/ios/de-DE/ipad-13/` and `native/ios/en-US/ipad-13/`: 2064×2752.
- `native/android/de-DE/phone/` and `native/android/en-US/phone/`: 1280×2856.

Each set includes `pulse.png`, `history-all-time.png`, `insights-all-time.png`,
`insights-august-calendar.png`, and `settings-data.png`. Extra iPhone Insights
captures are diagnostic alternatives. The all-time phone view shows the insight
and only part of the chart; the separate calendar image supplies a complete
populated calendar. Settings focuses on local data, backup and deletion.

## Corrected phone images — use these for review

`framed-corrected/ios/{de-DE,en-US}/` contains five images per locale at
1320×2868. `framed-corrected/android/{de-DE,en-US}/` contains five images per
locale at 1080×1920. All four sets passed Goldie verification.

The uniform classic layout preserves the whole screen. iPhone Insights uses
new `insights-chart-full.png` captures with all seven chart labels and counts.
Android uses an unmasked, frameless native screenshot so its square emulator
status-bar corners are not clipped by a physical-device bezel. Headlines and
supporting copy are retained for every scene, including Settings.

The renderer sets explicit classic-layout sizing; Goldie 0.3.1 otherwise renders
copy without a device image. Seven focused tests and `pnpm verify` passed.
No app code or native build changed for this correction.

Unattended restore was tested but remains blocked on acquiring the Apple Files
picker snapshot. The bounded reproducer and precise failure are documented in
`docs/handoffs/store-screenshot-repair.md`. Corrected PNG rendering is verified;
this must not be confused with complete fresh-install capture automation.

## Previous framed phone images — superseded

`framed/ios/{de-DE,en-US}/` contains six images per locale at 1320×2868.
`framed/android/{de-DE,en-US}/` contains six images per locale at 1080×1920.
Goldie dimension verification passed for all four old sets. These are retained
for comparison only: Android framing clips the status-bar edges, and the iPhone editorial
Insights crop does not show the whole chart. Native images remain available for
choosing a different composition. iPad images are native, not framed.

Re-render committed inputs from the repository root:
`pnpm exec node scripts/frame-native-store-captures.mjs --input-root store/review-2026-09-09/native --output goldie/out/repeatability-proof`.
This does not restore data or capture the app and does not require ignored local
inputs. See `scripts/store-capture/README.md` for setup and validation.

## Build correspondence

iOS uses the Release simulator app rebuilt on September 9 during this task.
Android uses `android/app/build/outputs/apk/release/app-release.apk`, built at
00:35 on September 9; it was not rebuilt in this capture run. Confirm correspondence
with the exact submitted store build before uploading. The capture source checkout
was `e7f1e9f` with screenshot-tooling changes in progress; no app behavior changed.

Agent-device navigated the native app and captured full-resolution PNGs. The
restore preview and populated All-time Insights established the 133-moment data
set. The August calendar was selected because it contains a complete recorded
month. Screenshots were reviewed for language and content; final owner approval
is pending. No store submission was performed.

Goldie framing is a separate stage, using `scripts/frame-native-store-captures.mjs`.
Its generated report records each isolated output directory. The native capture
route worked interactively under agent control; unattended fresh-install replay
is not yet proven. Preview videos and reflection/belief screens are not included
in this review bundle.
