# Store screenshot repair — 2026-09-09

Branch: `codex/store-release-2026-09-08`. Starting commit: `8baab88`.

## Confirmed causes

- Goldie 0.3.0 resolves bundled Argent 0.22.1 by default; manual authoring
  used global Argent 0.24.0. The matrix now sets `GOLDIE_ARGENT_BIN=argent`.
- Goldie reinstalls for each invocation. Settings checked optional onboarding
  immediately after launch, before hydration made the screen visible.
  A recorded fresh-install flow now waits for onboarding before pressing Skip.
- iOS native devtools was injected but disconnected from the shared server.
  One coordinated server restart plus the requested app restart restored it.
  Native inspection confirmed `onboarding-skip` exists; it was not a missing ID.
- Different devices still share Argent's server. Goldie can restart it during
  iOS locale preparation, so device captures must be serialized.
- Android API 33 emulator logs show accessibility window timeouts; its flow
  tree responds once and then hangs during Settings scroll or settling.

## Evidence

The fresh-install onboarding replay passed on iOS 26.5, iPhone 17 Pro Max.
The pulse has ongoing animation, so its idle warning alone is not a failure;
the destination is separately verified by `emotion-star`.

German Settings completed Goldie capture, framing and dimension validation
twice. The final composition scrolls to `app-release-info` and shows the local
data card, export, restore, delete, About the Pulse, and app version.

Generated review files (ignored):

- `goldie/out/screenshots/iphone-6.9/de-DE/01-settings-1.png`
- `goldie/out/screenshots/iphone-6.9/de-DE/02-settings-2.png`

These are capture repair evidence from the existing simulator Release artifact.
They do not establish complete store coverage or signed-release provenance.
History/Insights and the remaining platform/locale cells remain unverified.

## App Store metadata

App `6807357236`, editable iOS version `1.0.3`, version ID
`e809b30d-7ec4-48c7-9921-f7509ad048bc`.
Canonical pull, validation and dry-run succeeded. All four localization writes
were rejected by Apple because the API key does not permit them. Readback
confirmed no changes. No authenticated ASC web session is cached.
An authorized write-capable API key or web login is required to retry.
Local failure reports are ignored under `.asc/`.

## Next work

Finish emulator accessibility recovery, then replay native Android Settings.
Apply the verified fresh-install setup and explicit locale selection to the
remaining populated scenes; verify all 133 moments after fixture restore.
Do not label a dry-run, a passing frame renderer, or reused raw PNGs as proof
of successful fresh native capture.
