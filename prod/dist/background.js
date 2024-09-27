"use strict";

// Constants
const WEBSITE_URL = "https://spin311.github.io/MicrosoftRewardsWebsite/";
const BING_SEARCH_URL = "https://www.bing.com/search?q=";
const BING_SEARCH_PARAMS = "&qs=n&form=QBLH&sp=-1&pq=";
const DEFAULT_SEARCHES = 10;
const DEFAULT_TIMEOUT = 7;
const DEFAULT_CLOSE_TIME = 2;

// Event Listeners
chrome.runtime.onInstalled.addListener(handleInstallOrUpdate);
chrome.runtime.onStartup.addListener(checkActiveStatus);
chrome.runtime.onMessage.addListener(handleMessage);

// Event Handlers
function handleInstallOrUpdate(details) {
    if (details.reason === "install" || details.reason === "update") {
        chrome.storage.sync.set({
            active: true,
            timeout: DEFAULT_TIMEOUT,
            searches: DEFAULT_SEARCHES,
            closeTime: DEFAULT_CLOSE_TIME
        });
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
    }
}

// Main Functions
function popupBg() {
    chrome.storage.sync.get(["searches", "timeout", "closeTime"], (results) => {
        const searchTimeout = parseInt(results.timeout) || DEFAULT_TIMEOUT;
        const searches = parseInt(results.searches) || DEFAULT_SEARCHES;
        const closeTime = parseInt(results.closeTime) || DEFAULT_CLOSE_TIME;
        createTabs(searchTimeout, searches, closeTime);
    });
}

async function createTabs(searchTimeout, searches, closeTime) {
    for (let i = 0; i < searches; i++) {
        const randomString = Math.random().toString(36).substring(2, 7);
        const url = `${BING_SEARCH_URL}${randomString}${BING_SEARCH_PARAMS}`;
        openAndClose(url, closeTime);
        await delay(searchTimeout * 1000);
    }
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
    setTimeout(() => {
        chrome.tabs.get(id, () => {
            if (!chrome.runtime.lastError) {
                chrome.tabs.remove(id);
            }
        });
    }, timeout * 1000);
}

// Utility Functions
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}