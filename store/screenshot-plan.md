# Store screenshot plan

## Creative direction

Use the app’s warm off-white background, dark ink typography, and restrained emotion colors. Keep the UI large and readable. Do not add medical language, rankings, awards, testimonials, or feature claims that are not visible in the app.

The first three images should communicate the complete value loop:

1. notice a feeling;
2. reflect without pressure;
3. see personal patterns over time.

## English sequence

| Order | Headline | Supporting line | Screen |
|---|---|---|---|
| 1 | Name what you feel | One gesture captures feeling, nuance, and intensity. | Today / Pulse |
| 2 | Hold on to the moment | A few words are enough. Every reflection is optional. | Reflection |
| 3 | Notice your patterns | Insights use your complete recorded history. | Insights |
| 4 | Revisit every check-in | Edit or remove any moment whenever you choose. | History |
| 5 | Shape a guiding belief | Add a helpful perspective only when it fits. | Guiding belief |

## German sequence

| Reihenfolge | Überschrift | Zusatz | Ansicht |
|---|---|---|---|
| 1 | Benenne, was du fühlst | Eine Geste erfasst Gefühl, Nuance und Intensität. | Heute / Pulse |
| 2 | Bewahre den Moment | Ein paar Worte genügen. Jede Reflexion ist freiwillig. | Reflexion |
| 3 | Erkenne deine Muster | Einblicke nutzen deinen gesamten aufgezeichneten Verlauf. | Einblicke |
| 4 | Kehre zu Momenten zurück | Bearbeite oder lösche jeden Eintrag, wann du möchtest. | Verlauf |
| 5 | Finde einen hilfreichen Leitsatz | Ergänze eine neue Sichtweise nur, wenn sie für dich passt. | Leitsatz |

## Required source sets

### Apple

- iPhone 6.9-inch portrait: capture at an accepted native size; this package targets 1320 × 2868.
- iPad 13-inch portrait: required while `supportsTablet` remains enabled; target 2064 × 2752 or 2048 × 2732.
- The prepared phone sets contain 4–7 images per locale; the prepared iPad sets contain 2 per locale. App Store Connect accepts 1–10 screenshots per device size and localization.
- PNG or JPEG, RGB, flattened, with no alpha channel.

### Google Play

- Phone portrait: the prepared source size is 1212 × 2424, exactly 1:2.
- Produce 5 images per locale; upload at least 2.
- PNG or JPEG, no alpha, each side between 320 and 3840 pixels, with the long side no more than twice the short side.
- The prepared 1024 × 500 feature graphic is `assets/google-play-feature-graphic.png`.

## Capture rules

- Capture only from a current Release build.
- Use plausible sample content; never expose real personal reflections.
- Keep system status bars consistent within a set.
- Do not include development menus, test controls, simulator chrome, touch indicators, or floating debug buttons.
- Production Settings screenshots must omit internal channel and Git diagnostics.
- Verify the exact pixel dimensions and absence of alpha after export.
- Localize both the app UI and the headline layer; do not merely translate keyword strings.
