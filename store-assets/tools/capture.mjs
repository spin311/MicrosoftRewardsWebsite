// Captures the real Chrome popup at 2x in each view of views.mjs, with Chrome running
// in a locale's UI language, plus where the elements the callouts point at are.
//   node tools/capture.mjs [--locale <name>] [--dist <dir>]      (from store-assets/)
// --locale: a key of source/i18n/locales.json (default en; or STORE_LOCALE).
// --dist: the built extension (default ../wxt/dist/chrome-mv3; or STORE_DIST). The
//   translated popup needs a build with _locales: see README.
// Writes raw-ui/chrome/<name>/popup-*.png and rects.js. The extension is loaded from a
// copy without its background and content scripts, so nothing is searched.
// Chrome takes its UI language from macOS, not --lang, so on macOS
// tools/chrome-applelanguages.sh starts it with -AppleLanguages "(<tag>)"; Linux and
// Windows get --lang=<tag> (and LANGUAGE on Linux). The run fails if
// chrome.i18n.getUILanguage() reports another language, or if the popup shows an
// image that isn't in ALLOWED_IMAGES (see README, "Trademark rules").
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const TOOLS_DIR = import.meta.dirname;
const ROOT = path.join(TOOLS_DIR, "..");
const POPUP_WIDTH = 340;
const POPUP_MAX_HEIGHT = 600;
const SCALE = 2;
// Every image the popup may show in these views: its own coin logo and Free Game
// Claimer's icon. A new one must be checked for Microsoft or Bing marks first.
const ALLOWED_IMAGES = ["/imgs/logo.png", "/imgs/free-games.png"];
const { VIEWS, viewStorage } = await import("./views.mjs");

function option(name, envName, fallback) {
    const i = process.argv.indexOf(`--${name}`);
    if (i >= 0 && !process.argv[i + 1]) throw new Error(`--${name} needs a value`);
    return i >= 0 ? process.argv[i + 1] : process.env[envName] || fallback;
}

const LOCALE = option("locale", "STORE_LOCALE", "en");
const DIST_DIR = path.resolve(option("dist", "STORE_DIST", path.join(ROOT, "..", "wxt", "dist", "chrome-mv3")));
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, "source", "i18n", "locales.json"), "utf8"));
if (!CONFIG.locales[LOCALE]) throw new Error(`unknown locale ${LOCALE}; source/i18n/locales.json has ${Object.keys(CONFIG.locales).join(", ")}`);
const TAG = CONFIG.locales[LOCALE].tag;
const OUT_DIR = path.join(ROOT, "raw-ui", "chrome", LOCALE);
if (!fs.existsSync(path.join(DIST_DIR, "manifest.json"))) throw new Error(`no built extension in ${DIST_DIR}: build it or pass --dist`);
if (LOCALE !== "en" && !fs.existsSync(path.join(DIST_DIR, "_locales", LOCALE))) {
    throw new Error(`${DIST_DIR} has no _locales/${LOCALE}: build the i18n branch and pass it with --dist (see README)`);
}

// An unpacked extension's id: sha256 of its absolute path, hex digits mapped to a-p.
function unpackedId(dir) {
    return [...createHash("sha256").update(fs.realpathSync(dir)).digest("hex").slice(0, 32)]
        .map((c) => String.fromCharCode(97 + parseInt(c, 16))).join("");
}

