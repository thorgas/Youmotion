# Youmotion store launch package

This directory contains launch-ready copy, verified Apple and Google Play screenshot source files, a reproducible Google Play feature graphic, privacy and ASO audits, and the remaining submission checklist for both stores.

## Prepared locales

- English (United States): `en-US`
- German (Germany): `de-DE`

The copy is intentionally factual. It does not claim clinical benefits, diagnosis, treatment, rankings, awards, or outcomes that the app cannot substantiate.

## Files

- `metadata/apple/`: App Store name, subtitle, promotional text, keywords, description, release notes, and review notes.
- `metadata/google-play/`: Play title, short description, full description, and release notes.
- `automation/`: reversible draft-only EAS Metadata, `asc`, and `gplay` workflows.
- `../store.config.json`: Apple metadata source consumed by EAS Metadata.
- `app-marketing-context.md`: audience, positioning, differentiators, proof boundaries, and launch goals.
- `screenshot-plan.md`: capture order, headlines, device requirements, and upload mapping.
- `launch-readiness.md`: launch blockers and recommended improvements.
- `privacy-data-safety.md`: release-binary privacy inventory and draft store declarations.
- `../website/privacy/app/`: publication-formatted app privacy policy.
- `../website/privacy/website/`: separate Cloudflare website privacy policy.
- `../website/support/`: publication-formatted support page and FAQ.
- `aso-research.md`: dated public-listing research and the limits of the available keyword evidence.
- `screenshots/`: full-resolution, unframed Release-build Apple and Google Play screenshots.
- `assets/google-play-feature-graphic.png`: 1024 × 500, flattened Play feature graphic.
- `../scripts/render-play-feature-graphic.swift`: deterministic feature-graphic renderer.

## Values still required from the owner

The branch prepares the following stable URLs; deploy them before submission:

- `https://youmotion.app/privacy/app/`
- `https://youmotion.app/de/privacy/app/`
- `https://youmotion.app/support/`
- `https://youmotion.app/de/support/`

Owner-only values or attestations still required:

- App Store copyright owner
- App Review contact details
- Final primary and secondary App Store categories
- Final Google Play category and tags
- Owner attestation for the draft App Privacy and Play Data Safety answers

The marketing URL is optional. No placeholder URL has been invented because these files are intended to be safe handoff material, not silently publish invalid metadata.
