chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === "install") {
        chrome.storage.sync.set({ "active": true });
        chrome.storage.sync.set({ "level": 1 });
        setTimeout(function () {
            chrome.tabs.create({ url: "https://spin311.github.io/MicrosoftRewardsWebsite/", active: true });
        }, 1000);
    }
});
// on startup, check if user has already clicked the checkboxx§
chrome.runtime.onStartup.addListener(function () {
    chrome.storage.sync.get("active", function (result) {
        if (result.active) {
            checkLastOpened();
        }
    });
});
//listen for messages from popup.ts
chrome.runtime.onMessage.addListener(function (request) {
    if (request.action === "popup") {
        popupBg();
    }
    else if (request.action === "check") {
        checkLastOpened();
    }
});
//opens 10 tabs with bing searches
function popupBg() {
    var format = "https://www.bing.com/search?q=";
    var format2 = "&qs=n&form=QBLH&sp=-1&pq=";
    var level = 1;
    chrome.storage.sync.get("level", function (result) {
        if (result.level > 1)
            level = 3;
        for (var xp = 0; xp < level; xp++) {
            var timeout = 1500 * xp;
            setTimeout(function () {
                for (var i = 0; i < 10; i++) {
                    var randomString = Math.random().toString(36).substring(2, 7);
                    var url = format + randomString + format2;
                    openAndClose(url);
                }
            }, timeout);
        }
    });
    function openAndClose(url) {
        chrome.tabs.create({
            url: url, active: false
        }, function (tab) {
            var idCurr = tab.id;
            //wait for tab to load before closing
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                if (tabId === idCurr && changeInfo.status === "complete") {
                    chrome.tabs.onUpdated.removeListener(listener);
                    waitAndClose(idCurr);
                }
            });
        });
    }
}
//check if user has already opened tabs today
function checkLastOpened() {
    var today = new Date().toLocaleDateString();
    chrome.storage.sync.get("lastOpened", function (result) {
        if (result.lastOpened !== today) {
            popupBg();
            chrome.storage.sync.set({ "lastOpened": today });
        }
    });
}
//wait 0.1 second before closing tab
function waitAndClose(id) {
    setTimeout(function () {
        chrome.tabs.remove(id);
    }, 5000);
}
