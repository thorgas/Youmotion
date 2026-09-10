# Store upload blueprint for another app

Copy this document into the new app and complete its configuration sheet before
running commands. This is an end-to-end **listing upload** procedure: metadata,
graphics, screenshots, optional previews, persistence and remote verification.
It is not a claim that an app is review-ready merely because its uploads pass.
Binary distribution and review/publication are separate, explicitly gated steps.

CLI flag examples were checked on 9 September 2026. Recheck installed `--help`
and current store specifications before each release. Commands below are
individual operator steps, not a script to paste and run wholesale.

## 1. Configuration and ownership

Complete a release worksheet with:

| Setting | Value to supply for this app |
| --- | --- |
| Repository and source revision | Absolute root and exact commit |
| Apple account/team, app ID, bundle ID | Verify authenticated account and app identity |
| Apple editable version and version resource ID | Resolve current IDs; never copy from another app |
| Google account and package | Verify service-account access to this specific app |
| Locales and default locale | Explicit list; identify intentional text/graphic fallback |
| Supported platforms/device families | Phone, tablet and other form factors actually supported |
| Binary identity | Version/build number, artifact hash and distribution destination |
| Metadata owner | One canonical writer per field; avoid competing EAS/ASC writers |
| Capture recipe | Dedicated devices, synthetic fixture, scenes, locale setup and assertions |
| Review authority | Draft only, or separately authorized review for named target |
| Release authority | Manual/automatic release and approved countries/pricing |

Preserve the existing build/distribution system. For Expo projects keep EAS for
builds, binary submission and any metadata it already owns; add ASC/gplay only
for gaps. A non-Expo project can retain its existing Apple metadata writer or
use ASC after checking `asc metadata --help` and its current schema. Never copy
another app's EAS project ID, signing configuration, account keys or legal copy.

Create the app records and editable store version if missing. Complete account
access/agreement prerequisites with the owner. Authenticate using Keychain or
private credential files outside Git; use least privilege. Keep auth exports,
cookies, tokens, service-account JSON and private review contacts out of public
repositories. Record CLI versions, not secrets, in the release evidence.

## 2. Prepare a complete inventory

For **every locale × supported device family**, record each required item as
ready, missing, intentionally inherited or not applicable (with a reason).
Do not assume a visible empty slot is always mandatory, or that a validator
checks all mandatory slots. Consult the actual Console and current specs.

| Destination | Inventory and upload route |
| --- | --- |
| Apple app information | Localized name/subtitle; category, content rights and other app-level fields through canonical metadata writer or Console |
| Apple version information | Description, keywords, support/marketing URLs, promotional text and release notes where applicable |
| Apple screenshots | Native captures for each required display family, uploaded to its correct screenshot set for each locale |
| Apple app icon | Primary icon comes from the app build/asset catalog; do not upload the Play icon as an Apple screenshot |
| Apple App Previews | Optional videos; up to three per locale/display target; omit deliberately or follow current preview specs and upload through Media Manager |
| Google localized listing | `title.txt`, `short_description.txt`, `full_description.txt`, optional `video.txt` |
| Google app icon | Standalone 512×512 32-bit PNG with alpha, up to 1024 KB; not an adaptive foreground layer |
| Google feature graphic | 1024×500 JPEG or 24-bit PNG without alpha; check Console size limit; localize text or document shared language |
| Google phone screenshots | `phoneScreenshots`; ordered native Android captures |
| Google tablet screenshots | `sevenInchScreenshots`, `tenInchScreenshots`; genuine Android tablet rendering, not resized phone/iPad images |
| Other supported form factors | Check TV/Wear/Chromebook/XR/other current requirements individually; use supported API image types or Console when absent from the CLI |
| Google video | Optional eligible YouTube URL; not an Apple preview file |
| Both stores: non-listing requirements | Privacy URL, support/contact details, review access, declarations, ratings, countries, pricing, agreements and build selection |

