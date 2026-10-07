# Reproducible metadata and screenshot uploads

This is the **Youmotion-specific example**. For another app, use the
[full store upload blueprint](STORE-UPLOAD-BLUEPRINT.md), then supply that app's
IDs, locales, metadata writer, capture recipe and complete asset inventory.

Run from the repository root. This covers listing preparation, not binary builds
or release submission. Expo/EAS continues to own builds, binary distribution and
Apple metadata. ASC and gplay are complementary. Commands were checked against
installed CLI help on 9 September 2026; recheck leaf `--help` after upgrades.

For new store binaries, use the verified
[store release workflow](../../docs/release/store-release-workflow.md):
EAS-managed binary uploads first, then CLI or Console completion according to
the user's draft/review authority. On 2 October 2026 the local gplay account
successfully validated and committed production build 18 with localized notes.
Recheck access rather than treating the historical 403 as a permanent blocker.
CLI service-account requests do not need an unlocked Mac.

## 1. Freeze inputs and scope

- Confirm app IDs, editable version, locales, intended screenshot types and owner
  permission. Uploading, saving a draft, sending for review and publishing are
  distinct outcomes. Record each separately.
- Apple app: `6807357236`; Google package: `com.youmotion.mobile`.
- Current Apple version: `1.0.3`. Resolve the version again for the next release;
  never reuse an old localization ID or temporary Google edit ID blindly.
- Apple text source: `store.config.json`. Google text source:
  `store/automation/google-play/metadata/{de-DE,en-US}/`, containing `title.txt`,
  `short_description.txt` and `full_description.txt`.
- Current selected phone PNGs:
  `store/review-2026-09-09/framed-corrected/{ios,android}/{de-DE,en-US}/`.
  Order: `01-today`, `02-history`, `03-insights`, `04-settings`,
  `05-insights-calendar` (all `.png`).
- Current native iPad PNGs:
  `store/review-2026-09-09/native/ios/{de-DE,en-US}/ipad-13/`.
- Review every locale visually: populated History/Insights, current Settings,
  correct language and platform, synthetic data only. Capture procedure:
  [store-capture README](../../scripts/store-capture/README.md).
  Record source commit, fixture, dimensions and checksums for each new run.
  The dated upload set does not certify older provenance files or future builds.
- Keep keys, service-account JSON, cookies and auth logs outside Git. Use the
  existing authenticated profiles; do not print credentials for diagnostics.

## 2. Apple text and screenshots

Validate and push only reviewed Apple text through EAS:

```sh
eas metadata:lint
eas metadata:push
```

Inspect the target version in App Store Connect before pushing; do not accept
unrelated owner attestations or submit for review. Read back both localized
titles, subtitles and descriptions after the push.

For current iPhone images, preview first, then repeat without `--dry-run`:

```sh
asc screenshots upload --app 6807357236 --version 1.0.3 \
  --path store/review-2026-09-09/framed-corrected/ios \
  --device-type IPHONE_69 --skip-existing --dry-run
```

The current 1320×2868 images were accepted; this CLI canonicalizes `IPHONE_69`
to `APP_IPHONE_67`. Record the returned type rather than treating the alias as
proof of a different screen size. `--skip-existing` compares checksums; it does
not remove obsolete remote images. Inspect existing sets before rerunning.
Replacing/removing old images requires explicit scoped authorization.

Stage native iPad files into `goldie/out/store-upload/ipad/LOCALE/` with these
names, using ordinary file copies (do not resize phone images into iPad assets):

| Native file | Staged filename |
| --- | --- |
| `pulse.png` | `01-pulse.png` |
| `history-all-time.png` | `02-history.png` |
| `insights-all-time.png` | `03-insights.png` |
| `settings-data.png` | `04-settings.png` |
| `insights-august-calendar.png` | `05-calendar.png` |

