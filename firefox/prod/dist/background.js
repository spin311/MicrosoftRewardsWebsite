// background.js (Firefox MV2 WebExtension)
'use strict';

// Constants
const WEBSITE_URL = 'https://svitspindler.com/microsoft-automatic-rewards';
const BING_SEARCH_URL = 'https://www.bing.com/search?q=';
const BING_SEARCH_PARAMS = '&qs=n&form=QBLH&sp=-1&pq=';
const DEFAULT_SEARCHES = 12;
const DEFAULT_TIMEOUT = 60;
const DEFAULT_CLOSE_TIME = 5;

const words = [ /* same word list as chrome version */ ];

// Event Listeners
browser.runtime.onInstalled.addListener(handleInstallOrUpdate);
browser.runtime.onStartup.addListener(handleStartup);
browser.runtime.onMessage.addListener(handleMessage);
browser.alarms.onAlarm.addListener(handleAlarms);

async function handleAlarms(alarm) {
    if (alarm.name === 'openTabAlarm') {
        const results = await browser.storage.sync.get(['searches','timeout','closeTime','useWords','currentSearch']);
        let searchTimeout = parseInt(results.timeout) || DEFAULT_TIMEOUT;
        const searches = parseInt(results.searches) || DEFAULT_SEARCHES;
        const closeTimeMs = (parseInt(results.closeTime) || DEFAULT_CLOSE_TIME) * 1000;
        let currentSearch = parseInt(results.currentSearch) || searches;
        const useWords = results.useWords ?? true;

        await openTab(useWords, closeTimeMs);
        currentSearch++;

        if (currentSearch < searches) {
            if (searchTimeout <= 1) searchTimeout = 1;
            const delayMinutes = ((searchTimeout - 1) * 1000 + getRandomNumber(0,2000)) / 60000;
            await browser.storage.sync.set({ currentSearch });
            browser.alarms.create('openTabAlarm',{ delayInMinutes: delayMinutes });
        } else {
            sendStopSearch();
        }
    }
}

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
            `https://svitspindler.com/uninstall?extension=${encodeURI('Microsoft Automatic Rewards')}`
        );
        setTimeout(() => browser.tabs.create({ url: WEBSITE_URL, active: true }),1000);
    } else if (details.reason === 'update') {
        browser.browserAction.setBadgeText({ text: 'New' });
    }
}

async function handleStartup() {
    const result = await browser.storage.sync.get(['active','autoDaily']);
    if (result.active || result.autoDaily) checkLastOpened();
    await browser.storage.sync.set({ isSearching: false });
}

function handleMessage(request) {
    if (request.action === 'popup') popupBg(true);
    else if (request.action === 'check') checkLastOpened();
    else if (request.action === 'stop') sendStopSearch();
}

async function openDailyRewards() {
    const tab = await browser.tabs.create({ url: 'https://rewards.bing.com/', active: false });
    return new Promise(resolve => {
        function listener(tabId,changeInfo) {
            if (tabId===tab.id && changeInfo.status==='complete') {
                browser.tabs.onUpdated.removeListener(listener);
                setTimeout(() => {
                    browser.tabs.sendMessage(tab.id,{ action:'openDaily' });
                    resolve();
                },300);
            }
        }
        browser.tabs.onUpdated.addListener(listener);
        setTimeout(() => browser.tabs.remove(tab.id),10000);
    });
}

async function popupBg(manualCall=false) {
    const results = await browser.storage.sync.get(['searches','timeout','closeTime','useWords','autoDaily','active']);
    const searchTimeout = parseInt(results.timeout)||DEFAULT_TIMEOUT;
    const searches = parseInt(results.searches)||DEFAULT_SEARCHES;
    const closeTime = parseInt(results.closeTime)||DEFAULT_CLOSE_TIME;
    const useWords = results.useWords??true;
    const autoDaily = results.autoDaily??true;
    const autoTabs = results.active??true;

    if (autoDaily) await openDailyRewards();
    if ((manualCall||autoTabs)&&searches>0) createTabs(searchTimeout,searches,closeTime,useWords);
}

function getRandomNumber(min,max) {
    return Math.floor(Math.random()*(max-min+1)+min);
}

// Added missing helper to pick a random element
function getRandomElement(array) {
    return array[getRandomNumber(0, array.length - 1)];
}

async function sendStopSearch() {
    await browser.storage.sync.set({ isSearching: false });
    browser.runtime.sendMessage({ action: 'searchEnded' });
    browser.alarms.clearAll();
}

async function openTab(useWords, closeTime) {
    let randomString='';
    if (useWords) {
        const count = getRandomNumber(2,4);
        for (let i=0;i<count;i++) randomString+=`${getRandomElement(words)} `;
    } else {
        randomString=Math.random().toString(36).substring(2,getRandomNumber(5,8));
    }
    randomString=`${Math.random().toString(36).charAt(2)}${randomString}`;
    const url=`${BING_SEARCH_URL}${randomString}${BING_SEARCH_PARAMS}`;
    openAndClose(url, closeTime + getRandomNumber(0,1000));
}

async function createTabs(searchTimeout, searches, closeTime, useWords=true) {
    await browser.storage.sync.set({ isSearching: true, currentSearch: 0 });
    if (searchTimeout<=1) searchTimeout=1;
    await openTab(useWords, closeTime*1000);
    const delay=((searchTimeout-1)*1000 + getRandomNumber(0,2000))/60000;
    browser.alarms.create('openTabAlarm',{ delayInMinutes: delay });
}

function openAndClose(url, closeTime) {
    browser.tabs.create({ url, active: false }).then(tab => {
        const tabId=tab.id;
        function listener(updatedId,changeInfo) {
            if (updatedId===tabId&&changeInfo.status==='complete') {
                browser.tabs.onUpdated.removeListener(listener);
                waitAndClose(tabId, closeTime);
            }
        }
        browser.tabs.onUpdated.addListener(listener);
    });
}

async function checkLastOpened() {
    const today=new Date().toLocaleDateString();
    const result=await browser.storage.sync.get('lastOpened');
    if (result.lastOpened!==today) {
        popupBg();
        await browser.storage.sync.set({ lastOpened: today });
    }
}

function waitAndClose(id, timeout=DEFAULT_CLOSE_TIME*1000) {
    if (timeout<=0) timeout=500;
    setTimeout(() => {
        browser.tabs.get(id).then(() => browser.tabs.remove(id)).catch(()=>{});
    },(timeout-500)+getRandomNumber(0,1000));
}
