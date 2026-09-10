# Store screenshot upload — 9 September 2026

Scope: upload screenshots and add the prepared English Play listing. Do not
submit either app for review. Source assets are committed review candidates,
not the older `store/screenshots/` inventory.

## Apple — complete

App `6807357236`, version `1.0.3`, version resource
`e809b30d-7ec4-48c7-9921-f7509ad048bc`.

- Five iPhone images per locale, `de-DE` and `en-US`, from
  `store/review-2026-09-09/framed-corrected/ios/`.
- Five native iPad images per locale from
  `store/review-2026-09-09/native/ios/LOCALE/ipad-13/`, ordered Pulse, History,
  Insights, Settings, Calendar.
- All 20 assets reported COMPLETE. The CLI maps `IPHONE_69` to Apple's
  `APP_IPHONE_67`; these are the validated 1320×2868 images. iPad uses
  `APP_IPAD_PRO_3GEN_129`, 2064×2752.
- Version remained PREPARE_FOR_SUBMISSION. No submission action was called.
- Upload used `asc screenshots upload` with explicit app/version, device type,
  locale directories and `--skip-existing`; no screenshots were deleted.

## Google Play — Console draft fallback

The browser fallback successfully added English (United States), filled the
three committed text fields, and used **Save as draft**. Console confirmed:
"Change saved. Send for review in Publishing overview." The English text is
therefore saved independently of the temporary API edit below. No review was
requested. The user subsequently allowed a private testing-track review as a
fallback, but it was not needed for saving the text and was not performed.

English image uploads through the CLI timed out (bounded retry: Uploaded 0
images). Browser upload initially failed with `Not allowed`; after the owner
updated the extension, file uploads worked. Five English phone screenshots
were attached in numbered order and saved with a confirmed **Draft saved**
message. Five German images were uploaded/deduplicated, attached and visually
reordered to Today, History, Insights, Settings, Calendar; Console confirmed
the change was saved and still needs sending for review in Publishing overview.
Follow-up: the prepared German title, short description and full description
were saved as a draft and validated (28/73/1393 characters respectively).
`assets/images/app-icon-android.png` (512×512) and
`store/assets/google-play-feature-graphic.png` (1024×500) were uploaded, attached,
and saved as draft. The English locale visibly inherits both graphics. The
prepared feature graphic has English copy; it is shared, not a German-localized
graphic. Android tablet slots remain empty pending genuine native captures.

Repeatable instructions: `store/automation/UPLOAD-RUNBOOK.md`.

### Earlier API attempt (not committed; potentially invalidated by UI save)

Package `com.youmotion.mobile`, expired edit ID intentionally omitted, initially expiring
9 September 2026 at 12:09 UTC (14:09 Europe/Berlin). Edits are temporary and may
also be invalidated by other Console/API changes; do not treat this as durable.

- German: all five corrected phone screenshots uploaded to the edit.
- English: created `en-US` in the edit using the committed title, short and full
  descriptions under `store/automation/google-play/metadata/en-US/`.
- Title: Youmotion: Discover Feelings. Offline listing validation passed.
- Corrected phone PNGs passed offline validation in both languages.

Saving is blocked under the no-review instruction:

1. `gplay edits validate` returned 403 (caller lacks permission).
2. `gplay edits commit --changes-not-sent-for-review` returned 400: changes are
   sent for review automatically and the parameter must not be set.
3. **Do not retry commit without that flag.** It would violate the user's
   instruction. No commit succeeded and no review submission was requested.

Continue with the confirmed Console **Save as draft** route once browser uploads
are enabled. Retain the committed metadata and PNGs. Do not commit the old API
edit: the browser save may have invalidated it, and it predates the saved draft.
# Description revision follow-up

German full description (1465 characters) and aligned English translation
(1239 characters) now match across store.config.json, both store Markdown copies
and the Google upload files. EAS validation passed and metadata push succeeded;
ASC readback matched both descriptions and promotional texts. The German promo
now uses “erkenne dein Gefühl”. Google DE and EN were saved using Save as draft;
the Console confirmed both saves. No review submission was performed.

App Review contact fields were present on readback. Overwriting with screenshot
values was blocked by security approval; no contact write occurred. Owner approval
is required before retrying. Personal values are intentionally omitted here.
The upload blueprint now documents CLI-supported review contact updates using
runtime placeholders.
