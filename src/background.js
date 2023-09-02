// on startup, check if user has already clicked the checkbox
chrome.runtime.onStartup.addListener(function () {
    console.log("startup");
    chrome.storage.sync.get("active", function (result) {
        if (result.active === true) {
            //send message to background.ts
            chrome.runtime.sendMessage({ active: true });
        }
    });
});
