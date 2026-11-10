# Tech Stack

## Browser extensions

| Concern | Chrome | Firefox |
|---------|--------|---------|
| Manifest | V3 (`service_worker`) | V2 (`background.scripts`, `browser_action`) |
| Shipped version | 2.2.7 (`chrome/prod/manifest.json`) | 2.2.x — **Needs Verification** (root manifest read as 2.2.4; dist rebuilt) |
| Language | TypeScript → JS | TypeScript → JS |
| APIs | `chrome.*` (callbacks), `chrome.alarms`, `chrome.action`, `chrome.storage.sync` | `browser.*` (promises), `browser.alarms`, `browser.browserAction`, `browser.storage.sync` |
| Permissions | `storage`, `alarms` | `storage`, `alarms`, `tabs`, `https://rewards.bing.com/*` |
| Content script | `rewards.bing.com` | `rewards.bing.com` |
| Types | `@types/chrome` | `@types/firefox-webext-browser` |

### Build tooling (repo root)

- `typescript` ^5.5 (devDependency)
- `tsconfig.json` per extension: `target ES2020`, `lib [ES2020, DOM, DOM.Iterable]`,
  `strict`, `module commonjs`, `outDir ./prod/dist`, `rootDir ./src`, scoped `types`.
- npm scripts: `build`, `build:chrome`, `build:firefox`, `typecheck(:chrome|:firefox)`.
- No bundler. Files emit as plain global scripts (no imports/exports).
- **Historical:** a `gulpfile.js` build existed but is git-ignored and not in the repo.

## Mobile app (`microsoft_rewards_app`)

| Layer | Choice |
|-------|--------|
| Language / SDK | Dart, Flutter (`sdk >=3.7.0 <4.0.0`) |
| App version | 1.2.0+14 |
| State management | `flutter_bloc` ^9.1, `bloc`, `equatable` |
| DI | `get_it` ^8 |
| WebView | `flutter_inappwebview` ^6.1 |
| Persistence | `shared_preferences` ^2.5 |
| Notifications | `flutter_local_notifications` ^19.2, `permission_handler` ^12, `flutter_timezone` ^4.1 |
| UX helpers | `wakelock_plus` ^1.3, `animated_text_kit` ^4.2, `word_generator` ^0.4 |
| Icons | `flutter_launcher_icons` ^0.14 |
| Test | `flutter_test`, `bloc_test` ^10 |

Targets present: `android/`, `ios/`, plus `linux/`, `macos/`, `windows/`, `web/`
(default Flutter scaffolding — desktop/web likely unused, **Needs Verification**).

## External services / dependencies

- **Bing** (`bing.com/search`, `rewards.bing.com`) — the automation target. Content
  script depends on Bing's DOM selectors (`#daily-sets > mee-card-group:nth-child(7)`,
  `.ds-card-sec.ng-scope`) — brittle to Microsoft markup changes.
- **svitspindler.com** — external help and donate pages.
- **PayPal** — donation link.
- **Play Store / Chrome Web Store / Firefox Add-ons** — distribution.

No package registries, APIs, or SaaS are called at runtime by our code.

## Repo hygiene

- No CI (`.github/workflows` absent).
- `package-lock.json` present; `node_modules/` git-ignored.
- A ~23 MB `microsoft-automatic-rewards.apk` is committed at the repo root
  (large binary in git — see technical review).
