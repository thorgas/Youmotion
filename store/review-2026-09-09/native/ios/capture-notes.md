# iPhone 17 Pro Max native captures

- Date: 2026-09-09 (Europe/Berlin)
- App: `Youmotion` / `com.youmotion.mobile`
- Device: `iPhone 17 Pro Max` iOS simulator
- Session(s): `store-capture` (initial German run), `store-capture-ios` (English run after shared daemon session rebinding)
- Source state: committed synthetic archive fixture; observed populated Insights and History totals of 133 moments across 92 days.
- Capture command shape: `agent-device screenshot --session <session> --out <path> --pixel-density 3 --normalize-status-bar`
- Every listed image is an unaltered native simulator screenshot at 1320x2868 RGBA.

## Captured states

- `de-DE/iphone-6.9/pulse.png`: Today / Gefühlspuls, populated latest check-in
- `de-DE/iphone-6.9/insights-all-time.png`: Insights top composition, Gesamt selected, chart starts in frame
- `de-DE/iphone-6.9/insights-august-calendar.png`: Insights calendar, August 2026, populated calendar
- `de-DE/iphone-6.9/history-all-time.png`: History, Gesamt selected, populated rows
- `de-DE/iphone-6.9/settings-data.png`: Settings data card with export, restore, delete controls
- `en-US/iphone-6.9/pulse.png`: Today / Feeling Pulse, populated latest check-in
- `en-US/iphone-6.9/insights-all-time.png`: Insights top composition, All time selected, chart starts in frame
- `en-US/iphone-6.9/insights-august-calendar.png`: Insights calendar, August 2026, populated calendar
- `en-US/iphone-6.9/history-all-time.png`: History, All time selected, populated rows
- `en-US/iphone-6.9/settings-data.png`: Settings data card with export, restore, delete controls

The existing `de-DE/iphone-6.9/insights.png` was preserved. The Insights chart is taller than the iPhone viewport; native scroll snapping exposes either the top/chart start or the full August calendar, so no crop or compositing was applied.

## iPad 13-inch captures

- Date: 2026-09-09 (Europe/Berlin)
- Device/session: iPad simulator UDID `C08E91B5-135D-4C02-9F85-1D447BCBC109`, session `store-ipad`
- Source state was restored through the app's backup preview and Replace data action; the success toast was dismissed and verified absent before navigation.
- Capture command shape: `agent-device screenshot --session store-ipad --out <path> --pixel-density 2 --normalize-status-bar`
- Every iPad image is an unaltered native simulator screenshot at 2064x2752 RGBA.
- Captured both `en-US` and `de-DE`: pulse, All-time history, All-time Insights with August calendar, and Settings with YOUR DATA card plus export/restore/delete controls.
- iPad Insights composition cleanly shows the full emotional constellation chart; the separate August calendar capture shows the populated month and 133-moment summary.
