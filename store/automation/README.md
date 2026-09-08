# Store automation

Expo remains the owner of builds and binary submission. The complementary CLIs
prepare and validate store data that EAS does not currently cover. None of the
commands in this document submit an app for review.

## Installed tools

- EAS CLI: builds, TestFlight/App Store Connect binary submission, and Google
  Play binary submission through the profiles in `eas.json`.
- EAS Metadata: Apple listing metadata from the root `store.config.json`.
- `asc` 5.1.0: read-only App Store Connect readiness and submission-health
  diagnostics, plus screenshot operations after owner review.
- `gplay` 0.10.0: Google Play listing metadata, screenshots, offline preflight,
  app-content inventory checks, and Data Safety transport after owner approval.

The global `asc` and `gplay` skill packs are pinned to reviewed commits by their
installers. `asc` telemetry is disabled. Set `GPLAY_NO_UPDATE=1` and
`GPLAY_NO_STAR_PROMPT=1` when running `gplay` in automation.

## Security boundary

Never commit an App Store Connect `.p8`, a Google service-account JSON file,
Apple credentials, Google credentials, cookies, tokens, or generated auth
profiles. The repository ignores common private-key extensions, but credentials
must still live outside the repository. Use least-privilege store roles.

Authentication is intentionally a local owner step:

```sh
asc auth login --name Youmotion --key-id KEY_ID --issuer-id ISSUER_ID \
  --private-key /absolute/private/path/AuthKey_KEY_ID.p8

gplay auth login --profile youmotion \
  --service-account /absolute/private/path/play-service-account.json
```

## Apple: EAS first, `asc` only for gaps

Validate and push the Apple metadata with EAS Metadata:

```sh
eas metadata:lint
eas metadata:push
```

`store.config.json` deliberately omits the copyright owner, App Review contact,
age-rating answers, App Privacy answers, content-rights declaration, pricing,
and availability. Those values require owner confirmation or are not supported
by EAS Metadata. Add the confirmed owner values before pushing if App Store
Connect requires the complete object.

After EAS has uploaded the binary and metadata, use `asc` read-only checks:

```sh
asc validate --app 6807357236 --version 1.0.3 --platform IOS \
  --check-urls --output table
asc review doctor --app 6807357236 --version 1.0.3 --platform IOS \
  --output table
```

Do not run `asc publish`, `asc review submit`, or any command containing
`--submit` or `--confirm` as part of preparation.

## Google Play metadata

The canonical CLI-ready listing files are under `google-play/metadata/`.
Validate them offline:

```sh
GPLAY_NO_UPDATE=1 GPLAY_NO_STAR_PROMPT=1 gplay metadata validate \
  --dir store/automation/google-play/metadata --output table
```

After authentication, preview without remote mutation:

```sh
GPLAY_NO_UPDATE=1 GPLAY_NO_STAR_PROMPT=1 gplay metadata push \
  --package com.youmotion.mobile \
  --dir store/automation/google-play/metadata \
  --dry-run --output table
```

A real metadata push is manually editable later, but still requires a separate
owner-authorized command with `--confirm`. Do not mix an active Play Console
draft with an API edit; committing either invalidates the other.

## Google Play screenshots

The reviewed source assets remain in `store/screenshots/google-play/` and the
framed upload candidates remain in `artifacts/release-store/google-play/`.
Do not upload screenshots until `store/screenshots/provenance.json` and the
screenshot-quality gate confirm that every locale is current. Stage only the
approved set into the layout shown by `gplay images plan --help`, then run the
read-only plan before any sync.

## Policy declarations

`google-play/app-content.draft.json` records only established facts and marks
owner attestations as incomplete. It can be checked offline:

```sh
GPLAY_NO_UPDATE=1 GPLAY_NO_STAR_PROMPT=1 gplay validate app-content \
  --package com.youmotion.mobile \
  --json @store/automation/google-play/app-content.draft.json \
  --output table
```

The installed `gplay` version accepts Data Safety only as Google's encoded
`SafetyLabels` payload. Do not fabricate that payload. Export the current form
from Play Console, reconcile it with `store/privacy-data-safety.md`, obtain the
owner's attestation, and only then use `gplay data-safety update`.

Account agreements, identity verification, content rating, target audience,
ads/app-access attestations, health declarations, testing eligibility, and the
final review submission remain owner-controlled Play Console steps.

The app category and store tags are also manual Play Console fields because
Google's official Publishing API does not expose them. For launch, use
**Health & Fitness** and choose the closest available tags to **Mood tracker**,
**Journal**, **Mindfulness**, **Mental wellbeing**, and **Stress management**.
Only select tags that the Console currently offers; its taxonomy can vary by
category and locale. This positioning is comparable to How We Feel, but that
app's private Console tag selections cannot be read from its public listing.