```sh
asc screenshots upload --app 6807357236 --version 1.0.3 \
  --path goldie/out/store-upload/ipad \
  --device-type IPAD_PRO_3GEN_129 --skip-existing --dry-run
```

Repeat without `--dry-run` only after preview. Current iPad images are 2064×2752.
Read back both locales:

```sh
asc screenshots list --app 6807357236 --version 1.0.3 --locale de-DE
asc screenshots list --app 6807357236 --version 1.0.3 --locale en-US
```

Require five phone and five iPad assets per locale, correct ordering and all
uploads `COMPLETE`. Confirm the version remains `PREPARE_FOR_SUBMISSION`.
Do not run review/publish commands as part of upload preparation.
The `asc review details-*` contact-information commands are an exception: they
save editable metadata, not a review submission. See the blueprint's private
App Review contact section. Youmotion needs no sign-in; supply owner-approved
contact values privately and never commit them to the repository.

## 3. Google: preferred draft-only Console route for this launch

The API supports descriptions, icons, feature graphics and screenshots; these
are not UI-only fields. Our no-review commit was rejected for this app's current
state. Google documents `changesNotSentForReview` in a rejection-specific
context, not as a universal equivalent of Console Save as draft:
[edits.commit reference](https://developers.google.com/android-publisher/api-ref/rest/v3/edits/commit).
This records a verified fallback, not proof that every CLI-only solution is
impossible. The verified alternative is
Play Console → Youmotion → Grow users → Store presence → Store listings →
default listing.

1. Manage translations → Select languages → English (United States), `en-US`
   → Apply. Preserve existing languages. For an existing locale, select it.
2. Paste its three canonical text files into App name, Short description and
   Full description. Do not paste German text into the English tab.
3. Under **Phone screenshots**, select Add assets → Upload. Select that locale's
   five corrected Android PNGs, not iPhone images. Check thumbnails and order;
   finish the asset-panel selection if prompted. Do not assume uploading to the
   shared asset library has attached an image to the listing.
4. Click **Save as draft**. The verified success message is: “Change saved.
   Send for review in Publishing overview.” Do not click Send app for review.
5. Reopen the saved locale and verify text, image count, order and thumbnails.
   Repeat for German. Inspect Publishing overview to confirm no review started.

For the current shared graphics, use `assets/images/app-icon-android.png`
(512×512) in **App icon**, and `store/assets/google-play-feature-graphic.png`
(1024×500) in **Feature graphic**, each through Add assets → Upload → wait for
processing → Add → close panel → Save as draft. Both were accepted and the
English locale was verified to inherit them from the default listing. This
feature graphic contains English copy; do not call it localized German artwork.
Never upload adaptive icon foreground/background layers as the standalone icon.

Browser automation prerequisite: Chrome → `chrome://extensions` → ChatGPT
extension → Details → **Allow access to file URLs**. Without it, file chooser
uploads fail with `Not allowed`; ask the owner to enable it, do not keep retrying.
Use the supported browser file-chooser API with absolute paths. Do not use a
hidden browser request or read credentials to bypass the upload restriction.

The English text and English phone screenshot draft were saved successfully on
9 September. File upload worked after the owner updated the extension. Wait for
processing before the next action: selected assets replace the Upload button
with **Add**. Attach them with Add before starting another upload. Catch file
chooser timeouts instead of leaving rejected promises running.

Google can deduplicate files against earlier API uploads and label them simply
`image`, even when uploaded with locale-prefixed filenames. Do not infer order
or language from those names. Inspect thumbnails, drag to reorder if needed,
then save. The German batch arrived out of order and required reordering to
Today, History, Insights, Settings, Calendar.

## 4. Google API alternative (explicit edit, no automatic review)

Use only when not concurrently editing in Console. Creating another edit or
saving Console changes can invalidate an active edit. Record its ID and expiry;
an upload inside an uncommitted edit is temporary, not a saved listing.

Stage copies of the selected Android PNGs as:

```text
goldie/out/store-upload/android/
  de-DE/images/phoneScreenshots/01-today.png ... 05-insights-calendar.png
  en-US/images/phoneScreenshots/01-today.png ... 05-insights-calendar.png
```

Keep icons, feature graphics and native Android tablet images in their own
types if needed; phone uploads do not fulfill every listing asset requirement.
Do not substitute iPad captures for Android tablets.

```sh
gplay validate listing --dir store/automation/google-play/metadata --locale de-DE
gplay validate listing --dir store/automation/google-play/metadata --locale en-US
gplay validate screenshots --dir goldie/out/store-upload/android
gplay edits create --package com.youmotion.mobile
```

Set `PLAY_EDIT_ID` to the returned ID manually. Inspect existing listings/images
first. Then preview the canonical text import:

```sh
gplay listings list --package com.youmotion.mobile --edit "$PLAY_EDIT_ID"
gplay sync import-listings --package com.youmotion.mobile --edit "$PLAY_EDIT_ID" \
  --dir store/automation/google-play/metadata --dry-run
```

Remove `--dry-run` only after reviewing the preview. Full listing updates can
clear omitted fields (including video); preserve existing values or use a
verified `listings patch` command for partial changes.

```sh
GPLAY_TIMEOUT=20s GPLAY_UPLOAD_TIMEOUT=30s GPLAY_MAX_RETRIES=0 \
gplay sync import-images --package com.youmotion.mobile --edit "$PLAY_EDIT_ID" \
  --dir goldie/out/store-upload/android --locale en-US
gplay images list --package com.youmotion.mobile --edit "$PLAY_EDIT_ID" \
  --locale en-US --type phoneScreenshots
```

Repeat for `de-DE`. Before retrying an interrupted upload, list the images to
avoid duplicates. The CLI can exit zero while printing timeouts and “Uploaded
0 images”: check per-file results and remote contents, not exit status alone.
Use bounded retries and report progress; do not leave an unbounded upload running.

Only after successful readback and validation:

```sh
gplay edits validate --package com.youmotion.mobile --edit "$PLAY_EDIT_ID"
gplay edits commit --package com.youmotion.mobile --edit "$PLAY_EDIT_ID" \
  --changes-not-sent-for-review
```

Stop on validation failure. Observed on 9 September: validation returned 403;
the separately attempted safe commit returned 400 saying changes are sent for
review automatically and the parameter must not be set. **Do not remove the
flag as an automatic retry.** For draft-only authority, use the Console draft
route above. With explicit review authority, follow the current store release
workflow, verify managed publishing and pending changes, then commit without
the rejected flag. The successful build 18 submission on 2 October confirms
that this 400 does not establish a credential failure. Do not commit
an old API edit after saving through the UI.

The owner permits a private testing-track review only as a fallback if draft
preparation cannot work. That does not authorize production submission. A
testing track does not itself isolate ordinary shared store-listing changes;
inspect the complete pending change set and target track before any review.

## 5. Android tablet capture prerequisite

Do not fill tablet slots with phone or iPad images. No Android tablet captures
existed in the 9 September phone upload set. Create a dedicated tablet AVD and
capture the actual Android app with the synthetic fixture before uploading.

On this Mac, PATH's `/opt/homebrew/bin/avdmanager` belongs to a different SDK
root and returned “Package path is not valid” / valid image paths `null` despite
installed images. The SDK-local executable
`$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager` correctly discovers installed
targets when `ANDROID_HOME` points to the active Android SDK. Resolve the executable and SDK root
before retrying; do not redownload images or overwrite existing phone AVDs as
a first response to that error.

## 6. Handoff evidence

Record the input commit/paths, CLI versions, app/version/locale IDs, counts,
image types, upload states, save/commit result and review state in a dated
`docs/handoffs/` record. Distinguish temporary API uploads from saved Console
drafts and public assets. List remaining blockers explicitly. Never claim all
formats are complete based only on phone screenshots or a successful command.