Useful source specifications:
[Apple screenshots](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/),
[Apple previews](https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications/),
[Google listing assets](https://support.google.com/googleplay/android-developer/answer/9866151).
Store rules take precedence over a CLI's generic accepted-file-format help.

Google's screenshot format guidance specifies JPEG or 24-bit PNG without alpha.
Check form-factor-specific aspect ratios and counts before capturing; native
tablet resolution alone does not establish upload eligibility. Where Console
supports graphic alt text, include a concise localized description.

### Portable input layout

```text
release-inputs/
  inventory.md                    # expected counts/order, hashes and approvals
  apple/
    iphone/LOCALE/01-scene.png ... # separate display-family roots
    ipad/LOCALE/01-scene.png ...
    previews/LOCALE/               # only when producing optional videos
  google/
    LOCALE/
      title.txt
      short_description.txt
      full_description.txt
      video.txt                   # optional; preserve existing remote value
      images/
        icon.png
        featureGraphic.png
        phoneScreenshots/01-scene.png ...
        sevenInchScreenshots/01-scene.png ...
        tenInchScreenshots/01-scene.png ...
```

Replace `LOCALE` with each actual code, such as `en-US`. Add other image types
only if applicable and supported. Keep native inputs separate from marketing
compositions. Copy only approved outputs into a clean staging directory—never
bulk-upload a directory containing diagnostics, stale variants or private data.

Capture recipe contract: build/install the intended artifact, restore only this
app's synthetic fixture, assert meaningful data at the consumer screen, set
locale, navigate each scene, wait for settled UI, capture at native resolution,
then inspect and optionally frame. Store fixture hash, build hash, source commit,
device model/geometry, locale, tool versions, scene order and PNG hashes.
Replace all app-specific selectors and fixture expectations when reusing this.

## 3. Validate and snapshot before remote writes

- Check text lengths, localization, URLs, required disclaimers and image specs.
- Visually inspect **all** locales/families for populated data, current UI,
  clipped labels, wrong-language captures and sensitive information.
- Export/read existing remote metadata and image IDs/order into a private
  release-evidence folder. Do not overwrite local canonical inputs with exports.
- Agree append versus replacement. Retain a recoverable copy before authorized
  replacements; checksum skipping alone will not remove outdated remote assets.
- Ensure only one operator owns a Google edit. Console writes and new edits can
  invalidate it. Even export helpers may create a temporary edit when no ID is
  supplied—check help and do not run them alongside someone else's active edit.

## 4. Upload Apple listing

In an EAS-owned metadata project, validate the new app's `store.config.json`
against its schema and target, then run:

```sh
eas metadata:lint
eas metadata:push
```

Do not assume that command fills app privacy, ratings, owner contacts, pricing
or other unsupported fields. Reconcile every field in the inventory through
the canonical writer or Console. For non-EAS metadata, use the chosen writer's
validate/preview/apply process; do not run EAS commands without configuring it.

Set these task variables from the worksheet (not from this repository):

```sh
UPLOAD_APPLE_ID='REPLACE_WITH_APP_ID'
UPLOAD_APPLE_VERSION='REPLACE_WITH_VERSION'
UPLOAD_APPLE_VERSION_ID='REPLACE_WITH_VERSION_RESOURCE_ID'
UPLOAD_APPLE_DEVICE_TYPE='REPLACE_WITH_ACCEPTED_ASC_DISPLAY_TYPE'
UPLOAD_APPLE_SCREENSHOT_ROOT='/absolute/path/release-inputs/apple/iphone'
UPLOAD_LOCALE='en-US'
```

Resolve app-info and version-localization records separately. A version
localization resource ID is not the locale code:

```sh
asc localizations list --app "$UPLOAD_APPLE_ID" --type app-info --paginate
asc localizations list --version "$UPLOAD_APPLE_VERSION_ID" --paginate
asc screenshots upload --app "$UPLOAD_APPLE_ID" --version "$UPLOAD_APPLE_VERSION" \
  --path "$UPLOAD_APPLE_SCREENSHOT_ROOT" --device-type "$UPLOAD_APPLE_DEVICE_TYPE" \
  --skip-existing --dry-run
```

Inspect the preview; repeat the upload without `--dry-run`. Repeat for each
required display family with its own root and accepted display type. Do not
hard-code Youmotion's device alias or dimensions into another app. Inspect
returned canonical types. If existing screenshots need replacement, preview
the exact deletions and obtain scoped authorization before using replacement.

```sh
asc screenshots list --app "$UPLOAD_APPLE_ID" --version "$UPLOAD_APPLE_VERSION" \
  --locale "$UPLOAD_LOCALE"
```

Read back every locale: expected counts/order, correct device set and all upload
states `COMPLETE`. Reopen metadata and optional previews in App Store Connect.
Verify correct build selection separately and record unchanged review state.
Upload success alone is not a review submission.

### Private App Review contact information (CLI-supported)

App Review contacts and sign-in requirements are CLI-editable, not Console-only.
Fetch the detail ID for the exact version first:

```sh
asc review details-for-version --version-id "$APPLE_VERSION_ID"
asc review details-update --id "$REVIEW_DETAIL_ID" \
  --contact-first-name "$REVIEW_FIRST_NAME" \
  --contact-last-name "$REVIEW_LAST_NAME" \
  --contact-phone "$REVIEW_PHONE" \
  --contact-email "$REVIEW_EMAIL" \
  --demo-account-required=false
```

Obtain explicit owner approval for the values and supply them privately at
runtime. Never commit personal contact values or raw response output. If no
record exists, inspect `asc review details-create --help` and create it for the
version. The no-sign-in example applies only to apps that work without an account.
Preserve review notes and read back saved fields with sensitive values redacted
in evidence. These commands do not submit the app for review. EAS can alternatively
manage these fields through private dynamic configuration; choose one writer.

## 5. Upload Google listing using one explicit edit

Text, icon, feature graphic and supported screenshots are API-capable. Use the
CLI first when its commit behavior is compatible with the authorized outcome.

```sh
UPLOAD_PLAY_PACKAGE='com.example.replace_me'
UPLOAD_GOOGLE_ROOT='/absolute/path/release-inputs/google'
UPLOAD_LOCALE='en-US'
gplay validate listing --dir "$UPLOAD_GOOGLE_ROOT" --locale "$UPLOAD_LOCALE"
gplay validate screenshots --dir "$UPLOAD_GOOGLE_ROOT"
gplay edits create --package "$UPLOAD_PLAY_PACKAGE"
```

Repeat text validation per locale. Record the returned edit ID and expiry and
set `UPLOAD_PLAY_EDIT_ID` explicitly. Do not auto-create a new edit on retry.

```sh
UPLOAD_PLAY_EDIT_ID='REPLACE_WITH_RETURNED_EDIT_ID'
gplay listings list --package "$UPLOAD_PLAY_PACKAGE" --edit "$UPLOAD_PLAY_EDIT_ID"
gplay sync import-listings --package "$UPLOAD_PLAY_PACKAGE" --edit "$UPLOAD_PLAY_EDIT_ID" \
  --dir "$UPLOAD_GOOGLE_ROOT" --dry-run
gplay sync import-images --package "$UPLOAD_PLAY_PACKAGE" --edit "$UPLOAD_PLAY_EDIT_ID" \
  --dir "$UPLOAD_GOOGLE_ROOT" --dry-run
```

Inspect both previews; repeat without `--dry-run` only for approved changes.
Full listing updates can clear omitted fields, including video. Preserve their
values or use the current partial-update command. Bulk image imports use the
staged type directories; singleton graphics can also be uploaded explicitly:

```sh
gplay images upload --package "$UPLOAD_PLAY_PACKAGE" --edit "$UPLOAD_PLAY_EDIT_ID" \
  --locale "$UPLOAD_LOCALE" --type icon \
  --file "$UPLOAD_GOOGLE_ROOT/$UPLOAD_LOCALE/images/icon.png"
gplay images upload --package "$UPLOAD_PLAY_PACKAGE" --edit "$UPLOAD_PLAY_EDIT_ID" \
  --locale "$UPLOAD_LOCALE" --type featureGraphic \
  --file "$UPLOAD_GOOGLE_ROOT/$UPLOAD_LOCALE/images/featureGraphic.png"
```

Use explicit singleton uploads **instead of**, not blindly in addition to,
successful bulk import. Read back each locale and each expected image type:

```sh
gplay listings get --package "$UPLOAD_PLAY_PACKAGE" --edit "$UPLOAD_PLAY_EDIT_ID" \
  --locale "$UPLOAD_LOCALE"
gplay images list --package "$UPLOAD_PLAY_PACKAGE" --edit "$UPLOAD_PLAY_EDIT_ID" \
  --locale "$UPLOAD_LOCALE" --type phoneScreenshots
gplay edits validate --package "$UPLOAD_PLAY_PACKAGE" --edit "$UPLOAD_PLAY_EDIT_ID"
```

Repeat `images list` for icon, featureGraphic and all applicable tablet/other
types. Validate local file bytes/specs separately: an empty successful CLI
validation report does not prove that singleton graphics were checked.

### Persistence gate—not an automatic final command

For draft-only authority, a guarded commit can be attempted after validation:

```sh
gplay edits commit --package "$UPLOAD_PLAY_PACKAGE" --edit "$UPLOAD_PLAY_EDIT_ID" \
  --changes-not-sent-for-review
```

This flag is **not a universal Save as draft equivalent**. Google documents it
in a rejection-specific context. On rejection, stop and use the Console route;
never remove the flag automatically. An unguarded commit may send changes for
review. Other commit options such as ERROR_IF_IN_REVIEW are not a no-review
guarantee. See [Google's commit semantics](https://developers.google.com/android-publisher/api-ref/rest/v3/edits/commit).

After a successful commit, verify persisted results in Console, not only within
the old edit. If sending for review is separately authorized, inspect the entire
pending change set and named target before a review-capable commit. A private
testing track does not isolate ordinary shared store-listing metadata.

## 6. Console fallback: complete all assets, save only

1. Open the correct app's default listing. Select/add each locale while
   preserving the default language and existing translations.
2. Fill title, short/full descriptions and optional video from canonical files.
3. For **each inventory item**—icon, feature graphic, phone, both applicable
   tablet families and other supported types—open its own Add assets panel.
4. Upload the approved locale/type files. Wait for processing, select them,
   click Add to attach them, and close the panel. Asset-library upload alone
   is not listing attachment. Verify order by thumbnails; deduplication may
   replace meaningful filenames with generic labels.
5. Use **Save as draft** where offered. Reopen the locale and verify all fields,
   counts, order and inherited graphics. Check the save acknowledgement and
   Publishing overview. Do not click Send for review during draft preparation.
6. If the UI provides no verified draft-only route, stop and report the exact
   remaining authority or prerequisite; do not equate Save/Publish/Submit.

For browser automation, enable the extension's file-URL permission through the
owner. Use supported file-chooser upload with absolute paths. Catch chooser
timeouts. After uploads complete, the Upload button may be replaced by Add;
inspect fresh UI state before starting the next upload. Never bypass browser
permissions with hidden requests. Manual upload follows the same attachment
and save checks, without extension prerequisites.

## 7. Recovery and release gates

On timeout: inspect per-file output and remote assets before retrying; exit zero
can coexist with failed uploads. Configure bounded timeouts/retries and retain
successful IDs. On 403: inspect exact account/app permission coverage; do not
broaden permissions silently. On edit expiry/invalidation: reconcile saved
Console state before creating a replacement edit. Never recommit an edit that
predates later UI changes. Keep unrelated changes intact during rollback.

Before review, separately reconcile agreements, privacy and Data Safety,
ratings/target audience, ads, health/other declarations, content rights,
encryption/export compliance, review contacts/access, pricing/availability,
testing gates and the selected binary. Derive answers from **this app's** code,
SDKs and data flows; Youmotion's answers are not a reusable legal template.

Binary uploads remain with the existing pipeline. Record processing/tester
availability separately from upload completion. Review submission needs explicit
authority; publication needs its own confirmed policy. This document deliberately
does not include an unattended final-submit command.

## 8. Completion evidence template

Create a dated report with one row per item, locale and device type:

| Item / locale / device | Local path + SHA-256 | Remote ID + count/order | Verified state | Remaining action |
| --- | --- | --- | --- | --- |
| Replace with actual item | Exact input | Exact result | Local / staged edit / saved draft / in review / published | Named owner or none |

Include source/build/fixture identity, tool versions, validator results, visual
review, remote save/commit acknowledgement, unchanged or authorized review state,
and retry/fallback details. Do not mark “full upload complete” until **every
applicable row** is durably saved and verified; optional omissions require an
explicit N/A reason. End with next steps and user-only blockers (or “none”).

For reference—not values to copy—see the
[Youmotion runbook](UPLOAD-RUNBOOK.md) and its dated handoff link.
