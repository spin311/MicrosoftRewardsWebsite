//opens 10 tabs with bing searches
function popup() {
    chrome.runtime.sendMessage({ action: "popup" });
}
var active = true;
//wait for popup to load before adding event listeners
document.addEventListener('DOMContentLoaded', function () {
    var autoBool = document.getElementById("autoCheckbox");
    var button = document.getElementById("button");
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
                checkLastOpenedPopup(); //yer or no?
            }
        });
    }
});
//disable button for 2 seconds
function disableButton(button) {
    button.disabled = true;
    button.classList.replace("btn-primary", "btn-secondary");
    setTimeout(function () {
        button.disabled = false;
        button.classList.replace("btn-secondary", "btn-primary");
    }, 2000);
}
//check if user has already opened tabs today
function checkLastOpenedPopup() {
    chrome.runtime.sendMessage({ action: "check" });
}
