chrome.runtime.onInstalled.addListener(function () {
    chrome.storage.sync.set({ "active": true });
    chrome.tabs.create({ url: "https://www.bing.com", active: true });
});
// on startup, check if user has already clicked the checkbox
chrome.runtime.onStartup.addListener(function () {
    chrome.storage.sync.get("active", function (result) {
        chrome.action.setIcon({ path: "imgs/logo.png" });
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
//opens 10 tabs with bing search
function popupBg() {
    changeIconToActive();
    var format = "https://www.bing.com/search?q=";
    var searches = ["weather", "sport", "news", "stocks", "movies", "music", "games", "maps", "travel", "restaurants"];
    var _loop_1 = function (i) {
        var url = format + searches[i];
        setTimeout(function () {
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
        }, 100);
    };
    for (var i = 0; i < searches.length; i++) {
        _loop_1(i);
    }
}
//check if user has already opened tabs today
function checkLastOpened() {
    var today = new Date().toLocaleDateString();
    chrome.storage.sync.get("lastOpened", function (result) {
        if (result.lastOpened === today) {
            changeIconToActive();
        }
        else {
            popupBg();
            chrome.storage.sync.set({ "lastOpened": today });
        }
    });
}
//wait 0.1 second before closing tab
function waitAndClose(id) {
    setTimeout(function () {
        chrome.tabs.remove(id);
    }, 100);
}
function changeIconToActive() {
    chrome.action.setIcon({ path: "imgs/logoActive.png" });
}
