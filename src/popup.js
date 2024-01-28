//opens 10 tabs with bing searches
function popup() {
    chrome.runtime.sendMessage({ action: "popup" });
}
var active = true;
//wait for popup to load before adding event listeners
document.addEventListener('DOMContentLoaded', function () {
    var autoBool = document.getElementById("autoCheckbox");
    var button = document.getElementById("button");
    var selectLevel = document.getElementById("selectLevel");
    if (button) {
        button.addEventListener("click", function () {
            disableButton(button);
            popup();
        });
    }
    //check if user has already clicked the checkbox
    if (autoBool) {
        chrome.storage.sync.get("active", function (result) {
            if (result.active) {
                active = true;
                autoBool.checked = active;
            }
        });
        //listen for checkbox click
        autoBool.addEventListener("click", function () {
            active = autoBool.checked;
            chrome.storage.sync.set({ "active": active });
            if (active) {
                checkLastOpenedPopup();
            }
        });
    }
    if (selectLevel) {
        chrome.storage.sync.get("level", function (result) {
            selectLevel.value = result.level;
        });
        selectLevel.addEventListener("change", function () {
            chrome.storage.sync.set({ "level": selectLevel.value });
        });
    }
});
//disable button for 2 seconds
function disableButton(button) {
    button.disabled = true;
    button.classList.replace("btn-success", "btn-fail");
    setTimeout(function () {
        button.disabled = false;
        button.classList.replace("btn-fail", "btn-success");
    }, 2000);
}
//check if user has already opened tabs today
function checkLastOpenedPopup() {
    chrome.runtime.sendMessage({ action: "check" });
}
