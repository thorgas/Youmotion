# Over-the-air updates

Youmotion publishes JavaScript-only updates through EAS Update. Three channels
matter to testers: `production`, which normal store builds subscribe to;
`testing`, which QA-control TestFlight and Play internal builds subscribe to;
and `qa`, which exists so a tester can see a fix before it ships. The switch
between them lives behind a long press in QA-control binaries. Normal
production binaries intentionally do not expose the manual update menu. The
list is
`UPDATE_CHANNELS` in `src/constants.ts`; its first entry is the store channel
an unrecognised bundle channel resolves to.

## The release footer

The bottom of Settings shows three lines of muted text — the release label, the
channel and app version, and the runtime version. They come from
[`expo-update-kit`](https://github.com/thorgas/expo-update-kit); the adapter is
[release-footer.tsx](../src/features/updates/ui/release-footer.tsx) and every
string is ours, in fbtee ([release-footer-labels.ts](../src/features/updates/ui/release-footer-labels.ts)).

| line              | what it answers                                                 |
| ----------------- | --------------------------------------------------------------- |
| release label     | which update is running, or that the build launched embedded    |
| `Kanal … · App …` | which channel this binary asks for, and its marketing version   |
| `Laufzeit …`      | the runtime fingerprint an update must match to be eligible      |

A long press (500 ms) opens the platform action sheet: check for an update
now, one "switch to" row per channel other than the current one, cancel.
Cancel and a press outside both dismiss it. A tap does nothing — the menu is
deliberately hidden. Android's native alert holds two actions, so with three
channels it shows "More channels…" first and the switch rows behind it.

The controls are present in development and in binaries whose embedded channel
is `testing` or `qa`. They stay available after switching channels because
`Updates.channel` identifies the channel baked into the binary. A production
binary still checks `production` automatically on launch; with the configured
zero launch wait, it launches immediately and applies a newly downloaded update
on the next cold launch. There is no user-facing refresh button in that binary,
so allow up to two cold launches when verifying a newly published production
update.

If the target channel has an eligible update, the app downloads it and
reloads. If it has none, the switch still succeeds — the channel header is
persisted natively and the alert says the next check or launch uses the new
channel — instead of attempting a reload with nothing to launch. A failed
download restores the previous channel.

## Publishing

```bash
pnpm eas:update:qa
```

```bash
pnpm eas:update:production
```

Both run `expo-update-kit verify-runtime` first. It compares the runtime
fingerprint resolved from the current working tree against
[expected-ota-runtimes.json](../expected-ota-runtimes.json) — the runtimes the
installed binaries were built from — and refuses to publish an update that no
phone could receive. After shipping a new binary, record its runtime:

```bash
pnpm eas:update:runtimes
```

and commit the changed file with the build. Resolve it from a clean working
tree: the fingerprint hashes `app.config.js`, `package.json` and the other
native inputs as files, so an uncommitted edit to one of them records a
runtime no binary carries.

`fingerprint.config.js` excludes the `extra` section of the Expo config from
the fingerprint. `app.config.js` writes the current git commit into
`extra.gitCommit`; without the exclusion every commit produced a new runtime
version, and no update could ever match a binary built from a different
commit. EAS honours the same file, so local and builder resolutions agree.
Changing that file is itself a native-affecting change: the runtime moves, and
`expected-ota-runtimes.json` keeps naming the binaries actually installed until
the next store build ships — `verify-runtime` refusing to publish in between
is the guard doing its job.

## TestFlight binary types

Use the QA-control release when a tester must manually switch among `testing`,
`qa`, and `production` or request an immediate update check:

```bash
pnpm release:testflight:qa-controls
```

This builds with the `testing` profile, exposes the release footer and manual
menu, and automatically submits the finished build to TestFlight.

Use the production-only release for the ordinary App Store candidate:

```bash
pnpm release:testflight:production
```

The compatibility alias `pnpm release:testflight` runs the production-only
command. Production-only binaries subscribe to `production` and receive
compatible production updates automatically on launch, but they do not expose
the manual channel selector. Build without automatic submission with
`pnpm build:testflight:qa-controls` or `pnpm build:testflight:production`.

## Channels

`production`, `qa`, `preview`, `testing` and `development` already exist. A new
one is created once, from the app directory:

```bash
npx eas channel:create <name>
```

See the package README's "EAS setup" section for branch mapping. Build profiles
name their channel in [eas.json](../eas.json); the `qa` profile extends
`preview` and distributes internally.

## Which channel a build subscribes to

`app.config.js` resolves `updates` through `resolveUpdatesConfig`:

| `MOBILE_UPDATE_CHANNEL` | result                                                     |
| ----------------------- | ---------------------------------------------------------- |
| `none`                  | updates disabled; the build keeps the JS it was built with |
| a channel name          | enabled, subscribed to that channel                        |
| unset                   | the `app.json` default (`production`)                      |

The resolution must not depend on anything that differs between your machine
and the EAS builder. EAS computes the runtime fingerprint twice — once locally
when the job is submitted, once on the builder — and fails the build when they
disagree, because an update published from a config that resolved differently
would never match the binary. `EAS_BUILD_PROFILE` in particular is set only
inside the builder, so it must not feed this decision.

`pnpm ios` and `pnpm android` pin `MOBILE_UPDATE_CHANNEL=none` for this reason:
a locally built binary carries the same fingerprint runtime version as a store
build, so without it a production update would download on first launch and
silently replace the code just built.

## Testing a switch on a local Release build

`expo run:ios` does not re-run prebuild, so a channel or runtime-policy change
in `app.config.js` reaches the binary only after the native project is synced:

```bash
MOBILE_UPDATE_CHANNEL=production npx expo prebuild -p ios
```

```bash
MOBILE_UPDATE_CHANNEL=production npx expo run:ios --configuration Release
```

Then regenerate `expected-ota-runtimes.json` with `pnpm eas:update:runtimes`
before publishing: the fingerprint covers local state under the gitignored
`ios/` directory, so it moves when the native project is regenerated even
though nothing tracked changed.

## When an update does not arrive

- **"Updates are disabled in this build."** Expected in development and
  dev-client builds — `expo-updates` never checks there. Use a Release or EAS
  build to exercise a real switch.
- **The footer says `Kanal development` on a Release build.** The native
  project predates the config change; prebuild and rebuild as above.
- **Nothing happens on a Release build.** Compare the footer's `Laufzeit` line
  with the runtime `eas update` printed. A fingerprint mismatch means the
  update was never eligible for this binary; publish against the matching
  runtime, or ship a new binary.
- **"Gewechselt zu …" but nothing changed on screen.** The target channel has
  no update matching this binary's runtime, so only the header moved. Publish
  to that channel at the runtime the footer's `Laufzeit` line reports, then
  check again. (Before `expo-update-kit` 0.1.0-alpha.2 this case surfaced as
  `UpdatesReloadException`; the kit no longer reloads with nothing to launch.)
- **A `development` or `preview` build shows `Updates · Production`.** Only
  the channels in `UPDATE_CHANNELS` are known; anything else resolves to the
  first entry. Those builds are dev-client or internal builds that never take
  updates anyway.
- **The wrong code is running.** Check the channel line. A build made from a
  branch, with no `MOBILE_UPDATE_CHANNEL`, subscribes to `production` and will
  replace itself with the store bundle on first launch.
