//opens 10 tabs with bing searches
function popup() {
    var format = "https://www.bing.com/search?q=";
    var searches = ["weather", "sport", "news", "stocks", "movies", "music", "games", "maps", "travel", "restaurants", "nba", "world cup"];
    for (var i = 0; i < searches.length; i++) {
        var url = format + searches[i];
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
var active = false;
//wait for popup to load before adding event listeners
document.addEventListener('DOMContentLoaded', function () {
    var autoBool = document.getElementById("autoCheckbox");
    var button = document.getElementById("button");
    if (button) {
        button.addEventListener("click", function () {
            popup();
        });
    }
    //check if user has already clicked the checkbox
    if (autoBool) {
        chrome.storage.sync.get("active", function (result) {
            if (result.active === true) {
                active = true;
                autoBool.checked = active;
            }
        });
        autoBool.addEventListener("click", function () {
            active = autoBool.checked;
            chrome.storage.sync.set({ "active": active });
            if (active) {
                checkLastOpened();
            }
        });
    }
});
//check if user has already opened tabs today
function checkLastOpened() {
    console.log("checking...");
    var today = new Date().toLocaleDateString();
    chrome.storage.sync.get("lastOpened", function (result) {
        if (result.lastOpened === today) {
            console.log("already opened today");
        }
        else {
            popup();
            chrome.storage.sync.set({ "lastOpened": today });
        }
    });
}
//listen for message from background.ts
chrome.runtime.onMessage.addListener(function (message) {
    if (message.active === true) {
        checkLastOpened();
    }
});
//wait 1 second before closing tab
function waitAndClose(id) {
    console.log("waitAndClose");
    setTimeout(function () {
        chrome.tabs.remove(id);
    }, 1000);
}
