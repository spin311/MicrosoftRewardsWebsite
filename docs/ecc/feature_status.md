# Feature Status

Legend: ✅ implemented · 🟡 partial / unclear · ⛔ absent · 🔎 Needs Verification

## Browser extensions (Chrome + Firefox)

| Feature | Status | Notes |
|---------|--------|-------|
| Manual "Get rewards" run | ✅ | Popup button → background opens N Bing tabs. |
| Auto daily run on browser startup | ✅ | `onStartup` + `lastOpened` date gate, `active` setting. |
| Open daily-set tasks automatically | ✅ | `content.ts` on `rewards.bing.com`, `autoDaily` setting. |
| Configurable # searches / delay / close-time | ✅ | Popup inputs → `storage.sync`. |
| Words vs random-string queries | ✅ | `useWords` toggle. |
| Start/stop mid-run | ✅ | Stop button → `sendStopSearch` clears alarms. |
| Randomized query + jittered timing | ✅ | Human-like intent; effectiveness 🔎. |
| Referral link handling | 🟡 | `setupRewardsLink` implemented but **commented out** in popup. |
| TypeScript source ↔ shipped parity | ✅ | Rebuilt 2026-07-15; `src/` now generates `prod/dist/`. |
| Chrome/Firefox version alignment | ✅ | Both source manifests now 2.2.7 (aligned 2026-07-15). ⚠️ store uploads must keep versions monotonic. |
| Automated tests | ⛔ | None. |

## Mobile app (Flutter)

| Feature | Status | Notes |
|---------|--------|-------|
| Microsoft login via in-app WebView | ✅ | `login_screen.dart`; session in WebView cookies. |
| Logout | ✅ | Recent commit "logout for mobile app". Details 🔎. |
| Run N automated searches with delay | ✅ | `SearchBloc` → `PerformSearch` → repo → WebView. |
| Progress reporting | ✅ | `onProgress` → `SearchInProgress(current,total)`. |
| Cancel a run | ✅ | `SearchCancellationToken` + `CancelSearchEvent`. |
| Random sentence generation | ✅ | `word_generator` via `search_words.dart`. |
| Local notifications | 🟡 | `NotificationService.init()` wired; cadence/triggers 🔎. |
| Keep-awake during run | ✅ | `wakelock_plus` dependency present; usage 🔎. |
| Daily-set automation (like the extensions) | 🔎 | Not confirmed in mobile; may be search-only. |
| Play Store distribution | 🔎 | Popup links a Play Store id; live status unconfirmed. |
| Automated tests | ⛔ | Only the default `widget_test.dart`. |

## Cross-cutting

| Item | Status |
|------|--------|
| Backend / DB / owned auth | ⛔ (by design) |
| CI/CD | ✅ GitHub Actions (extensions gate strict; mobile non-blocking) |
| Telemetry | 🔎 (external help page hits only, assumed) |
| Build reproducibility (extensions) | ✅ (npm run build) |
| Build reproducibility (mobile) | ✅ (standard Flutter) |
