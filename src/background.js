// on startup, check if user has already clicked the checkbox
chrome.runtime.onStartup.addListener(function () {
    console.log("startup");
    chrome.storage.sync.get("active", function (result) {
        if (result.active === true) {
            checkLastOpened();
        }
        else {
            console.log("not sending message");
        }
    });
});
chrome.runtime.onMessage.addListener(function (request) {
    if (request.action === "popup") {
        popupBg();
    }
    else if (request.action === "check") {
        checkLastOpened();
    }
});
function popupBg() {
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
        }, 200);
    };
    for (var i = 0; i < searches.length; i++) {
        _loop_1(i);
    }
}
//check if user has already opened tabs today
function checkLastOpened() {
    console.log("checking...");
    var today = new Date().toLocaleDateString();
    chrome.storage.sync.get("lastOpened", function (result) {
        if (result.lastOpened === today) {
            console.log("already opened today");
        }
        else {
            popupBg();
            chrome.storage.sync.set({ "lastOpened": today });
        }
    });
}
//wait 0.3 second before closing tab
function waitAndClose(id) {
    console.log("waitAndClose");
    setTimeout(function () {
        chrome.tabs.remove(id);
    }, 300);
}
