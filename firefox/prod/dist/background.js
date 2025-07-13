'use strict';

// Constants
const WEBSITE_URL = 'https://svitspindler.com/microsoft-automatic-rewards';
const BING_SEARCH_URL = 'https://www.bing.com/search?q=';
const BING_SEARCH_PARAMS = '&qs=n&form=QBLH&sp=-1&pq=';
const DEFAULT_SEARCHES = 12;
const DEFAULT_TIMEOUT = 60;
const DEFAULT_CLOSE_TIME = 5;

const words = [
    "food", "drink", "restaurant", "cafe", "bar", "pub", "club", "diner", "eatery", "tavern",
    "museum", "bistro", "buffet", "canteen", "coffeehouse", "grill", "inn", "joint", "kitchen",
    "lounge", "pizzeria", "saloon", "steakhouse", "tearoom", "trattoria", "brasserie", "brewery",
    "cafeteria", "chophouse", "gastropub", "roadhouse", "rotisserie", "smorgasbord", "soda",
    "soccer", "basketball", "baseball", "tennis", "cricket", "rugby", "golf", "hockey", "swimming",
    "running", "cycling", "skiing", "snowboarding", "skating", "surfing", "fishing", "hiking",
    "camping", "climbing", "dancing", "singing", "painting", "drawing", "sculpting", "photography",
    "writing", "reading", "knitting", "sewing", "gardening", "cooking", "baking", "gaming", "chess",
    "poker", "bridge", "scrabble", "monopoly", "puzzle", "crossword", "sudoku", "video games",
    "console", "PCgaming", "arcade", "VRgaming", "mobilegaming", "boardgames", "cardgames",
    "television", "computer", "smartphone", "laptop", "tablet", "camera", "headphones", "speaker",
    "monitor", "keyboard", "mouse", "printer", "router", "drone", "microphone", "beach", "mountain",
    "forest", "desert", "island", "ocean", "river", "lake", "park", "doctor", "teacher", "engineer",
    "programmer", "designer", "artist", "chef", "nurse", "architect", "scientist", "collecting",
    "woodworking", "origami", "pottery", "calligraphy", "jewelry", "metalwork", "glassblowing",
    "astronomy", "volunteering", "physics", "chemistry", "biology", "mathematics", "history",
    "geography", "literature", "language", "economics", "philosophy", "yoga", "meditation",
    "fitness", "nutrition", "mindfulness", "stretching", "massage", "aromatherapy", "pilates",
    "therapy", "birthday", "wedding", "graduation", "anniversary", "holiday", "festival", "concert",
    "near", "google", "where", "how", "what", "can", "best", "cheapest", "top", "top10",
    "find", "search", "locate", "discover", "explore", "lookup", "seek", "identify", "track", "uncover",
    "nearby", "closest", "guide", "tutorial", "review", "comparison", "versus", "information",
    "directions", "recommendations", "alternatives", "solutions", "help", "advice", "instructions",
    "tips", "examples", "resources", "techniques", "methods", "how to", "ways to", "places to", "things to do", "restaurants near me", "best time to",
    "cheap", "popular", "famous", "hidden gems", "activities", "events", "today", "tonight",
    "open now", "family friendly", "pet friendly", "with kids", "for couples", "solo travel",
    "budget travel", "luxury", "free", "local", "near me", "what is", "who is", "can I",
    "should I", "when to", "why is", "how much", "how long", "how far", "how many", "does",
    "is it safe", "easy", "quick", "simple", "step by step", "nearby attractions", "must see",
    "reviews", "testimonials", "rating", "map", "price", "schedule", "availability", "book now",
    "tickets", "opening hours", "closed", "weather", "forecast", "cheap flights", "best hotels",
    "cuisine", "menu", "food near me", "best place for", "best way to", "directions to", "get to",
    "how do I", "plan trip", "vacation ideas", "top rated", "most popular", "things to avoid",
    "tips for", "travel guide", "insider tips", "how it works", "learn about", "overview",
    "explained", "definition", "meaning", "origin", "background", "history of", "basics of",
    "beginner guide", "example of", "sample", "template", "walkthrough", "demo"
];

// Event Listeners
browser.runtime.onInstalled.addListener(handleInstallOrUpdate);
browser.runtime.onStartup.addListener(handleStartup);
browser.runtime.onMessage.addListener(handleMessage);
browser.alarms.onAlarm.addListener(handleAnyAlarm);

let pendingLoopState = null;

// Install & Update
async function handleInstallOrUpdate(details) {
    if (details.reason === 'install') {
        await browser.storage.sync.set({
            active: true,
            timeout: DEFAULT_TIMEOUT,
            searches: DEFAULT_SEARCHES,
            closeTime: DEFAULT_CLOSE_TIME,
            useWords: true,
            isSearching: false,
            autoDaily: false
        });
        await browser.runtime.setUninstallURL(
            `https://svitspindler.com/uninstall?extension=${encodeURI('Microsoft Automatic Rewards Firefox')}`
        );
        setTimeout(() => browser.tabs.create({ url: WEBSITE_URL, active: true }), 1000);
    } else if (details.reason === 'update') {
        browser.browserAction.setBadgeText({ text: 'New' });
    }
}

// Startup
async function handleStartup() {
    const result = await browser.storage.sync.get(['active', 'autoDaily']);
    if (result.active || result.autoDaily) checkLastOpened();
    await browser.storage.sync.set({ isSearching: false });
}

// Messages from popup/options
function handleMessage(request) {
    if (request.action === 'popup') popupBg(true);
    else if (request.action === 'check') void checkLastOpened();
    else if (request.action === 'stop') void sendStopSearch();
}

