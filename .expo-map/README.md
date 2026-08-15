# Youmotion Expo map

This directory is a committed `expo-map` result set refreshed after the Checklist Design improvements on 2026-08-15.

- Source routes: 18 Expo Router routes across a root Stack and tab navigator
- Primary capture device: iPhone 17 Pro simulator, iOS 26.1
- Captures: 30 screenshots, including feedback consent, keyboard-open, populated History and Analytics, focused-notification, per-reminder preview, completed-check-in reminder offer, and success-origin schedule-picker variants
- Populated-data stress pass: the real History and Analytics components were rendered from the E2E archive with 133 moments and 15 saved belief statements; History was checked both collapsed and with filters expanded
- Keyboard pass: the reflection editor was checked for first focus, native submit/dismissal, a fresh second entry, and long text using iOS QuickType and Android Gboard
- Runtime-state hints: 0 detected, 0 captured, 0 skipped
- Navigation model: Expo Router mirrors the root XState actor, so static JSX parsing correctly reports no navigation edges

`capture-status.json` is the source of truth for captures that need an active XState reflection context. Twenty-two flows cover route visits, the Settings feedback consent path, and reminder runtime variants. The focused-notification flow records its validated-notification prerequisite; context-dependent routes are deliberately retained as findings instead of being mislabeled as successful screens.

## Review the map

1. Use `map.html` for the self-contained visual contact sheet.
2. Open [AppMap Visualiser](https://appmap-visualiser.vercel.app/).
3. Upload the newest dated `.appmap` file from this directory to inspect the interactive routes, screenshots, variants, and recorded flows.

The `.appmap` bundle is the preferred review artifact because it keeps the latest graph, screenshots, and flow metadata together in one uploadable file.

See [`docs/expo-map.md`](../docs/expo-map.md) for the complete refresh, replay, and review workflow.
