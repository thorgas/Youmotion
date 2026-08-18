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

## Pending refresh

Guiding-belief management changed after this capture set, so `(tabs)/settings` and `belief-library` are marked `stale` in `capture-status.json`. The screenshots, `map.html`, and the dated `.appmap` bundle still show the previous behaviour:

- Settings renames its PERSONALIZE entry to "Manage guiding belief", replaces its description, and counts every belief that has a guiding belief or a reminder.
- The library lists suggested beliefs too, not only self-authored ones, and hides Edit/Remove for them while keeping their reminder controls.
- The library eyebrow, title, explanation, and empty state were rewritten, because the previous copy described a screen that only held self-authored beliefs.

The route graph is unaffected: no route file was added, moved, or removed, so `graph.json` still matches `src/app/`.

Re-capture on an iOS simulator; none exists for Youmotion on this machine. A capture attempt on the Pixel 9 emulator could not persist a check-in, so the new library state could not be rendered there. That emulator still held the app data left by earlier failed migrations and was never cleared before the attempt, so the failure is not established as a native limitation.

## Review the map

1. Use `map.html` for the self-contained visual contact sheet.
2. Open [AppMap Visualiser](https://appmap-visualiser.vercel.app/).
3. Upload the newest dated `.appmap` file from this directory to inspect the interactive routes, screenshots, variants, and recorded flows.

The `.appmap` bundle is the preferred review artifact because it keeps the latest graph, screenshots, and flow metadata together in one uploadable file.

See [`docs/expo-map.md`](../docs/expo-map.md) for the complete refresh, replay, and review workflow.
