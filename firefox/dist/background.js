"use strict";

// Constants
const WEBSITE_URL = "https://svitspindler.com/microsoft-automatic-rewards";
const BING_SEARCH_URL = "https://www.bing.com/search?q=";
const BING_SEARCH_PARAMS = "&qs=n&form=QBLH&sp=-1&pq=";
const DEFAULT_SEARCHES = 12;
const DEFAULT_TIMEOUT = 20;
const DEFAULT_CLOSE_TIME = 2;

const words = ["methods"];

// Event Listeners
browser.runtime.onInstalled.addListener(handleInstallOrUpdate);
browser.runtime.onStartup.addListener(handleStartup);
browser.runtime.onMessage.addListener(handleMessage);
browser.alarms.onAlarm.addListener(handleAlarms);

async function handleAlarms(alarm) {
    if (alarm.name === 'openTabAlarm') {
        const results = await browser.storage.sync.get(["searches", "timeout", "closeTime", "useWords", "currentSearch"]);
        let searchTimeout = parseInt(results.timeout) ?? DEFAULT_TIMEOUT;
        const searches = parseInt(results.searches) ?? DEFAULT_SEARCHES;
        const closeTime = (parseInt(results.closeTime) ?? DEFAULT_CLOSE_TIME) * 1000;
        let currentSearch = parseInt(results.currentSearch) ?? searches;
        const useWords = results.useWords ?? true;

        await openTab(useWords, closeTime);
        currentSearch++;

        if (currentSearch < searches) {
            if (searchTimeout <= 1) searchTimeout = 1;
            const delayInMinutes = ((searchTimeout - 1) * 1000 + getRandomNumber(0, 2000)) / 60000;
            await browser.storage.sync.set({ currentSearch });
            await browser.alarms.create('openTabAlarm', { delayInMinutes });
        } else {
            await sendStopSearch();
        }
    }
}

// Event Handlers
async function handleInstallOrUpdate(details) {
    if (details.reason === "install") {
        await browser.storage.sync.set({
            active: true,
            timeout: DEFAULT_TIMEOUT,
            searches: DEFAULT_SEARCHES,
            closeTime: DEFAULT_CLOSE_TIME,
            useWords: true,
            isSearching: false,
            autoDaily: false
        });

        setTimeout(async () => {
            await browser.tabs.create({ url: WEBSITE_URL, active: true });
        }, 1000);
    }

    if (details.reason === "update") {
        await browser.browserAction.setBadgeText({ text: "New" });
        await browser.storage.sync.set({
            useWords: true,
            autoDaily: false
        });
    }
}

async function handleStartup() {
    await browser.browserAction.setBadgeBackgroundColor({ color: "#eacf73" });
    const result = await browser.storage.sync.get(["active", "autoDaily"]);

    if (result.active || result.autoDaily) {
        await checkLastOpened();
    }

    await browser.storage.sync.set({ isSearching: false });
}

async function handleMessage(request) {
    if (request.action === "popup") {
        await popupBg();
    } else if (request.action === "check") {
        await checkLastOpened();
    } else if (request.action === "stop") {
        await sendStopSearch();
    } else if (request.action === "closeBingTabs") {
        await closeBingTabs();
    }
}

async function openDailyRewards() {
    const tab = await browser.tabs.create({ url: "https://rewards.bing.com/", active: false });

    await new Promise((resolve) => {
        function checkTab(tabId, changeInfo) {
            if (tabId === tab.id && changeInfo.status === "complete") {
                browser.tabs.onUpdated.removeListener(checkTab);
                setTimeout(async () => {
                    try {
                        await browser.tabs.sendMessage(tab.id, { action: "openDaily" });
                    } catch (error) {}
                    resolve();
                }, 300);
            }
        }
        browser.tabs.onUpdated.addListener(checkTab);
    });

    setTimeout(async () => {
        try {
            await browser.tabs.remove(tab.id);
        } catch (error) {}
    }, 10000);
}

async function closeBingTabs() {
    const tabs = await browser.tabs.query({ url: "https://www.bing.com/search*" });
    const filteredTabs = tabs.filter(tab => tab.url.includes("&rnoreward"));

    for (const tab of filteredTabs) {
        if (tab.id) {
            await browser.tabs.remove(tab.id);
            await delay(100 + getRandomNumber(0, 500));
        }
    }
}

// Main Functions
async function popupBg() {
    const results = await browser.storage.sync.get(["searches", "timeout", "closeTime", "useWords", "autoDaily", "active"]);
    const searchTimeout = parseInt(results.timeout) ?? DEFAULT_TIMEOUT;
    const searches = parseInt(results.searches) ?? DEFAULT_SEARCHES;
    const closeTime = parseInt(results.closeTime) ?? DEFAULT_CLOSE_TIME;
    const useWords = results.useWords ?? true;
    const autoDaily = results.autoDaily ?? false;
    const autoTabs = results.active ?? true;

    if (autoDaily) await openDailyRewards();
    if (autoTabs) await createTabs(searchTimeout, searches, closeTime, useWords);
}

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function getRandomElement(array) {
    return array[getRandomNumber(0, array.length - 1)];
}

async function sendStopSearch() {
    await browser.storage.sync.set({ isSearching: false });
    await browser.runtime.sendMessage({ action: "searchEnded" });
    await browser.alarms.clearAll();
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
    await openAndClose(url, closeTime + getRandomNumber(0, 1000));
}

async function createTabs(searchTimeout, searches, closeTime, useWords = true) {
    await browser.storage.sync.set({ isSearching: true, currentSearch: 0 });
    if (searchTimeout <= 1) searchTimeout = 1;
    await openTab(useWords, closeTime * 1000);
    const timeToWait = (searchTimeout - 1) * 1000 + getRandomNumber(0, 2000);
    await browser.alarms.create('openTabAlarm', { delayInMinutes: timeToWait / 60000 });
}

async function openAndClose(url, closeTime) {
    const tab = await browser.tabs.create({ url, active: false });
    const idCurr = tab.id;

    await new Promise((resolve) => {
        function listener(tabId, changeInfo) {
            if (tabId === idCurr && changeInfo.status === "complete") {
                browser.tabs.onUpdated.removeListener(listener);
                resolve();
            }
        }
        browser.tabs.onUpdated.addListener(listener);
    });

    await waitAndClose(idCurr, closeTime);
}

async function checkLastOpened() {
    const today = new Date().toLocaleDateString();
    const result = await browser.storage.sync.get("lastOpened");

    if (result.lastOpened !== today) {
        await popupBg();
        await browser.storage.sync.set({ lastOpened: today });
    }
}

function waitAndClose(id, timeout = DEFAULT_CLOSE_TIME * 1000) {
    return new Promise(resolve => {
        setTimeout(async () => {
            try {
                await browser.tabs.remove(id);
            } catch (error) {}
            resolve();
        }, timeout);
    });
}

// Utility Functions
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}