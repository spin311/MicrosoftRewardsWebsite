# Store screenshots

Chrome Web Store screenshots for Search automatic rewards, in English and six
translations. All are 1280×800, 24-bit RGB PNGs with no alpha, ready to upload:

- `chrome/<locale>/screenshot-1-main.png`: the popup as it opens.
- `chrome/<locale>/screenshot-2-progress.png`: a run in progress (3/5).
- `chrome/<locale>/screenshot-3-settings.png`: the search settings.

Locales: en, zh_CN, zh_TW, pt_BR, es, es_419 (a copy of es), fr, vi. In the Chrome Web
Store dashboard each language of the listing can have its own screenshots; a user
browsing in that language sees those first, then the global ones (upload `en` there).

Each image is the real popup, captured from the built extension with Chrome itself
running in that language, in a plain browser window on a flat background, with one
headline, one line and callouts. The style follows Free Game Claimer's store images.

## Trademark rules

Search automatic rewards works with Microsoft Rewards, but Microsoft's marks stay out
of the store images:

- No Microsoft or Bing logo, wordmark or domain anywhere in the image: not in the
  browser frame, the captions, the callouts or any picture.
- The browser frame shows a neutral new tab: the tab is titled "New Tab" (Chrome's own
  wording in each language) and the address bar is empty, with a search icon. Never
  bing.com, rewards.bing.com or another Microsoft site.
- Text inside the popup UI, such as "Rewards" in a label or button, is fine.

`tools/render.mjs` fails if the captions, tab title or address bar name Microsoft or
Bing, and `tools/capture.mjs` fails if the popup shows an image other than its own
coin logo and Free Game Claimer's icon (`ALLOWED_IMAGES`): check any new image for
Microsoft or Bing marks before adding it there.

## Files

- `source/screenshot-*.html`: the three images, with the English captions.
- `source/i18n/locales.json`: the locales, the Chrome UI language each is captured in
  (`tag`), the new-tab title (`newTab`) and the locales copied from another one
  (`copies`: es_419 from es).
- `source/i18n/<locale>.json`: the captions per page (`h` headline, `s` subline,
  `c` the callouts in the page's order).
- `source/layout.js` and `source/store.css`: the browser window, popup placement,
  callout lines and look. A headline or subline that would wrap shrinks in 0.5 px
  steps until it fits one line (not below 36 px and 17 px); a callout label that would
  leave the image or overlap the popup or another label fails the render.
- `source/fonts/`: Mona Sans (SIL Open Font License, `OFL.txt`), with its latin-ext and
  vietnamese subsets. Chinese captions fall back to PingFang SC/TC (Noto Sans SC/TC or
  Microsoft YaHei/JhengHei elsewhere).
- `tools/views.mjs`: the popup states (storage for each) and the elements the callouts
  point at. `tools/capture.mjs` captures them, `tools/render.mjs` lays out the images
  and `tools/finalize.py` saves them without alpha.

## Regenerating

You need Node 20.11 or later, Python 3 with Pillow (`pip install pillow`) and, once,
Playwright's Chromium. From `store-assets/`:

```bash
npm ci
npx playwright install chromium
```

The translated popup needs a build with `_locales`: the i18n branch, PR #51
(`feat/i18n`), isn't merged into `master` yet. Build it in its own worktree and point
the capture at it with `--dist` (or `STORE_DIST`):

```bash
git fetch origin
git worktree add ../msr-i18n origin/feat/i18n        # from the repository root
(cd ../msr-i18n/wxt && npm ci && npm run build)
```

Then, from `store-assets/`, one locale:

```bash
node tools/capture.mjs --locale fr --dist ../../msr-i18n/wxt/dist/chrome-mv3   # -> raw-ui/chrome/fr/
node tools/render.mjs --locale fr                                              # -> chrome/fr/
```

All of them (`--locale es` also refreshes `chrome/es_419/`):

```bash
for l in en zh_CN zh_TW pt_BR es fr vi; do
  node tools/capture.mjs --locale $l --dist ../../msr-i18n/wxt/dist/chrome-mv3
done
node tools/render.mjs --locale all
```

Once PR #51 is merged, build `wxt/` (`npm ci && npm run build` there) and leave out
`--dist`: it defaults to `../wxt/dist/chrome-mv3`. Without `--locale` both tools use
`en`.

How the language is set: on macOS Chrome ignores `--lang` and takes its UI language
from the system, so `tools/chrome-applelanguages.sh` starts it with the argument
`-AppleLanguages "(<tag>)"`, which overrides it for that one run. On Linux and Windows
the capture passes `--lang=<tag>` (and `LANGUAGE` on Linux); only the macOS route has
been run so far. Either way the capture stops if `chrome.i18n.getUILanguage()` reports
another language, so a translated popup is never shown in an English browser.

The committed images were made with Chrome for Testing 157; Playwright's bundled
Chromium can shift anti-aliasing slightly. To add a language, add it to `locales.json`
with its Chrome tag and new-tab title, write `<locale>.json`, then capture and render it.
