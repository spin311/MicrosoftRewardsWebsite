function popup() {
    var format = "https://www.bing.com/search?q=";
    var searches = ["weather", "sport", "news", "stocks", "movies", "music", "games", "maps", "travel", "restaurants"];
    for (var i = 0; i < searches.length; i++) {
        var url = format + searches[i];
        chrome.tabs.create({ url: url, active: false }, function (tab) {
            var idCurr = tab.id; // id of the tab that was just opened
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                if (tabId === idCurr && changeInfo.status === "complete") {
                    chrome.tabs.onUpdated.removeListener(listener);
                    waitAndClose(idCurr);
                }
            });
        });
    }
}
document.addEventListener('DOMContentLoaded', function () {
    // popup(); 
    var button = document.getElementById("button");
    if (button) {
        button.addEventListener("click", function () {
            popup();
        });
    }
    else {
    }
});
function waitAndClose(id) {
    console.log("waitAndClose");
    setTimeout(function () {
        chrome.tabs.remove(id);
    }, 1000);
}
