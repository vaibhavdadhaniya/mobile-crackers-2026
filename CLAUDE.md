# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

An Expo SDK 57 / React Native 0.86 app (Expo Router, TypeScript strict) for tracking distribution and sales of firecracker kits and the money collected from them (display name "Shree Hari Crackers"; slug `fatakda-kit`; iOS bundle id `com.app.hpym2024`, Android package `com.stock.crackers`, which must match the Firebase files `GoogleService-Info.plist` / `google-services.json` referenced from `app.json`). There is no backend in this repo; the app talks to a separate REST server. In `__DEV__` builds `api.ts` targets the machine running Metro (`http://<hostUri host>:<extra.devApiPort ?? 4000>`), so a local backend must be running there; release builds use `app.json` → `expo.extra.apiUrl` (no runtime override). The project uses npm (`package-lock.json`), so use `npx`, not `bunx`.

## Commands

```bash
npm start                 # expo start
npm run ios / android     # expo run:* (dev build; native dirs are generated, not committed)
npm run typecheck         # tsc --noEmit
npm test                  # node --test test/logic.test.cjs
node --test --test-name-pattern="session tokens" test/logic.test.cjs   # run one describe/it block
```

No ESLint config is committed yet; `npx expo lint` will scaffold one on first run.

### How tests work

`test/logic.test.cjs` uses Node's built-in test runner — no Jest. It transpiles individual `src/*.ts` files with the `typescript` compiler and `require`s them, so **only dependency-free pure modules are testable**: `customer.ts`, `format.ts`, `money.ts`, `session.ts`, `notify.ts`, `update.ts`. Keep logic that needs tests in these kinds of files (no imports from React Native/Expo), and add new pure modules to the `loadTs(...)` list.

## Architecture

### Auth & session (`src/api.ts`, `src/auth.tsx`, `src/session.ts`)
- `api.ts` holds module-level state (base URL, access token, refresh token) persisted in `expo-secure-store`. All requests go through `request()` → `${baseUrl}/api${path}`, exposed as `api.get/post/put/del`. All response types live at the bottom of this file.
- On a 401 (non-`/auth/` path) it refreshes once via a single shared in-flight `refreshSession()` and retries. Only a rejected refresh or `code: 'ACCOUNT_DISABLED'` ends the session; network failures never log the user out (status `0` `ApiError`).
- `AuthProvider` (`auth.tsx`) loads stored tokens on boot, fetches `/me` (profile + counters like balance, unread notifications, pending requests), re-validates on app foreground, and polls `/me` every 30s. Use `useAuth().refreshMe()` after mutations that affect those counters.
- `session.ts` contains pure JWT-expiry / 401-policy helpers (unit tested).
- `push.ts` registers the device's native FCM token with the backend on login and unregisters it on sign-out (called from `auth.tsx`). Android only for now (iOS push not configured); no-op in Expo Go. Its channel id must match the backend's `android.notification.channelId`.

### Routing (`src/app/`)
- Root `_layout.tsx` gates screens with `Stack.Protected` on `token` and `user.isAdmin`: `login` (logged out), `admin/` tab group + `stock`/`sell`/`holders` (admins), `user/` tab group (non-admins), and `notifications`/`wallet` (any logged-in user). `index.tsx` redirects to the right group.
- While a saved session exists but `/me` hasn't loaded, the root shows `Loading` or `Offline` (when `bootError` is set).
- Tab groups use `AppTabs` + `tab(title, headerTitle, subtitle, showHeader)` from `components/tabs.tsx` (custom `TabBar`, gradient `AppHeader`). Stack screens use the `stackHeader()` helper in the root layout.
- Screens shared between roles live in `src/screens/` and route files just re-export them (e.g. `app/sell.tsx`, `app/user/sell.tsx`, `app/admin/transfer.tsx`, `app/user/transfer.tsx`), or render them with a role prop (`<ActivityScreen admin />` in `app/admin/activity.tsx`).

