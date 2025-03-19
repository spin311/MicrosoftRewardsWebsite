"use strict";

// Constants
const WEBSITE_URL = "https://spin311.github.io/MicrosoftRewardsWebsite/";
const BING_SEARCH_URL = "https://www.bing.com/search?q=";
const BING_SEARCH_PARAMS = "&qs=n&form=QBLH&sp=-1&pq=";
const DEFAULT_SEARCHES = 10;
const DEFAULT_TIMEOUT = 7;
const DEFAULT_CLOSE_TIME = 2;
let shouldStop = false;

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
    "therapy", "birthday", "wedding", "graduation", "anniversary", "holiday", "festival", "concert"
];

const words2 = ["near", "google", "where", "how", "what", "can", "best", "cheapest", "top", "top10",
    "find", "search", "locate", "discover", "explore", "lookup", "seek", "identify", "track", "uncover",
    "nearby", "closest", "guide", "tutorial", "review", "comparison", "versus", "information",
    "directions", "recommendations", "alternatives", "solutions", "help", "advice", "instructions",
    "tips", "examples", "resources", "techniques", "methods"
];
// Event Listeners
chrome.runtime.onInstalled.addListener(handleInstallOrUpdate);
chrome.runtime.onStartup.addListener(checkActiveStatus);
chrome.runtime.onMessage.addListener(handleMessage);

// Event Handlers
function handleInstallOrUpdate(details) {
    if (details.reason === "install") {
        chrome.storage.sync.set({
            active: true,
            timeout: DEFAULT_TIMEOUT,
            searches: DEFAULT_SEARCHES,
            closeTime: DEFAULT_CLOSE_TIME,
            useWords: true
        });
        if (details.reason === "update") {
            chrome.storage.sync.set({
                useWords: true
            });
        }
        setTimeout(() => {
            chrome.tabs.create({ url: WEBSITE_URL, active: true });
        }, 1000);
    }
}

function checkActiveStatus() {
    chrome.storage.sync.get("active", (result) => {
        if (result.active) {
            checkLastOpened();
        }
    });
}

function handleMessage(request) {
    if (request.action === "popup") {
        popupBg();
    } else if (request.action === "check") {
        checkLastOpened();
    } else if (request.action === "stop") {
        shouldStop = true;
    }
}

// Main Functions
function popupBg() {
    shouldStop = false;
    chrome.storage.sync.get(["searches", "timeout", "closeTime", "useWords"], (results) => {
        const searchTimeout = parseInt(results.timeout) ?? DEFAULT_TIMEOUT;
        const searches = parseInt(results.searches) ?? DEFAULT_SEARCHES;
        const closeTime = parseInt(results.closeTime) ?? DEFAULT_CLOSE_TIME;
        const useWords = results.useWords ?? true;
        createTabs(searchTimeout, searches, closeTime, useWords);
    });
}

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function getRandomElement(array) {
    return array[getRandomNumber(0, array.length - 1)];
}

async function createTabs(searchTimeout, searches, closeTime, useWords = true) {
    if (searchTimeout <= 0) searchTimeout = 0.5;
    for (let i = 0; i < searches; i++) {
        if (shouldStop) {
            shouldStop = false;
            break;
        }
        let randomString;
        if (useWords) {
            const word1 = getRandomElement(words);
            const word2 = getRandomElement(words2);
            const randomChar = Math.random().toString(36).substring(2, 3);
            randomString = `${word1} ${word2}${randomChar}`;
        }
        else {
            randomString = Math.random().toString(36).substring(2, 7);
        }
        const url = `${BING_SEARCH_URL}${randomString}${BING_SEARCH_PARAMS}`;
        openAndClose(url, closeTime);
        await delay((searchTimeout - 0.5) * 1000 + getRandomNumber(0, 1000));
    }
    chrome.runtime.sendMessage({ action: "searchEnded" });
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

function waitAndClose(id, timeout = DEFAULT_CLOSE_TIME) {
    if (timeout <= 0) timeout = 0.5;
    setTimeout(() => {
        chrome.tabs.get(id, () => {
            if (!chrome.runtime.lastError) {
                chrome.tabs.remove(id);
            }
        });
    }, (timeout - 0.5) * 1000 + getRandomNumber(0, 1000));
}

// Utility Functions
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}