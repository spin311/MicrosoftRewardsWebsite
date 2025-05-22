//opens 10 tabs with bing searches
function popup() {
    chrome.runtime.sendMessage({ action: "popup" });
}
var active = true;
var level = 1;
var timeout = 7;
//wait for popup to load before adding event listeners
document.addEventListener('DOMContentLoaded', function () {
    var autoBool = document.getElementById("autoCheckbox");
    var timeoutInput = document.getElementById("timeout");
    var button = document.getElementById("button");
    var selectLevel = document.getElementById("selectLevel");
    var donateText = document.getElementById('donateText');
    var donateImg = document.getElementById('donateImg');
    if (donateImg && donateText) {
        donateText.addEventListener('mouseover', function () {
            donateImg.style.visibility = 'visible';
        });
    }
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
    if (timeoutInput) {
        chrome.storage.sync.get("timeout", function (result) {
            if (result.timeout) {
                timeout = parseInt(result.timeout);
                timeoutInput.value = result.timeout;
            }
        });
        timeoutInput.addEventListener("change", function () {
            chrome.storage.sync.set({ "timeout": timeoutInput.value });
            timeout = parseInt(timeoutInput.value);
        });
    }
    if (selectLevel) {
        chrome.storage.sync.get("level", function (result) {
            if (result.level) {
                level = parseInt(result.level);
                selectLevel.value = result.level;
            }
        });
        selectLevel.addEventListener("change", function () {
            chrome.storage.sync.set({ "level": selectLevel.value });
            level = parseInt(selectLevel.value);
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
    }, 1000 + (level * 10 * timeout * 1000));
}
//check if user has already opened tabs today
function checkLastOpenedPopup() {
    chrome.runtime.sendMessage({ action: "check" });
}
