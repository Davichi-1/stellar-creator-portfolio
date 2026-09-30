# Mobile release and distribution

Reference for the build profiles in `eas.json` and how a release reaches a
store. Written for Issue #1390.

## Why this exists

`package.json` has called `eas build` since the build scripts were added, but
there was no `eas.json`, so both scripts failed immediately with a missing
configuration error. There was no way to produce a distributable build.

## Profiles

| Profile | Distribution | Channel | iOS artifact | Android artifact |
|---|---|---|---|---|
| `development` | internal | `development` | simulator build, dev client | debug APK |
| `preview` | internal | `preview` | device build | release APK |
| `production` | store | `production` | App Store build | AAB |

All three extend a shared `base` profile that pins the Node version, so a
build cannot pass locally and fail on EAS because the two used different
runtimes.

**Android artifact type differs by profile on purpose.** Play Store uploads
require an `.aab`, but an `.aab` cannot be sideloaded onto a device for
testing. `preview` therefore produces an APK a tester can install directly,
and only `production` produces the bundle the store takes.

**`autoIncrement` is enabled on `production` only.** Build numbers must be
unique and increasing per store upload; incrementing on every internal build
would burn numbers and make the store history confusing.

**`appVersionSource: "remote"`** makes EAS the authority on build numbers.
Tracking them in `app.json` means every build produces a commit, and two
builds from different branches collide.

## Commands

```bash
# Local development client
npm run build:development -- --platform ios

# Internal testing build for a device
npm run build:preview -- --platform android

# Store build
npm run build:production -- --platform all

# Upload the latest production build
npm run submit:production -- --platform ios
```

## Before the first store submission

`eas.json`'s `submit.production` block carries placeholders that must be filled
in, and the build will fail loudly rather than silently mis-submitting:

- `ascAppId` — App Store Connect app ID
- `appleTeamId` — Apple Developer team ID
- `serviceAccountKeyPath` — path to a Google Play service account JSON. Keep it
  out of version control; `credentials/` is gitignored for this reason.

Android submissions default to `track: internal` and
`releaseStatus: draft`, so a successful submit does not put a build in front
of users. Promoting to production is a deliberate step in the Play Console.

## Runtime version and OTA

`app.json` sets `runtimeVersion.policy: "sdkVersion"`, so an OTA update only
reaches builds on the same Expo SDK. A native change — a new native module, a
permission, an SDK upgrade — needs a new store build; it cannot ship over the
air.

Note that `expo-updates` is **not currently a dependency**, so the `channel`
values above name the release channels a build is tagged with but no OTA
update is delivered yet. `src/ota/` contains a client and rollback logic
waiting on that dependency.
