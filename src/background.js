"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActive = void 0;
var popup_1 = require("./popup");
var active = false;
chrome.runtime.onStartup.addListener(function () {
    console.log("startup");
    chrome.storage.sync.get("active", function (result) {
        if (result.active === true) {
            active = true;
        }
    });
});
chrome.runtime.onStartup.addListener(function () {
    console.log("startup");
    chrome.storage.sync.get("active", function (result) {
        if (result.active === true) {
            active = true;
        }
    });
    if (active) {
        (0, popup_1.checkLastOpened)();
    }
});
function getActive() {
    return active;
}
exports.getActive = getActive;
