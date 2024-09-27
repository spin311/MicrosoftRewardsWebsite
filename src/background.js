var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === "install" || details.reason === "update") {
        chrome.storage.sync.set({
            "active": true,
            "level": 1,
            "timeout": 7
        });
        setTimeout(function () {
            chrome.tabs.create({ url: "https://spin311.github.io/MicrosoftRewardsWebsite/", active: true });
        }, 1000);
    }
});
// on startup, check if user has already clicked the checkbox
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
    var searchTimeout = 7;
    chrome.storage.sync.get(["level", "timeout"], function (results) {
        var _this = this;
        if (results.timeout)
            searchTimeout = parseInt(results.timeout);
        if (results.level > 1)
            level = 3;
        for (var xp = 0; xp < level; xp++) {
            var timeout = 1500 * xp;
            setTimeout(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, createTabs(format, format2, searchTimeout)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            }); }); }, timeout);
        }
    });
}
function delay(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
function createTabs(format, format2, searchTimeout) {
    return __awaiter(this, void 0, void 0, function () {
        var i, randomString, url;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < 10)) return [3 /*break*/, 4];
                    randomString = Math.random().toString(36).substring(2, 7);
                    url = format + randomString + format2;
                    openAndClose(url);
                    return [4 /*yield*/, delay(searchTimeout * 1000 - 500)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
}
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
        chrome.tabs.get(id, function (tab) {
            if (!chrome.runtime.lastError) {
                chrome.tabs.remove(id);
            }
        });
    }, 500);
}
