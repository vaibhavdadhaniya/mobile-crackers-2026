# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

"Fatakda Kit" — an Expo SDK 57 / React Native 0.86 app (Expo Router, TypeScript strict) for tracking distribution and sales of firecracker kits and the money collected from them. There is no backend in this repo; the app talks to a separate REST server (default URL in `app.json` → `expo.extra.apiUrl`, overridable at runtime and persisted in SecureStore). The project uses npm (`package-lock.json`), so use `npx`, not `bunx`.

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

`test/logic.test.cjs` uses Node's built-in test runner — no Jest. It transpiles individual `src/*.ts` files with the `typescript` compiler and `require`s them, so **only dependency-free pure modules are testable**: `customer.ts`, `format.ts`, `money.ts`, `session.ts`, `notify.ts`. Keep logic that needs tests in these kinds of files (no imports from React Native/Expo), and add new pure modules to the `loadTs(...)` list.

## Architecture

### Auth & session (`src/api.ts`, `src/auth.tsx`, `src/session.ts`)
- `api.ts` holds module-level state (base URL, access token, refresh token) persisted in `expo-secure-store`. All requests go through `request()` → `${baseUrl}/api${path}`, exposed as `api.get/post/put/del`. All response types live at the bottom of this file.
- On a 401 (non-`/auth/` path) it refreshes once via a single shared in-flight `refreshSession()` and retries. Only a rejected refresh or `code: 'ACCOUNT_DISABLED'` ends the session; network failures never log the user out (status `0` `ApiError`).
- `AuthProvider` (`auth.tsx`) loads stored tokens on boot, fetches `/me` (profile + counters like balance, unread notifications, pending requests), re-validates on app foreground, and polls `/me` every 30s. Use `useAuth().refreshMe()` after mutations that affect those counters.
- `session.ts` contains pure JWT-expiry / 401-policy helpers (unit tested).

### Routing (`src/app/`)
- Root `_layout.tsx` gates screens with `Stack.Protected` on `token` and `user.isAdmin`: `login` (logged out), `admin/` tab group + `stock`/`sell`/`holders` (admins), `user/` tab group (non-admins), and `notifications`/`wallet` (any logged-in user). `index.tsx` redirects to the right group.
- While a saved session exists but `/me` hasn't loaded, the root shows `Loading` or `Offline` (when `bootError` is set).
- Tab groups use `AppTabs` + `tab(title, headerTitle, subtitle, showHeader)` from `components/tabs.tsx` (custom `TabBar`, gradient `AppHeader`). Stack screens use the `stackHeader()` helper in the root layout.
- Screens shared between roles live in `src/screens/` and route files just re-export them (e.g. `app/sell.tsx`, `app/user/sell.tsx`, `app/admin/transfer.tsx`, `app/user/transfer.tsx`).

### Data loading (`src/hooks.ts`)
- `useApi<T>(path)` — refetches on screen focus, ignores stale responses, supports pull-to-refresh.
- `usePaged<T>(path)` — offset pagination (`limit`/`offset` appended to the query string) with infinite scroll and dedupe by `id`; pair with `components/PagedList.tsx`.
- `useDebounced` for search inputs.

### UI conventions
- Always import `Text`/`TextInput` from `src/components/Text.tsx`, not `react-native`: it maps `fontWeight` to the correct Inter font family (custom fonts don't synthesize weights).
- Colors, gradients, fonts, radius and shadows come from `src/theme.ts` (orange brand, light mode only).
- Toasts and confirm dialogs come from `useFeedback()` in `components/Feedback.tsx` (provided at the root); shared primitives are in `components/ui.tsx`.
- Notification tap destinations are decided by `notificationRoute()` in `notify.ts`.
