# Youmotion Expo map

This directory is a committed `expo-map` result set. Its static route graph was refreshed on 2026-09-04; the latest complete runtime capture bundle remains the 2026-08-21 bundle.

- Source routes: 18 Expo Router routes across a root Stack and tab navigator
- Primary capture device: iPhone 17 Pro simulator, iOS 26.1
- Captures: 31 screenshots, including feedback consent, keyboard-open, populated History and Analytics, emotion check-in reminder empty and active states, focused-notification, per-reminder preview, completed-check-in reminder offer, and success-origin schedule-picker variants
- Populated-data stress pass: the real History and Analytics components were rendered from the E2E archive with 133 moments and 15 saved belief statements; History was checked both collapsed and with filters expanded
- Keyboard pass: the reflection editor was checked for first focus, native submit/dismissal, a fresh second entry, and long text using iOS QuickType and Android Gboard
- Runtime-state hints: 0 detected, 0 captured, 0 skipped
- Navigation model: Expo Router mirrors the root XState actor, so static JSX parsing correctly reports no navigation edges

`capture-status.json` is the source of truth for captures that need an active XState reflection context. Twenty-two flows cover route visits, the Settings feedback consent path, and reminder runtime variants. The focused-notification flow records its validated-notification prerequisite; context-dependent routes are deliberately retained as findings instead of being mislabeled as successful screens.

## Positive Leitsatz surface refresh

The 2026-09-04 implementation aligns positive Leitsatz content on the guiding-belief editor, belief library, belief-library editor, and all Leitsatz reminder entry states. The static graph still reconciles to 18 routes and 2 layouts, and the affected component tests cover the green semantic surface, neutral explanatory content, crossed-out released Leitsatz, and focused-notification state.

The affected runtime captures are deliberately marked `needs-recapture` in `capture-status.json`. They must be replayed only on the explicitly selected `Youmotion Expo Map` simulator with bundle id `com.youmotion.mobile`. Never use automatic simulator selection or a simulator belonging to another app. Until those captures are replaced and visually inspected, `Youmotion-2026-08-21.appmap` remains the latest complete bundle; do not package the stale images under a newer date.

## Emotion check-in reminder refresh

`(tabs)/settings` and `reminders` reuse the feature's committed synthetic QA captures. They now show the public emotion check-in reminder terminology, the localized Settings entry, and both empty and active reminder states. The existing `leitsatz-reminder` capture remains current because it shows the unchanged Leitsatz-specific state; the changed emotion-check-in offer is represented by the reminder route captures and replayable feature E2E flow.

The route graph is unaffected: no route file, layout, parameter, or navigation edge was added, moved, or removed.

## Guiding-belief management refresh

`(tabs)/settings` and `belief-library` were re-captured on an iPhone 17 Pro simulator, iOS 26.1, after restoring the committed archive fixture through Settings → Restore from a backup. They now show:

- Settings' PERSONALIZE entry as "Manage guiding belief", with a count covering every belief that has a guiding belief or a reminder (15, where the previous rule counted 3).
- The library listing suggested beliefs alongside authored ones, hiding Edit/Remove for suggested beliefs while keeping their reminder controls.
- The rewritten library eyebrow, title, explanation, and empty state, because the previous copy described a screen that only held self-authored beliefs.

The route graph remains unaffected, so `graph.json` still matches `src/app/`.

`Youmotion-2026-08-21.appmap` carries the current route graph, refreshed reminder screens, and replayable flows. `map.html` remains the fallback contact sheet from the earlier full capture set because the current standalone renderer cannot consume the format-v2 object-shaped flow steps; the `.appmap` bundle is the current primary artifact.

Populate device captures only from `src/features/data-safety/__tests__/fixtures/legacy-archive.fixture.json`. Its text is synthetic, so it is safe in committed screenshots and in an uploaded `.appmap`; a personal export is not.

## Review the map

1. Use `map.html` for the self-contained visual contact sheet.
2. Open [AppMap Visualiser](https://appmap-visualiser.vercel.app/).
3. Upload the newest dated `.appmap` file from this directory to inspect the interactive routes, screenshots, variants, and recorded flows.

The `.appmap` bundle is the preferred review artifact because it keeps the latest graph, screenshots, and flow metadata together in one uploadable file.

See [`docs/expo-map.md`](../docs/expo-map.md) for the complete refresh, replay, and review workflow.
