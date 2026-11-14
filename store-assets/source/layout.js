// Lays out one store image: builds the browser window, sizes the popup capture at
// UI_SCALE, places the popup under the toolbar button, and draws callouts to the
// elements recorded in ../raw-ui/chrome/<locale>/rects.js. Ported from Free Game
// Claimer's store-assets/source/layout.js. ?locale=<name> (tools/render.mjs always
// passes it) picks the captures; for a locale other than English, render.mjs hands
// over the captions from source/i18n/<name>.json in window.STORE_I18N, plus the tab
// title. A headline or subline that would wrap shrinks until it fits one line.
// A browser frame with no data-url shows a neutral new tab: an empty address bar
// with a search icon, so no site or brand appears in the frame (see README).
// Sets body[data-ready] to "1" when done, or to an error message (render.mjs fails on that).
(() => {
    const UI_SCALE = 1.05;        // popup CSS px -> image px
    const CAPTURE_SCALE = 2;      // captures are taken at 2x
    const LABEL_GAP = 64;         // popup edge to the callout labels
    const LABEL_SPACING = 16;     // minimum gap between two labels
    const POPUP_INSET = 12;       // popup right edge past the toolbar button's right edge
    const ANCHOR_X = 6;           // leaders end in the popup's left margin (popup CSS px), crossing no text
    const VISIBLE_MARGIN = 10;    // a dot stays this far above the image's bottom edge
    const LABEL_MARGIN = 16;      // and a label this far
    const LOCALE = new URLSearchParams(location.search).get("locale") || "en";
    const UI_DIR = `../raw-ui/chrome/${LOCALE}/`;
    const MIN_HEADLINE_PX = 36;   // a headline that would wrap shrinks to one line, not below this
    const MIN_SUBLINE_PX = 17;

    const ICONS = {
        back: '<path d="M15 5l-7 7 7 7"/>',
        forward: '<path d="M9 5l7 7-7 7"/>',
        reload: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4.5H15"/>',
        lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
        globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17"/>',
        search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
        menu: '<circle cx="12" cy="5.5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="18.5" r="1.3"/>',
    };
    const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
    const fail = (message) => { document.body.dataset.ready = `error: ${message}`; };

    function buildBrowser(el) {
        const isOpen = document.querySelector(".popup") ? " is-open" : "";
        el.insertAdjacentHTML("afterbegin", `
            <div class="tabstrip"><span class="lights"><i></i><i></i><i></i></span>
                <span class="tab">${icon("globe")}<span>${el.dataset.tab}</span></span></div>
            <div class="toolbar">${icon("back")}${icon("forward")}${icon("reload")}
                <span class="url">${el.dataset.url ? `${icon("lock")}<span>${el.dataset.url}</span>` : icon("search")}</span>
                <span class="ext-button${isOpen}"><img src="icon.png" alt=""></span>${icon("menu")}</div>
            <div class="page"><div class="page-head"></div>${'<div class="page-tile"></div>'.repeat(9)}</div>`);
    }

    function placePopup() {
        const popup = document.querySelector(".popup");
        const toolbar = document.querySelector(".toolbar");
        if (!popup || !toolbar) return;
        const button = document.querySelector(".ext-button").getBoundingClientRect();
        popup.style.left = `${button.right + POPUP_INSET - popup.offsetWidth}px`;
        popup.style.top = `${toolbar.getBoundingClientRect().bottom + 3}px`;
    }

    function sizeCaptures(images) {
        images.forEach((img) => {
            img.style.width = `${(img.naturalWidth / CAPTURE_SCALE) * UI_SCALE}px`;
        });
    }

    function leaderPath(labelRight, labelY, anchorX, anchorY) {
        if (Math.abs(labelY - anchorY) < 1) return `M${labelRight},${labelY} H${anchorX}`;
        const bendX = labelRight + 22;
        return `M${labelRight},${labelY} H${bendX} V${anchorY} H${anchorX}`;
    }

    // Labels sit left of the popup, each level with its element unless that would
    // overlap the label above; the leader then bends down to the element's row, and
    // ends in the popup's margin rather than running across its text.
    // A translation can push an element lower than in English, near or past the
    // image's bottom edge: the dot then goes to the middle of the part still in the
    // image, and the labels move up (with the ones above them) to stay inside it.
    // English images have nothing that low, so they come out as before.
    function drawCallouts() {
        const popup = document.querySelector(".popup");
        const callouts = [...document.querySelectorAll(".callout")];
        if (!popup || !callouts.length) return;
        const rects = (window.RECTS || {})[popup.dataset.ui];
        if (!rects) throw new Error(`no rects for ${popup.dataset.ui}`);
        const box = popup.getBoundingClientRect();
        const shot = document.querySelector(".shot").getBoundingClientRect();
        const visibleBottom = shot.bottom - VISIBLE_MARGIN;
        const labelBottom = shot.bottom - LABEL_MARGIN;
        const svg = document.querySelector(".leaders");
        const items = callouts.map((el) => {
            const r = rects[el.dataset.target];
            if (!r) throw new Error(`no rect for ${el.dataset.target}`);
            const top = box.top + r.y * UI_SCALE;
            const bottom = top + r.h * UI_SCALE;
            return { el, x: box.left + ANCHOR_X * UI_SCALE, y: (top + Math.min(bottom, visibleBottom)) / 2, h: el.offsetHeight };
        }).sort((a, b) => a.y - b.y);

        let previousBottom = -Infinity;
        for (const item of items) {
            item.labelY = Math.max(item.y, previousBottom + LABEL_SPACING + item.h / 2);
            previousBottom = item.labelY + item.h / 2;
        }
        let nextTop = labelBottom + LABEL_SPACING;
        for (const item of [...items].reverse()) {
            item.labelY = Math.min(item.labelY, nextTop - LABEL_SPACING - item.h / 2);
            nextTop = item.labelY - item.h / 2;
        }

        const labelRight = box.left - LABEL_GAP;
        for (const item of items) {
            item.el.style.left = `${labelRight - item.el.offsetWidth}px`;
            item.el.style.top = `${item.labelY - item.h / 2}px`;
            const d = leaderPath(labelRight, item.labelY, item.x, item.y);
            svg.insertAdjacentHTML("beforeend",
                `<path class="halo" d="${d}"/><path class="line" d="${d}"/><circle cx="${item.x}" cy="${item.y}" r="5"/>`);
        }
    }

    // The locale's captions and tab title replace the English ones in the page.
    function applyCaptions() {
        const i18n = window.STORE_I18N;
        if (!i18n) throw new Error(`nothing for ${LOCALE}: render it with tools/render.mjs --locale ${LOCALE}`);
        document.documentElement.lang = i18n.lang;
        if (i18n.tab) document.querySelector(".browser").dataset.tab = i18n.tab;
        if (!i18n.captions) return; // English: the page's own text
        const { h, s, c } = i18n.captions;
        const callouts = [...document.querySelectorAll(".callout")];
        if (callouts.length !== c.length) throw new Error(`${callouts.length} callouts in the page, ${c.length} captions`);
        document.title = h;
        document.querySelector(".caption h1").textContent = h;
        document.querySelector(".caption p").textContent = s;
        callouts.forEach((el, i) => { el.textContent = c[i]; });
    }

    // Shrinks a caption line in 0.5px steps until it fits the caption's width on one line.
    function fitOneLine(el, minPx) {
        const max = parseFloat(getComputedStyle(el.parentElement).maxWidth);
        el.style.whiteSpace = "nowrap";
        const start = parseFloat(getComputedStyle(el).fontSize);
        let size = start;
        while (el.scrollWidth > max + 0.5 && size > minPx) {
            size -= 0.5;
            el.style.fontSize = `${size}px`;
        }
        if (el.scrollWidth > max + 0.5) throw new Error(`"${el.textContent}" doesn't fit one line even at ${minPx}px: shorten it`);
        return size === start ? null : `${start}px -> ${size}px`;
    }

    function fitCaptions() {
        const shrunk = {
            headline: fitOneLine(document.querySelector(".caption h1"), MIN_HEADLINE_PX),
            subline: fitOneLine(document.querySelector(".caption p"), MIN_SUBLINE_PX),
        };
        document.body.dataset.shrunk = JSON.stringify(shrunk);
    }

    function start() {
        try {
            applyCaptions();
        } catch (e) {
            fail(e.message);
            return;
        }
        document.querySelectorAll(".browser").forEach(buildBrowser);
        const images = [...document.querySelectorAll("img[data-ui]")];
        images.forEach((img) => { img.src = UI_DIR + img.dataset.ui; });
        const script = document.createElement("script");
        script.src = `${UI_DIR}rects.js`;
        script.onerror = () => fail(`${UI_DIR}rects.js missing: run tools/capture.mjs --locale ${LOCALE} first`);
        // Lay out now, so the fonts the captions need are already loading when
        // fonts.ready is read.
        void document.body.offsetHeight;
        script.onload = () => Promise.all([...[...document.images].map((img) => img.decode()), document.fonts.ready])
            .then(() => {
                if (!document.fonts.check('700 46px "Mona Sans"')) throw new Error("Mona Sans not loaded");
                fitCaptions();
                sizeCaptures(images);
                placePopup();
                drawCallouts();
                document.body.dataset.ready = "1";
            })
            .catch((e) => fail(e.message));
        document.head.append(script);
    }

    document.addEventListener("DOMContentLoaded", start);
})();
