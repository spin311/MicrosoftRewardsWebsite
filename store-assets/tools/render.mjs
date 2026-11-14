// Renders the store screenshots (source/screenshot-*.html) for a locale at 1280x800,
// from the captures in raw-ui/chrome/<name>/ (tools/capture.mjs), as 24-bit RGB PNGs
// with no alpha (finalize.py) in chrome/<name>/.
//   node tools/render.mjs [--locale <name>|all]      (from store-assets/; or STORE_LOCALE)
// Default en. Captions for other locales come from source/i18n/<name>.json, the tab
// title from locales.json; locales under "copies" there (es_419) are copied from
// theirs (es) after it renders. A render fails if a callout label leaves the image or
// overlaps the popup or another label, or if the frame or captions name Microsoft or
// Bing (see README, "Trademark rules").
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const ROOT = path.join(import.meta.dirname, "..");
const SOURCE_DIR = path.join(ROOT, "source");
const I18N_DIR = path.join(SOURCE_DIR, "i18n");
const CONFIG = JSON.parse(fs.readFileSync(path.join(I18N_DIR, "locales.json"), "utf8"));
const PAGES = fs.readdirSync(SOURCE_DIR).filter((file) => /^screenshot-.*\.html$/.test(file)).sort();
const FORBIDDEN = /microsoft|bing|msn\.com|live\.com/i;

const i = process.argv.indexOf("--locale");
if (i >= 0 && !process.argv[i + 1]) throw new Error("--locale needs a name or all");
const requested = (i >= 0 ? process.argv[i + 1] : process.env.STORE_LOCALE) || "en";
const names = requested === "all" ? Object.keys(CONFIG.locales) : [requested];
for (const name of names) {
    if (!CONFIG.locales[name]) throw new Error(`unknown locale ${name}; source/i18n/locales.json has ${Object.keys(CONFIG.locales).join(", ")}`);
}

// In the page: what breaks the rules for callouts and the trademark rules.
function problems(forbidden) {
    const box = (el) => el.getBoundingClientRect();
    const shot = box(document.querySelector(".shot"));
    const popup = box(document.querySelector(".popup"));
    const overlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const labels = [...document.querySelectorAll(".callout")].map((el) => ({ text: el.textContent, r: box(el) }));
    const found = [];
    labels.forEach((l, n) => {
        if (l.r.left < shot.left || l.r.right > shot.right || l.r.top < shot.top || l.r.bottom > shot.bottom) found.push(`"${l.text}" leaves the image`);
        if (overlap(l.r, popup)) found.push(`"${l.text}" overlaps the popup`);
        for (const m of labels.slice(n + 1)) if (overlap(l.r, m.r)) found.push(`"${l.text}" overlaps "${m.text}"`);
    });
    const text = `${document.title}\n${document.querySelector(".shot").innerText}`;
    if (new RegExp(forbidden, "i").test(text)) found.push("the frame or captions name Microsoft or Bing");
    return found;
}

async function renderPage(browser, file, name, tmpDir) {
    const locale = CONFIG.locales[name];
    const key = file.replace(/\.html$/, "");
    let captions = null;
    if (name !== "en") {
        captions = JSON.parse(fs.readFileSync(path.join(I18N_DIR, `${name}.json`), "utf8"))[key];
        if (!captions) throw new Error(`source/i18n/${name}.json has no captions for ${key}`);
    }
    const page = await browser.newPage({ viewport: { width: 1400, height: 800 }, deviceScaleFactor: 1 });
    await page.addInitScript((value) => { window.STORE_I18N = value; }, { lang: locale.tag, tab: locale.newTab, captions });
    await page.goto(`file://${path.join(SOURCE_DIR, file)}?locale=${name}`);
    await page.waitForFunction(() => document.body.dataset.ready, null, { timeout: 30_000 });
    const ready = await page.evaluate(() => document.body.dataset.ready);
    if (ready !== "1") throw new Error(`${file} (${name}): ${ready}`);
    const found = await page.evaluate(problems, FORBIDDEN.source);
    if (found.length) throw new Error(`${file} (${name}): ${found.join("; ")}`);
    const shrunk = Object.entries(JSON.parse(await page.evaluate(() => document.body.dataset.shrunk ?? "{}")))
        .filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(", ");
    const root = page.locator(".shot");
    const out = path.join(tmpDir, `${key}.png`);
    await root.screenshot({ path: out });
    await page.close();
    console.log(`${name} ${key}${shrunk ? `: shrunk ${shrunk}` : ""}`);
}

const browser = await chromium.launch();
try {
    for (const name of names) {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `msr-render-${name}-`));
        for (const file of PAGES) await renderPage(browser, file, name, tmpDir);
        const outDir = path.join(ROOT, "chrome", name);
        fs.rmSync(outDir, { recursive: true, force: true });
        fs.mkdirSync(outDir, { recursive: true });
        execFileSync("python3", ["-I", path.join(import.meta.dirname, "finalize.py"), tmpDir, outDir], { stdio: "inherit" });
        fs.rmSync(tmpDir, { recursive: true, force: true });
        for (const [copy, from] of Object.entries(CONFIG.copies ?? {})) {
            if (from !== name) continue;
            fs.rmSync(path.join(ROOT, "chrome", copy), { recursive: true, force: true });
            fs.cpSync(outDir, path.join(ROOT, "chrome", copy), { recursive: true });
            console.log(`copied chrome/${name}/ to chrome/${copy}/`);
        }
    }
} finally {
    await browser.close();
}
