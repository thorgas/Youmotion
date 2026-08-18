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

## Guiding-belief management refresh

`(tabs)/settings` and `belief-library` were re-captured on an iPhone 17 Pro simulator, iOS 26.1, after restoring the committed archive fixture through Settings → Restore from a backup. They now show:

- Settings' PERSONALIZE entry as "Manage guiding belief", with a count covering every belief that has a guiding belief or a reminder (15, where the previous rule counted 3).
- The library listing suggested beliefs alongside authored ones, hiding Edit/Remove for suggested beliefs while keeping their reminder controls.
- The rewritten library eyebrow, title, explanation, and empty state, because the previous copy described a screen that only held self-authored beliefs.

The route graph is unaffected: no route file was added, moved, or removed, so `graph.json` still matches `src/app/`.

`map.html` and the dated `.appmap` bundle still carry the previous screenshots; regenerate them on the next full `expo-map` run.

Populate device captures only from `src/features/data-safety/__tests__/fixtures/legacy-archive.fixture.json`. Its text is synthetic, so it is safe in committed screenshots and in an uploaded `.appmap`; a personal export is not.

## Review the map

1. Use `map.html` for the self-contained visual contact sheet.
2. Open [AppMap Visualiser](https://appmap-visualiser.vercel.app/).
3. Upload the newest dated `.appmap` file from this directory to inspect the interactive routes, screenshots, variants, and recorded flows.

The `.appmap` bundle is the preferred review artifact because it keeps the latest graph, screenshots, and flow metadata together in one uploadable file.

See [`docs/expo-map.md`](../docs/expo-map.md) for the complete refresh, replay, and review workflow.
