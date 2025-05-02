"use strict";

// Constants
const WEBSITE_URL = "https://svitspindler.com/microsoft-automatic-rewards";
const BING_SEARCH_URL = "https://www.bing.com/search?q=";
const BING_SEARCH_PARAMS = "&qs=n&form=QBLH&sp=-1&pq=";
const DEFAULT_SEARCHES = 12;
const DEFAULT_TIMEOUT = 20;
const DEFAULT_CLOSE_TIME = 2;

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
chrome.runtime.onInstalled.addListener(handleInstallOrUpdate);
chrome.runtime.onStartup.addListener(handleStartup);
chrome.runtime.onMessage.addListener(handleMessage);

chrome.alarms.onAlarm.addListener(handleAlarms);

function handleAlarms(alarm) {
    if (alarm.name === 'openTabAlarm') {
        chrome.storage.sync.get(["searches", "timeout", "closeTime", "useWords", 'currentSearch'], (results) => {
            let searchTimeout = parseInt(results.timeout) ?? DEFAULT_TIMEOUT;
            const searches = parseInt(results.searches) ?? DEFAULT_SEARCHES;
            const closeTime = (parseInt(results.closeTime) ?? DEFAULT_CLOSE_TIME) * 1000;
            let currentSearch = parseInt(results.currentSearch) ?? searches;
            const useWords = results.useWords ?? true;
            openTab(useWords, closeTime);
            currentSearch++;
            if (currentSearch < searches) {
                if (searchTimeout <= 1) searchTimeout = 1;
                const delayInMinutes = ((searchTimeout - 1) * 1000 + getRandomNumber(0, 2000)) / 60000;
                chrome.storage.sync.set({ currentSearch });
                chrome.alarms.create('openTabAlarm', { delayInMinutes });

            } else {
                sendStopSearch();
            }
        });
    }

}

// Event Handlers
function handleInstallOrUpdate(details) {
    if (details.reason === "install") {
        chrome.storage.sync.set({
            active: true,
            timeout: DEFAULT_TIMEOUT,
            searches: DEFAULT_SEARCHES,
            closeTime: DEFAULT_CLOSE_TIME,
            useWords: true,
            isSearching: false,
            autoDaily: false
        });
        if (details.reason === "update") {
            chrome.action.setBadgeText({text: "New"});
            chrome.storage.sync.set({
                useWords: true,
                autoDaily: false
            });
        }
        setTimeout(() => {
            chrome.tabs.create({ url: WEBSITE_URL, active: true });
        }, 1000);
    }
}

function handleStartup() {
    chrome.action.setBadgeBackgroundColor({ color: "#eacf73" });
    chrome.storage.sync.get(["active", "autoDaily"], (result) => {
        if (result.active || result.autoDaily) {
            checkLastOpened();
        }
    });
    chrome.storage.sync.set({ isSearching: false });
}

function handleMessage(request) {
    if (request.action === "popup") {
        popupBg();
    } else if (request.action === "check") {
        checkLastOpened();
    } else if (request.action === "stop") {
        sendStopSearch();
    } else if (request.action === "closeBingTabs") {
        closeBingTabs();
    }
}

async function openDailyRewards() {
    const tab = await chrome.tabs.create({ url: "https://rewards.bing.com/", active: false });

    // Wait for the tab to load completely before sending message
    new Promise((resolve) => {
        function checkTab(tabId, changeInfo) {
            if (tabId === tab.id && changeInfo.status === "complete") {
                chrome.tabs.onUpdated.removeListener(checkTab);
                setTimeout(() => {
                    chrome.tabs.sendMessage(tab.id, {action: "openDaily"});
                    resolve();
                }, 300);
            }
        }
        chrome.tabs.onUpdated.addListener(checkTab);
    });
    setTimeout(() => chrome.tabs.remove(tab.id), 10000);
}

async function closeBingTabs() {
    const tabs = await chrome.tabs.query({url: "https://www.bing.com/search*"});
    const filteredTabs = tabs.filter(tab => tab.url.includes("&rnoreward"));
    for (const tab of filteredTabs) {
        if (tab.id) {
            await chrome.tabs.remove(tab.id);
            await delay(100 + getRandomNumber(0, 500));
        }
    }
}

// Main Functions
function popupBg() {
    chrome.storage.sync.get(["searches", "timeout", "closeTime", "useWords", "autoDaily", "active"], (results) => {
        const searchTimeout = parseInt(results.timeout) ?? DEFAULT_TIMEOUT;
        const searches = parseInt(results.searches) ?? DEFAULT_SEARCHES;
        const closeTime = parseInt(results.closeTime) ?? DEFAULT_CLOSE_TIME;
        const useWords = results.useWords ?? true;
        const autoDaily = results.autoDaily ?? true;
        const autoTabs = results.active ?? true;
        if (autoDaily) openDailyRewards();
        if (autoTabs) createTabs(searchTimeout, searches, closeTime, useWords);
    });
}

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function getRandomElement(array) {
    return array[getRandomNumber(0, array.length - 1)];
}

function sendStopSearch() {
    chrome.storage.sync.set({isSearching: false});
    chrome.runtime.sendMessage({action: "searchEnded"});
    chrome.alarms.clearAll();
}

async function openTab(useWords, closeTime) {
    let randomString = '';
    if (useWords) {
        const numberOfWords = getRandomNumber(2, 4);
        for (let i = 0; i < numberOfWords; i++) {
            randomString += `${getRandomElement(words)} `;
        }
    } else {
        randomString = Math.random().toString(36).substring(2, getRandomNumber(5, 8));
    }
    const randomChar = Math.random().toString(36).substring(2, 3);
    randomString = `${randomChar}${randomString}`;
    const url = `${BING_SEARCH_URL}${randomString}${BING_SEARCH_PARAMS}`;
    openAndClose(url, closeTime + getRandomNumber(0, 1000));
}

async function createTabs(searchTimeout, searches, closeTime, useWords = true) {
    await chrome.storage.sync.set({ isSearching: true, currentSearch: 0 });
    if (searchTimeout <= 1) searchTimeout = 1;
    await openTab(useWords, closeTime * 1000);
    const timeToWait =  (searchTimeout - 1) * 1000 + getRandomNumber(0, 2000);
    chrome.alarms.create('openTabAlarm', { delayInMinutes: timeToWait / 60000 });
}

function openAndClose(url, closeTime) {
    chrome.tabs.create({ url, active: false }, (tab) => {
        const idCurr = tab.id;
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
            if (tabId === idCurr && changeInfo.status === "complete") {
                chrome.tabs.onUpdated.removeListener(listener);
                waitAndClose(idCurr, closeTime);
            }
        });
    });
}

function checkLastOpened() {
    const today = new Date().toLocaleDateString();
    chrome.storage.sync.get("lastOpened", (result) => {
        if (result.lastOpened !== today) {
            popupBg();
            chrome.storage.sync.set({ lastOpened: today });
        }
    });
}

function waitAndClose(id, timeout = DEFAULT_CLOSE_TIME * 1000) {
    if (timeout <= 0) timeout = 500;
    setTimeout(() => {
        chrome.tabs.get(id, () => {
            if (!chrome.runtime.lastError) {
                chrome.tabs.remove(id);
            }
        });
    }, (timeout - 500)  + getRandomNumber(0, 1000));
}

// Utility Functions
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}