function prepareExtension(workDir) {
    const extDir = path.join(workDir, "ext");
    fs.cpSync(DIST_DIR, extDir, { recursive: true });
    const manifestPath = path.join(extDir, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    delete manifest.background;
    delete manifest.content_scripts;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    return extDir;
}

// How Chrome is started in TAG: see the header.
function launchOptions() {
    if (process.platform === "darwin") {
        return {
            executablePath: path.join(TOOLS_DIR, "chrome-applelanguages.sh"),
            env: { ...process.env, STORE_CHROME_BINARY: chromium.executablePath(), STORE_APPLE_LANGUAGE: TAG },
            args: [],
        };
    }
    return { channel: "chromium", env: { ...process.env, LANGUAGE: TAG.replace("-", "_") }, args: [`--lang=${TAG}`] };
}

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "msr-capture-"));
const extDir = prepareExtension(workDir);
const { args: localeArgs, ...options } = launchOptions();
// No Playwright locale: the page's Intl and navigator.language come from Chrome's UI language.
const context = await chromium.launchPersistentContext(path.join(workDir, "profile"), {
    ...options,
    headless: true,
    colorScheme: "light",
    deviceScaleFactor: SCALE,
    viewport: { width: POPUP_WIDTH, height: POPUP_MAX_HEIGHT },
    args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`, "--hide-scrollbars", ...localeArgs],
});
const errors = [];
const rects = {};
try {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const page = await context.newPage();
    for (const other of context.pages()) if (other !== page) await other.close();
    page.on("pageerror", (e) => errors.push(String(e)));
    const popupUrl = `chrome-extension://${unpackedId(extDir)}/popup.html`;
    await page.goto(popupUrl);
    const uiLanguage = await page.evaluate(() => chrome.i18n.getUILanguage());
    if (uiLanguage.toLowerCase() !== TAG.toLowerCase()) throw new Error(`Chrome runs in ${uiLanguage}, not ${TAG}: its UI language didn't take`);
    await page.waitForTimeout(1500); // the first load writes its defaults to storage
    for (const [name, view] of Object.entries(VIEWS)) {
        await page.evaluate(async (storage) => {
            for (const area of ["sync", "local"]) {
                await chrome.storage[area].clear();
                await chrome.storage[area].set(storage[area]);
            }
        }, viewStorage(view));
        await page.setViewportSize({ width: POPUP_WIDTH, height: POPUP_MAX_HEIGHT });
        await page.goto(popupUrl);
        await page.waitForLoadState("networkidle");
        await page.waitForFunction(() => [...document.images].every((img) => img.complete));
        await page.waitForTimeout(500);
        const images = await page.evaluate(() => [...document.images].filter((i) => i.getBoundingClientRect().width).map((i) => i.getAttribute("src")));
        const unknown = images.filter((src) => !ALLOWED_IMAGES.includes(src));
        if (unknown.length) throw new Error(`${name} shows ${unknown.join(", ")}: check it has no Microsoft or Bing mark, then add it to ALLOWED_IMAGES`);
        // Chrome sizes a popup to its content, up to 600 px.
        const height = await page.evaluate(() => Math.ceil(document.body.getBoundingClientRect().height));
        await page.setViewportSize({ width: POPUP_WIDTH, height: Math.min(height, POPUP_MAX_HEIGHT) });
        // Wait for a frame at the new size: a capture right after a resize can come
        // back as a tiled copy of the old surface.
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 200)))));
        rects[`${name}.png`] = await page.evaluate((targets) => Object.fromEntries(Object.entries(targets).map(([key, selector]) => {
            const element = document.querySelector(selector);
            if (!element) return [key, null];
            const { x, y, width, height } = element.getBoundingClientRect();
            return [key, { x, y, w: width, h: height }];
        })), view.targets);
        await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
    }
    fs.writeFileSync(path.join(OUT_DIR, "rects.js"), `window.RECTS = ${JSON.stringify(rects, null, 1)};\n`);
    const missing = Object.entries(rects).flatMap(([file, r]) => Object.entries(r).filter(([, v]) => !v).map(([k]) => `${file}:${k}`));
    console.log(JSON.stringify({ locale: LOCALE, uiLanguage, files: fs.readdirSync(OUT_DIR), missing, errors }));
    if (missing.length) process.exitCode = 1;
} finally {
    await context.close();
    fs.rmSync(workDir, { recursive: true, force: true });
}
