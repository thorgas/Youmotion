# Youmotion Expo map

This directory is a committed `expo-map` result set for the iOS development build.

- Source routes: 18 Expo Router routes across a root Stack and tab navigator
- Device: iPhone 17 Pro simulator, iOS 26.1
- Captures: 20 screenshots, including focused-notification and per-reminder preview variants
- Runtime-state hints: 0 detected, 0 captured, 0 skipped
- Navigation model: Expo Router mirrors the root XState actor, so static JSX parsing correctly reports no navigation edges

`capture-status.json` is the source of truth for captures that need an active XState reflection context. Twenty flows cover route visits and the new reminder runtime variants. The focused-notification flow records its validated-notification prerequisite; context-dependent routes are deliberately retained as findings instead of being mislabeled as successful screens.

Open `map.html` for the visual contact sheet, or import the dated `.appmap` bundle into a compatible AppMap viewer.