### App update & maintenance gate (`src/update.ts`, `components/UpdateGate.tsx`, `components/AppUpdateForm.tsx`)
- After the intro animation, the root renders `UpdateGate`, which reads the Firestore document `AppConfig/GlobalSettings` **directly via the Firestore REST API** (project/db/key from `app.json` → `extra.firebase`, no Firebase SDK) on start and on every foreground. It shows a maintenance screen (admins exempt) or an optional/forced update prompt. Android compares `androidBuildNumber` with the native build number (versionCode). iOS compares `iosVersion` with the native version first, and `iosBuildNumber` with the build number only within the same version, because iOS releases usually bump just the build and a new version may restart it. Failures are silent and never block the app.
- "Update now" opens `UPDATE_LINKS` in `update.ts` (iOS: TestFlight; Android: Drive folder, overridden by the admin-set `androidDownloadUrl`). They live in JS rather than `app.json` extra so installed builds pick up changes from the bundle. The Firestore rules for database `harimaypradesh` must allow public read of `AppConfig/GlobalSettings`; otherwise the read gets a 403 and the gate silently shows nothing.
- Admins edit those settings in Admin → Settings via `AppUpdateForm`, which writes through the REST server (`GET/PUT /admin/app-update`), not Firestore.
- Decision logic (`parseFirestoreDoc`, `decideUpdate`, `inMaintenance`) is pure and unit tested.

### Data loading (`src/hooks.ts`)
- `useApi<T>(path)` — refetches on screen focus, ignores stale responses, supports pull-to-refresh.
- `usePaged<T>(path)` — offset pagination (`limit`/`offset` appended to the query string) with infinite scroll and dedupe by `id`; pair with `components/PagedList.tsx`.
- `useDebounced` for search inputs.

### UI conventions
- Always import `Text`/`TextInput` from `src/components/Text.tsx`, not `react-native`: it maps `fontWeight` to the correct Inter font family (custom fonts don't synthesize weights).
- Colors, gradients, fonts, radius and shadows come from `src/theme.ts` (orange brand, light mode only).
- Toasts and confirm dialogs come from `useFeedback()` in `components/Feedback.tsx` (provided at the root); shared primitives are in `components/ui.tsx`.
- Notification tap destinations are decided by `notificationRoute()` in `notify.ts`.

## Native config

`ios/` and `android/` are gitignored and generated by prebuild. After changing `app.json` or anything in `plugins/`, regenerate with `npx expo prebuild --clean --platform ios|android` (or just `npx expo run:ios|android`) — Metro reloads alone won't pick these up. Local config plugins in `plugins/`:
- `with-scene-lifecycle.js` — iOS 27 aborts at launch unless the app adopts the UIScene life cycle. Expo 57's template doesn't, so this plugin makes `AppDelegate` conform to `ExpoReactNativeFactoryProvider`, removes its window/`startReactNative` block, and adds a `UIApplicationSceneManifest` pointing at `EXExpoAppSceneDelegate`. It throws if the AppDelegate template changes, rather than silently producing a crashing app.
- `withServerCert.js` — trusts the API server's self-signed cert(s) (`certs/*.pem`, committed; listed in `app.json`) only for the listed hosts. Android: network-security-config. iOS: generates `ServerCertTrust.m`, which adds a server-trust challenge handler to **expo/fetch's** session delegate (`ExpoModulesCore.URLSessionSessionDelegateProxy`, because Expo SDK 57 replaces global `fetch`) and to RN's `RCTHTTPRequestHandler`. It accepts a byte-identical match with the bundled cert, since the server cert lacks the serverAuth EKU that Apple's SSL policy requires. This only works while ATS is relaxed: keep `NSAllowsArbitraryLoads: true` and do **not** add `NSAllowsLocalNetworking` (or the other ATS sub-keys) — their presence makes iOS ignore `NSAllowsArbitraryLoads`, and ATS then rejects the cert before the handler runs (`-1200`/`-9802`, "ATS failed system trust"). When the server cert is replaced, update `certs/server_cert.pem` and rebuild both platforms.

- `withReleaseSigning.js` — signs Android release builds with the upload keystore when `keystore/key.properties` exists in the project root (`storeFile` relative to `keystore/`, `storePassword`, `keyAlias`, `keyPassword`); otherwise falls back to the debug key. `keystore/` is gitignored. Never keep signing files in `android/`: `expo prebuild` regenerates that folder (even without `--clean`) and deletes anything in it.

- `withAndroidAppName.js` — sets the Android launcher label (`app_name`) from its `name` option, independent of `expo.name` (which also names the iOS project). iOS shows `ios.infoPlist.CFBundleDisplayName` instead.

`expo-build-properties` limits Android builds to `armeabi-v7a`/`arm64-v8a` (no x86 emulators) to keep the sideloaded APK small.

`ios.deploymentTarget` is pinned to 16.4 in `app.json` (Expo 57's minimum); without it the app target defaults to 15.0 and Xcode builds fail against the `Expo` module.
