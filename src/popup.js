"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkLastOpened = void 0;
var background_1 = require("./background");
function popup() {
    var format = "https://www.bing.com/search?q=";
    var searches = ["weather", "sport", "news", "stocks", "movies", "music", "games", "maps", "travel", "restaurants", "nba", "world cup"];
    for (var i = 0; i < searches.length; i++) {
        var url = format + searches[i];
        chrome.tabs.create({
            url: url, active: false
        }, function (tab) {
            var idCurr = tab.id;
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
document.addEventListener('DOMContentLoaded', function () {
    var autoBool = document.getElementById("autoCheckbox");
    var button = document.getElementById("button");
    if (button) {
        button.addEventListener("click", function () {
            popup();
        });
    }
    if (autoBool) {
        // chrome.storage.sync.get("active", function (result) {
        //   if (result.active === true) {
        //     active = true;
        //   }
        // });
        autoBool.checked = (0, background_1.getActive)();
        autoBool.addEventListener("click", function () {
            active = autoBool.checked;
            chrome.storage.sync.set({ "active": active });
            //maybe comment this part out
            if (active) {
                checkLastOpened();
            }
        });
        //maybe comment this part out
        if (active) {
            checkLastOpened();
        }
    }
});
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
exports.checkLastOpened = checkLastOpened;
function waitAndClose(id) {
    console.log("waitAndClose");
    setTimeout(function () {
        chrome.tabs.remove(id);
    }, 1000);
}
