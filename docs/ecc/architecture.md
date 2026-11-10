# Architecture

Three independent clients, no shared code, no backend. Each is described below.

```
repo/
├── chrome/            Chrome extension (MV3)
│   ├── src/           TypeScript source  ──build──▶ prod/dist/*.js
│   ├── prod/          SHIPPED extension (manifest v2.2.7, dist/, imgs/, styles/)
│   └── legacy/        Old v1.3 source (not built, kept for history)
├── firefox/           Firefox extension (MV2)
│   ├── src/           TypeScript source  ──build──▶ prod/dist/*.js
│   └── prod/          SHIPPED extension (manifest v2.2.x, dist/, imgs/, styles/)
└── microsoft_rewards_app/   Flutter app (Clean Architecture + BLoC)
```

## Client 1 & 2 — Browser extensions (Chrome MV3 / Firefox MV2)

Same design; APIs differ (`chrome.*` callbacks vs `browser.*` promises; MV3 service
worker vs MV2 background script; `chrome.action` vs `browser.browserAction`).

### Modules

| File | Responsibility |
|------|----------------|
| `background.ts` | The brain. Event listeners, alarm scheduling, tab open/close, daily-run logic, settings defaults. |
| `content.ts` | Injected on `rewards.bing.com`. Clicks the daily-set cards via a `MutationObserver`. |
| `popup.ts` | The UI logic. Reads/writes settings, wires the buttons, starts/stops searches. |
| `popup.html` + `styles/` | Popup markup and CSS. |
| `manifest.json` | Permissions (`storage`, `alarms`), entry points, content-script match. |

### Data flow (a search run)

1. User clicks **Get rewards** in the popup → `popup.ts` sends `{action:"popup"}`.
2. `background.ts` `handleMessage` → `popupBg(true)` reads settings from
   `storage.sync`, optionally kicks off the daily set (`openDailyRewards`), then
   `createTabs(...)`.
3. `createTabs` opens the first Bing tab and schedules an `alarms` alarm
   (`openTabAlarm`) with a jittered delay.
4. `handleAlarms` fires per alarm: opens one more tab (`openTab` → `openAndClose`),
   increments `currentSearch` in storage, re-arms the alarm until `searches` is
   reached, then `sendStopSearch()`.
5. Each opened tab auto-closes after `closeTime` (+ jitter) once `status === "complete"`.
6. `content.ts` (on the rewards tab) clicks each daily-set card with delays.

### Automatic daily run

`onStartup` → `checkLastOpened()` compares today's `toLocaleDateString()` against a
stored `lastOpened`; if different, runs a batch and records today. Gated on the `active`
/ `autoDaily` settings.

### State management / persistence

All state is key/value in `chrome.storage.sync` (roams with the browser profile):
`active`, `autoDaily`, `useWords`, `searches`, `timeout`, `closeTime`, `isSearching`,
`currentSearch`, `lastOpened`. `storage.local` holds `referralClicked`
(referral wiring is currently commented out in the popup).

### Networking

None of our own. The extension merely navigates the browser to `bing.com/search` and
`rewards.bing.com`. External links point at `svitspindler.com` (help, donate).

## Client 3 — Flutter mobile app

Clean Architecture with a single `search` feature.

```
lib/
├── main.dart                 DI init → NotificationService.init → Bloc.observer → MyApp
├── app.dart                  MaterialApp + theme → StartupScreen
├── core/
│   ├── constants/            AppConstants (limits, colors), Strings, string_extension
│   ├── di/                   injection_container.dart (get_it), SearchCancellationToken
│   ├── utils/                error_handler, helpers/search_helper, validators/input_validators
│   └── widgets/              custom_button, custom_text_field, loading_indicator
├── features/search/
│   ├── data/dataSources/     search_words.dart (word_generator-backed sentences)
│   ├── domain/repositories/  search_repository(+_impl)
│   ├── domain/useCases/       perform_search.dart
│   └── presentation/
│       ├── bloc/             search_bloc.dart (events/states)
│       └── pages/            startup_screen, login_screen, search_screen
└── notifications/            notification_service.dart
```

### Layer responsibilities

- **presentation** — `SearchBloc` handles `StartSearchEvent` / `CancelSearchEvent`,
  emits `SearchInitial/InProgress/Success/Failure/Cancelled`. Pages render state.
- **domain** — `PerformSearch` use case delegates to `SearchRepository`.
- **data** — `SearchRepositoryImpl` loops `count` times, gets a random sentence from
  `SearchWordsDataSource`, and calls `SearchHelper.launchSearch` which loads a Bing
  search URL **inside an `InAppWebViewController`**. `SearchCancellationToken` supports
  cancel; `onProgress` drives the progress UI. Randomized delay between searches.

### State management

`flutter_bloc` for search state; `get_it` for dependency injection (BLoC = factory,
use case / repo / data source / helper = lazy singletons).

### Persistence

`shared_preferences` (login flag / settings). Login itself is a Microsoft sign-in
performed inside the WebView; the session persists via the WebView cookie store. **No
credentials are handled by app code.**

### Other services

`flutter_local_notifications` + `permission_handler` (notifications),
`flutter_timezone`, `wakelock_plus` (keep screen awake during a run),
`animated_text_kit`. Details of scheduling/notification cadence — **Needs Verification**
(notification_service.dart not fully audited).

## Authentication (all clients)

Delegated entirely to Microsoft's own login in the browser/WebView. The project stores
and transmits **no** credentials. There is no authorization model of our own.

## Dependency relationships

The three clients are fully independent — no shared package, no cross-imports. The only
coupling is conceptual (same words list, same Bing URL format, same settings names) and
is **duplicated by hand** across Chrome and Firefox.
