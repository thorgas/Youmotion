# Store launch readiness

This audit applies the useful launch-stage parts of `Eronred/aso-skills` to Youmotion: product context, metadata relevance, screenshot sequencing, localization, category positioning, onboarding, privacy, ratings, and launch operations. Public competitor listings were reviewed on July 24, 2026. Appeeky was not connected, so search volume, keyword difficulty, ranking, and download estimates remain unverified.

## Launch blockers

1. **Attach the production website domain.** Pages deployment `c53a8156` is live at `youmotion-app.pages.dev`; attach `youmotion.app`, wait for DNS/TLS, and verify every matching HTTPS URL before submission.
2. **Resolve Apple distribution ownership.** The previously observed Apple setup exposed only a free Personal Team associated with the existing organization. App Store distribution needs the intended owner’s paid Apple Developer Program membership and matching App Store Connect access.
3. **Complete the owner privacy attestation.** `privacy-data-safety.md` inventories the release behavior and supplies draft answers. The owner must confirm Expo service retention, the final production dependency set, and every declaration in App Store Connect and Play Console.
4. **Create and verify store records.** Confirm the bundle/package ID `com.youmotion.mobile`, app ownership, signing, agreements, tax/banking state where applicable, content rating, age rating, and review contacts.
5. **Run production-track preflight.** Test the signed iOS archive through TestFlight and the Android App Bundle through a Play internal-testing track before review. Confirm install, first launch, language switching, check-in, app restart, History, Insights, edit, and delete.
6. **Clear the product name.** A current App Store search surfaces a separate fitness product named “YouMotion Habit,” and `youmotion.com` is used by another service. Confirm App Store/Play name availability and obtain appropriate trademark or legal clearance before locking the launch title.

## Completed in this branch

- Inventoried the reused screenshot sets and added a provenance gate. The
  current assets are intentionally unapproved because they predate the signed
  build; History/Insights also lack the required 133-moment fixture.
- Added a reproducible, flattened 1024 × 500 Google Play feature graphic.
- Hid update-channel switching and Git/channel diagnostics from production Settings while retaining them in development and testing builds.
- Removed unused legacy storage and overlay-window permissions from the Android release manifest.
- Added release-privacy inventory, draft store declarations, and public competitor research.

## Decisions required before submission

- **Category:** start by evaluating Health & Fitness as the primary App Store category and Google Play category; evaluate Lifestyle as the alternative. This is provisional until competitor and keyword results are reviewed.
- **Medical declaration:** position Youmotion as self-reflection, not diagnosis or treatment. If Apple asks whether it is a regulated medical device, the product description indicates that it is not; the final legal/store answer remains the owner’s responsibility.
- **Tablet scope:** either deliver a polished iPad experience and screenshots or deliberately remove tablet support in a future app-config change. Do not leave the current declaration unsupported.
- **Crash diagnostics:** decide whether launch support requires a privacy-reviewed crash-reporting service. Do not silently add analytics or tracking to solve this.

## High-value improvements before launch

1. **Add measured keyword research.** Public English and German listing research is included. Connect a trustworthy ASO data source and record locale-specific search volume, difficulty, ranking, and relevance before calling the keywords optimized.
2. **Validate the first-three screenshot story.** Test “feeling → reflection → patterns” against a privacy-led alternative. Keep benefit headlines large and UI legible.
3. **Create a compact marketing context document.** Fix the audience, core problem, differentiators, tone, proof boundaries, and forbidden claims so future listing changes stay consistent.
4. **Add an in-app support route.** Settings should provide privacy, support, and feedback destinations used by the listings.
5. **Plan a contextual rating prompt.** Ask only after a completed positive-value moment, never during first launch or emotional input. This is a later product change, not part of the metadata branch.
6. **Prepare review operations.** Assign a person to monitor review messages, crashes, support mail, and early reviews daily during launch week; prepare factual reply templates.

## What is already strong

- The first-run experience explains Pulse with a concrete example and can be replayed from Settings.
- There is no forced sign-up before value.
- The product has a distinct interaction model rather than a generic mood list.
- English and German are supported in the app, and the store copy is localized rather than mechanically mirrored.
- The local-first model and ability to edit/delete entries are clear differentiators.
- The copy avoids clinical promises and compares no emotion as stronger, better, or worse than another.

## Recommended launch order

1. Deploy the prepared URLs, resolve account/privacy attestations, and confirm category decisions.
2. Review the prepared screenshots, feature graphic, privacy inventory, and localized copy.
3. Validate metadata with measured keyword data.
4. Upload to TestFlight and Play internal testing; run the production preflight.
5. Submit both listings with manual release enabled.
6. Review early conversion and qualitative feedback, then revise one variable at a time.