// Alarms
function handleAnyAlarm(alarm) {
    if (alarm.name === 'dailyCheck') void checkLastOpened();
    if (alarm.name === 'nextTabAlarm' && pendingLoopState) continueTabLoop();
}

// Main loop
async function createTabs(searchTimeout, searches, closeTime, useWords=true) {
    await browser.storage.sync.set({ isSearching: true, currentSearch: 0 });
    startTabLoop(searchTimeout, searches, closeTime, useWords, 0);
}

function startTabLoop(searchTimeout, searches, closeTime, useWords, currentSearch) {
    if (currentSearch >= searches) {
        void sendStopSearch();
        return;
    }

    openTab(useWords, closeTime * 1000).then(() => {
        currentSearch++;
        browser.storage.sync.set({ currentSearch });

        let nextDelayMs = (searchTimeout * 1000 - 1000) + getRandomNumber(0, 2000);
        if (nextDelayMs < 1000) nextDelayMs = 1000;

        if (nextDelayMs < 60000) {
            console.log(`Next tab in ${nextDelayMs} ms using setTimeout`);
            setTimeout(() => {
                startTabLoop(searchTimeout, searches, closeTime, useWords, currentSearch);
            }, nextDelayMs);
        } else {
            const delayInMinutes = Math.max(1, Math.round(nextDelayMs / 60000));
            console.log(`Next tab delayed by ${delayInMinutes} min using browser alarm`);
            pendingLoopState = { searchTimeout, searches, closeTime, useWords, currentSearch };
            browser.alarms.clear('nextTabAlarm').then(() => {
                browser.alarms.create('nextTabAlarm', { delayInMinutes });
            });
        }
    });
}

function continueTabLoop() {
    console.log('continueTabLoop triggered by alarm');
    if (!pendingLoopState) return;
    const { searchTimeout, searches, closeTime, useWords, currentSearch } = pendingLoopState;
    pendingLoopState = null;
    startTabLoop(searchTimeout, searches, closeTime, useWords, currentSearch);
}

// Popup triggers it
async function popupBg(manualCall=false) {
    const results = await browser.storage.sync.get(['searches','timeout','closeTime','useWords','autoDaily','active']);
    const searchTimeout = parseInt(results.timeout) || DEFAULT_TIMEOUT;
    const searches = parseInt(results.searches) || DEFAULT_SEARCHES;
    const closeTime = parseInt(results.closeTime) || DEFAULT_CLOSE_TIME;
    const useWords = results.useWords ?? true;
    const autoDaily = results.autoDaily ?? true;
    const autoTabs = results.active ?? true;

    if (autoDaily) await openDailyRewards();
    if ((manualCall || autoTabs) && searches > 0) void createTabs(searchTimeout, searches, closeTime, useWords);
}

// Open tabs
async function openDailyRewards() {
    const tab = await browser.tabs.create({ url: 'https://rewards.bing.com/', active: false });
    return new Promise(resolve => {
        function listener(tabId, changeInfo) {
            if (tabId === tab.id && changeInfo.status === 'complete') {
                browser.tabs.onUpdated.removeListener(listener);
                setTimeout(() => {
                    browser.tabs.sendMessage(tab.id, { action: 'openDaily' });
                    resolve();
                }, 300);
            }
        }
        browser.tabs.onUpdated.addListener(listener);
        setTimeout(() => browser.tabs.remove(tab.id), 10000);
    });
}

async function openTab(useWords, closeTime) {
    let randomString = '';
    if (useWords) {
        const count = getRandomNumber(2,4);
        for (let i=0;i<count;i++) randomString += `${getRandomElement(words)} `;
    } else {
        randomString = Math.random().toString(36).substring(2,getRandomNumber(5,8));
    }
    randomString = `${Math.random().toString(36).charAt(2)}${randomString}`;
    const url = `${BING_SEARCH_URL}${encodeURIComponent(randomString)}${BING_SEARCH_PARAMS}`;
    return openAndClose(url, closeTime + getRandomNumber(0,1000));
}

function openAndClose(url, closeTime) {
    return browser.tabs.create({ url, active: false }).then(tab => {
        const tabId = tab.id;
        function listener(updatedId, changeInfo) {
            if (updatedId === tabId && changeInfo.status === 'complete') {
                browser.tabs.onUpdated.removeListener(listener);
                waitAndClose(tabId, closeTime);
            }
        }
        browser.tabs.onUpdated.addListener(listener);
    });
}

function waitAndClose(id, timeout = DEFAULT_CLOSE_TIME * 1000) {
    if (timeout <= 0) timeout = 500;
    setTimeout(() => {
        browser.tabs.get(id).then(() => browser.tabs.remove(id)).catch(() => {});
    }, (timeout - 500) + getRandomNumber(0,1000));
}

async function sendStopSearch() {
    await browser.storage.sync.set({ isSearching: false });
    browser.runtime.sendMessage({ action: 'searchEnded' });
}

// Helpers
function getRandomNumber(min,max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
function getRandomElement(array) {
    return array[getRandomNumber(0, array.length - 1)];
}

// Daily alarm check
async function checkLastOpened() {
    const today = new Date().toLocaleDateString();
    const result = await browser.storage.sync.get('lastOpened');
    if (result.lastOpened !== today) {
        popupBg();
        await browser.storage.sync.set({ lastOpened: today });
    }
}

// Keep daily alarm
browser.alarms.create('dailyCheck', { periodInMinutes: 60 });
