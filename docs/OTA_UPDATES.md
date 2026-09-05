# Over-the-air updates

Youmotion publishes JavaScript-only updates through EAS Update. Two channels
matter: `production`, which store builds subscribe to, and `qa`, which exists
so a tester can see a fix before it ships. The switch between them lives in the
app, behind a long press, and needs no new binary.

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

A long press (500 ms) opens the platform action sheet with three rows: check
for an update now, switch to the other channel, cancel. Cancel and a press
outside both dismiss it. A tap does nothing — the menu is deliberately hidden.

Switching is transactional: if the target channel has no eligible update, the
previous channel is restored rather than left half-applied.

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
tree: uncommitted changes are part of the fingerprint, so a dirty tree records
a runtime no binary carries.

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
- **"Update-Suche fehlgeschlagen · UpdatesReloadException".** The switch sets
  the channel header and then reloads even when the target channel has nothing
  eligible, and the reload has no update to launch. Expo's message names
  `appContext`, which is not the real cause — the cause is that no update on
  the target channel matches this binary's runtime. Publish to that channel at
  the runtime the installed build reports in its `Laufzeit` line.
- **The switch is meaningful only on a `production` build.** The footer knows
  the channels `production` and `qa`. A `testing` or `preview` build maps to
  `production`, so switching away from it cannot come back — reinstall to
  return to `testing`.
- **The wrong code is running.** Check the channel line. A build made from a
  branch, with no `MOBILE_UPDATE_CHANNEL`, subscribes to `production` and will
  replace itself with the store bundle on first launch.
